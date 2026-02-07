import { Request, Response } from 'express';
import { PrismaClient, ApplicationStatus, ApprovalAction, UserRole } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { sendEmailNotification, generateEmailTemplate } from '../services/email';
import { config } from '../config';

const prisma = new PrismaClient();

// 归档目录
const ARCHIVE_DIR = path.join(process.cwd(), 'archive');

// 确保归档目录存在
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

/**
 * 撤销审批
 * POST /api/approvals/:id/withdraw
 */
export async function withdrawApproval(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return;
    }

    // 只有总监可以撤销审批
    if (user.role !== UserRole.DIRECTOR && user.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '只有总监可以撤回审批' } });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        directorApprovals: true,
        managerApprovals: true,
        ceoApprovals: true,
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '申请不存在' } });
      return;
    }

    // 验证申请状态：已通过，且是总监直接通过的（未经过经理和CEO）
    if (application.status !== ApplicationStatus.APPROVED) {
      res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '只能撤回已通过的申请' } });
      return;
    }

    // 检查是否有经理或CEO审批记录
    const hasManagerApproval = application.managerApprovals.some(a => a.action === ApprovalAction.APPROVE);
    const hasCeoApproval = application.ceoApprovals.some(a => a.action === ApprovalAction.APPROVE);

    if (hasManagerApproval || hasCeoApproval) {
      res.status(400).json({
        success: false,
        error: { code: 'CANNOT_WITHDRAW', message: '只能撤回由总监直接通过且未经过经理和CEO审批的申请' },
      });
      return;
    }

    // 更新申请状态
    await prisma.$transaction(async (tx) => {
      // 重置申请状态为待总监审批
      await tx.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.PENDING_DIRECTOR,
          completedAt: null,
        },
      });

      // 重置总监审批状态
      await tx.directorApproval.updateMany({
        where: { applicationId: id },
        data: {
          action: ApprovalAction.PENDING,
          comment: comment || null,
          approvedAt: null,
        },
      });
    });

    // 发送邮件通知申请人
    if (application.applicant.email) {
      const emailContent = generateEmailTemplate({
        title: '您的申请被总监撤回进行重新审批',
        applicant: application.applicantName,
        applicationNo: application.applicationNo,
        department: application.applicantDept,
        date: application.createdAt.toLocaleDateString('zh-CN'),
        content: application.title,
        priority: application.priority,
        status: '待总监审批',
        actionText: '查看详情',
        actionUrl: `${config.server.url}/applications/${application.id}`,
        additionalInfo: '总监已撤回此前的审批决定，申请将重新进入总监审批环节。',
      });

      sendEmailNotification(
        application.applicant.email,
        `您的申请被总监撤回重审 - ${application.applicationNo}`,
        emailContent,
        application.applicationNo
      );
    }

    res.json({ success: true, message: '审批撤回成功' });
  } catch (error) {
    console.error('撤销审批失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '撤销审批失败' } });
  }
}

/**
 * 归档旧申请
 * POST /api/admin/archive
 */
export async function archiveOldApplications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } });
      return;
    }

    const { months = 3 } = req.body;

    // 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    // 查找需要归档的申请（已完成的旧申请）
    const applicationsToArchive = await prisma.application.findMany({
      where: {
        status: { in: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] },
        completedAt: { lt: cutoffDate },
      },
      include: {
        applicant: { select: { id: true, name: true } },
        factoryApprovals: { include: { approver: { select: { name: true } } } },
        directorApprovals: { include: { approver: { select: { name: true } } } },
        managerApprovals: { include: { approver: { select: { name: true } } } },
        ceoApprovals: { include: { approver: { select: { name: true } } } },
        attachments: true,
      },
    });

    if (applicationsToArchive.length === 0) {
      res.json({ success: true, message: '没有需要归档的申请', data: { archived: 0 } });
      return;
    }

    // 归档文件名
    const archiveFileName = `archive_${new Date().toISOString().split('T')[0]}.json`;
    const archivePath = path.join(ARCHIVE_DIR, archiveFileName);

    // 准备归档数据
    const archiveData = {
      archivedAt: new Date().toISOString(),
      archivedBy: user.username,
      cutoffDate: cutoffDate.toISOString(),
      applications: applicationsToArchive,
    };

    // 写入归档文件
    fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));

    // 更新申请状态为已归档
    const archivedIds = applicationsToArchive.map(app => app.id);
    await prisma.application.updateMany({
      where: { id: { in: archivedIds } },
      data: { status: ApplicationStatus.ARCHIVED },
    });

    console.log(`归档了 ${applicationsToArchive.length} 个申请到 ${archiveFileName}`);

    res.json({
      success: true,
      message: `成功归档 ${applicationsToArchive.length} 个申请`,
      data: {
        archived: applicationsToArchive.length,
        fileName: archiveFileName,
      },
    });
  } catch (error) {
    console.error('归档申请失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '归档申请失败' } });
  }
}

/**
 * 获取归档统计
 * GET /api/admin/archive-stats
 */
export async function getArchiveStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } });
      return;
    }

    // 读取归档目录中的所有文件
    const archiveFiles = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json'));

    let totalArchived = 0;
    const archives = archiveFiles.map(file => {
      const filePath = path.join(ARCHIVE_DIR, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const count = data.applications?.length || 0;
      totalArchived += count;

      return {
        fileName: file,
        archivedAt: data.archivedAt,
        archivedBy: data.archivedBy,
        count,
        size: stats.size,
      };
    });

    res.json({
      success: true,
      data: {
        totalFiles: archiveFiles.length,
        totalArchived,
        archives: archives.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()),
      },
    });
  } catch (error) {
    console.error('获取归档统计失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取归档统计失败' } });
  }
}

/**
 * 恢复申请
 * POST /api/admin/recover
 */
export async function recoverApplications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } });
      return;
    }

    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: '请指定要恢复的申请ID' } });
      return;
    }

    // 恢复申请状态
    const result = await prisma.application.updateMany({
      where: {
        id: { in: applicationIds },
        status: ApplicationStatus.ARCHIVED,
      },
      data: { status: ApplicationStatus.APPROVED },
    });

    console.log(`恢复了 ${result.count} 个申请`);

    res.json({
      success: true,
      message: `成功恢复 ${result.count} 个申请`,
      data: { recovered: result.count },
    });
  } catch (error) {
    console.error('恢复申请失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '恢复申请失败' } });
  }
}

/**
 * 数据完整性检查
 * GET /api/admin/data-integrity
 */
export async function checkDataIntegrity(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } });
      return;
    }

    const issues: string[] = [];

    // 检查1: 查找没有申请人的申请
    const orphanedApplications = await prisma.application.findMany({
      where: { applicantId: '' },
    });
    if (orphanedApplications.length > 0) {
      issues.push(`发现 ${orphanedApplications.length} 个没有申请人的申请`);
    }

    // 检查2: 查找没有附件记录的孤立文件
    const attachments = await prisma.attachment.findMany();
    const orphanedFiles = attachments.filter(att => {
      return !fs.existsSync(att.path);
    });
    if (orphanedFiles.length > 0) {
      issues.push(`发现 ${orphanedFiles.length} 个丢失物理文件的附件记录`);
    }

    // 检查3: 查找状态不一致的申请
    const inconsistentApps = await prisma.application.findMany({
      where: {
        status: ApplicationStatus.APPROVED,
        completedAt: null,
      },
    });
    if (inconsistentApps.length > 0) {
      issues.push(`发现 ${inconsistentApps.length} 个状态为已通过但缺少完成时间的申请`);
    }

    // 统计信息
    const stats = {
      totalUsers: await prisma.user.count(),
      totalApplications: await prisma.application.count(),
      pendingApplications: await prisma.application.count({
        where: {
          status: {
            in: [
              ApplicationStatus.PENDING_FACTORY,
              ApplicationStatus.PENDING_DIRECTOR,
              ApplicationStatus.PENDING_MANAGER,
              ApplicationStatus.PENDING_CEO,
            ],
          },
        },
      }),
      approvedApplications: await prisma.application.count({
        where: { status: ApplicationStatus.APPROVED },
      }),
      rejectedApplications: await prisma.application.count({
        where: { status: ApplicationStatus.REJECTED },
      }),
      archivedApplications: await prisma.application.count({
        where: { status: ApplicationStatus.ARCHIVED },
      }),
      totalAttachments: await prisma.attachment.count(),
    };

    res.json({
      success: true,
      data: {
        healthy: issues.length === 0,
        issues,
        stats,
      },
    });
  } catch (error) {
    console.error('数据完整性检查失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '数据完整性检查失败' } });
  }
}
