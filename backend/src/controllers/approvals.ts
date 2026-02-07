import { Request, Response } from 'express';
import { ApplicationStatus, ApprovalAction, UserRole } from '@prisma/client';
import {
  getNextStatus,
  isSpecialManager,
  shouldNotifyReadonly,
  getStatusText,
} from '../utils/application';
import { archiveApplication } from '../services/archive';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

/**
 * 厂长审批
 * POST /api/approvals/factory/:applicationId
 */
export async function factoryApprove(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    if (user.role !== 'FACTORY_MANAGER') {
      res.status(403).json({ error: '管理员没有审批权限' });
      return;
    }

    const { applicationId } = req.params;
    const { action, comment } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: '无效的审批操作' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { factoryApprovals: true },
    });

    if (!application) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    if (application.status !== ApplicationStatus.PENDING_FACTORY) {
      res.status(400).json({ error: '申请状态不正确' });
      return;
    }

    // 检查是否为指定厂长
    if (!user.employeeId || !application.factoryManagerIds.includes(user.employeeId)) {
      res.status(403).json({ error: '您不是该申请的指定审批人' });
      return;
    }

    const approvalAction = action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT;
    const newStatus = getNextStatus(application.status, action);

    await prisma.$transaction(async (tx) => {
      // 更新或创建审批记录
      const existingApproval = await tx.factoryApproval.findFirst({
        where: { applicationId, approverId: user.id },
      });

      if (existingApproval) {
        await tx.factoryApproval.update({
          where: { id: existingApproval.id },
          data: {
            action: approvalAction,
            comment: comment?.trim() || null,
            approvedAt: new Date(),
          },
        });
      } else {
        await tx.factoryApproval.create({
          data: {
            applicationId,
            approverId: user.id,
            action: approvalAction,
            comment: comment?.trim() || null,
            approvedAt: new Date(),
          },
        });
      }

      // 更新申请状态
      if (action === 'REJECT') {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectReason: comment?.trim() || null,
          },
        });
      } else {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: newStatus },
        });
      }
    });

    res.json({
      success: true,
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      data: {
        status: newStatus,
        statusText: getStatusText(newStatus),
      },
    });
  } catch (error) {
    logger.error('厂长审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '审批失败' });
  }
}

/**
 * 总监审批
 * POST /api/approvals/director/:applicationId
 * 支持skipManager参数跳过经理审批
 */
export async function directorApprove(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    if (user.role !== 'DIRECTOR') {
      res.status(403).json({ error: '管理员没有审批权限' });
      return;
    }

    const { applicationId } = req.params;
    const { action, comment, selectedManagerIds, skipManager = false } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: '无效的审批操作' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    if (application.status !== ApplicationStatus.PENDING_DIRECTOR) {
      res.status(400).json({ error: '申请状态不正确' });
      return;
    }

    // 如果选择通过且未跳过经理，必须选择经理
    if (action === 'APPROVE' && !skipManager && (!selectedManagerIds || selectedManagerIds.length === 0)) {
      res.status(400).json({ error: '请选择审批经理' });
      return;
    }

    const approvalAction = action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT;
    const newStatus = getNextStatus(application.status, action, { skipManager });

    await prisma.$transaction(async (tx) => {
      // 创建总监审批记录
      await tx.directorApproval.create({
        data: {
          applicationId,
          approverId: user.id,
          action: approvalAction,
          comment: comment?.trim() || null,
          selectedManagerIds: selectedManagerIds || [],
          skipManager: skipManager,
          approvedAt: new Date(),
        },
      });

      if (action === 'REJECT') {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectReason: comment?.trim() || null,
          },
        });
      } else {
        // 更新申请状态和经理列表
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            managerIds: skipManager ? [] : selectedManagerIds,
          },
        });

        // 如果不跳过经理，创建经理审批记录
        if (!skipManager && selectedManagerIds) {
          for (const managerId of selectedManagerIds) {
            const manager = await tx.user.findUnique({ where: { employeeId: managerId } });
            if (manager) {
              await tx.managerApproval.create({
                data: {
                  applicationId,
                  approverId: manager.id,
                  action: ApprovalAction.PENDING,
                },
              });
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      data: {
        status: newStatus,
        statusText: getStatusText(newStatus),
        skipManager,
      },
    });
  } catch (error) {
    logger.error('总监审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '审批失败' });
  }
}

/**
 * 经理审批
 * POST /api/approvals/manager/:applicationId
 * E10002特殊规则: 审批后直接通过，跳过CEO
 */
export async function managerApprove(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    if (user.role !== 'MANAGER') {
      res.status(403).json({ error: '管理员没有审批权限' });
      return;
    }

    const { applicationId } = req.params;
    const { action, comment } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: '无效的审批操作' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    if (application.status !== ApplicationStatus.PENDING_MANAGER) {
      res.status(400).json({ error: '申请状态不正确' });
      return;
    }

    // 检查是否为指定经理
    if (!user.employeeId || !application.managerIds.includes(user.employeeId)) {
      res.status(403).json({ error: '您不是该申请的指定审批人' });
      return;
    }

    // 检查是否为特殊经理(E10002)
    const isSpecial = isSpecialManager(user.employeeId || '');
    const approvalAction = action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT;
    const newStatus = getNextStatus(application.status, action, { isSpecialManager: isSpecial });

    await prisma.$transaction(async (tx) => {
      // 更新或创建审批记录
      const existingApproval = await tx.managerApproval.findFirst({
        where: { applicationId, approverId: user.id },
      });

      if (existingApproval) {
        await tx.managerApproval.update({
          where: { id: existingApproval.id },
          data: {
            action: approvalAction,
            comment: comment?.trim() || null,
            approvedAt: new Date(),
          },
        });
      } else {
        await tx.managerApproval.create({
          data: {
            applicationId,
            approverId: user.id,
            action: approvalAction,
            comment: comment?.trim() || null,
            approvedAt: new Date(),
          },
        });
      }

      if (action === 'REJECT') {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectReason: comment?.trim() || null,
          },
        });
      } else {
        // 更新申请状态
        await tx.application.update({
          where: { id: applicationId },
          data: { status: newStatus },
        });

        // 如果不是特殊经理，创建CEO审批记录
        if (!isSpecial) {
          const ceo = await tx.user.findFirst({ where: { role: 'CEO' } });
          if (ceo) {
            await tx.ceoApproval.create({
              data: {
                applicationId,
                approverId: ceo.id,
                action: ApprovalAction.PENDING,
              },
            });
          }
        } else {
          // 特殊经理审批通过，检查是否需要通知只读用户
          await handleReadonlyNotification(applicationId, application.amount ? Number(application.amount) : null);

          // 归档申请数据
          const archiveResult = await archiveApplication(applicationId, tx);
          if (!archiveResult.success) {
            throw new Error(`归档失败: ${archiveResult.error}`);
          }
        }
      }
    });

    res.json({
      success: true,
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      data: {
        status: newStatus,
        statusText: getStatusText(newStatus),
        isSpecialManager: isSpecial,
      },
    });
  } catch (error) {
    logger.error('经理审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '审批失败' });
  }
}

/**
 * CEO审批
 * POST /api/approvals/ceo/:applicationId
 */
export async function ceoApprove(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    if (user.role !== 'CEO') {
      res.status(403).json({ error: '管理员没有审批权限' });
      return;
    }

    const { applicationId } = req.params;
    const { action, comment } = req.body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ error: '无效的审批操作' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    if (application.status !== ApplicationStatus.PENDING_CEO) {
      res.status(400).json({ error: '申请状态不正确' });
      return;
    }

    const approvalAction = action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT;
    const newStatus = getNextStatus(application.status, action);

    await prisma.$transaction(async (tx) => {
      // 更新或创建审批记录
      const existingApproval = await tx.ceoApproval.findFirst({
        where: { applicationId, approverId: user.id },
      });

      if (existingApproval) {
        await tx.ceoApproval.update({
          where: { id: existingApproval.id },
          data: {
            action: approvalAction,
            comment: comment?.trim() || null,
            approvedAt: new Date(),
          },
        });
      } else {
        await tx.ceoApproval.create({
          data: {
            applicationId,
            approverId: user.id,
            action: approvalAction,
            comment: comment?.trim() || null,
            approvedAt: new Date(),
          },
        });
      }

      if (action === 'REJECT') {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectReason: comment?.trim() || null,
          },
        });
      } else {
        // 审批通过
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            completedAt: new Date(),
          },
        });

        // 检查是否需要通知只读用户
        await handleReadonlyNotification(applicationId, application.amount ? Number(application.amount) : null);

        // 归档申请数据
        const archiveResult = await archiveApplication(applicationId, tx);
        if (!archiveResult.success) {
          throw new Error(`归档失败: ${archiveResult.error}`);
        }
      }
    });

    res.json({
      success: true,
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      data: {
        status: newStatus,
        statusText: getStatusText(newStatus),
      },
    });
  } catch (error) {
    logger.error('CEO审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '审批失败' });
  }
}

/**
 * 处理只读用户通知
 * 规则: 金额 > 100000 的审批通过后通知只读用户
 */
async function handleReadonlyNotification(applicationId: string, amount: number | null): Promise<void> {
  if (!shouldNotifyReadonly(amount)) return;

  try {
    const readonlyUsers = await prisma.user.findMany({
      where: { role: 'READONLY', isActive: true },
    });

    for (const user of readonlyUsers) {
      await prisma.reminderLog.create({
        data: {
          applicationId,
          recipientId: user.id,
          reminderType: 'SYSTEM',
          reminderCount: 1,
        },
      });
    }

    logger.info(`已通知 ${readonlyUsers.length} 位只读用户关于大额申请`, { applicationId });
  } catch (error) {
    logger.error('通知只读用户失败', { error: error instanceof Error ? error.message : '未知错误', applicationId });
  }
}

/**
 * 获取审批历史
 * GET /api/approvals/:applicationId/history
 */
export async function getApprovalHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { applicationId } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        factoryApprovals: {
          include: { approver: { select: { id: true, name: true, employeeId: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        directorApprovals: {
          include: { approver: { select: { id: true, name: true, employeeId: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        managerApprovals: {
          include: { approver: { select: { id: true, name: true, employeeId: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        ceoApprovals: {
          include: { approver: { select: { id: true, name: true, employeeId: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    // 审批记录类型
    interface ApprovalWithApprover {
      approver: { id: string; name: string; employeeId: string; role: UserRole };
      createdAt: Date;
      [key: string]: unknown;
    }

    // 权限检查
    const canView =
      application.applicantId === user.id ||
      user.role === 'ADMIN' ||
      application.factoryApprovals.some((a: ApprovalWithApprover) => a.approver.id === user.id) ||
      application.directorApprovals.some((a: ApprovalWithApprover) => a.approver.id === user.id) ||
      application.managerApprovals.some((a: ApprovalWithApprover) => a.approver.id === user.id) ||
      application.ceoApprovals.some((a: ApprovalWithApprover) => a.approver.id === user.id);

    if (!canView) {
      res.status(403).json({ error: '无权查看审批历史' });
      return;
    }

    // 合并所有审批记录并按时间排序
    const allApprovals = [
      ...application.factoryApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'FACTORY' as const })),
      ...application.directorApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'DIRECTOR' as const })),
      ...application.managerApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'MANAGER' as const })),
      ...application.ceoApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'CEO' as const })),
    ].sort((a: ApprovalWithApprover, b: ApprovalWithApprover) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: allApprovals,
    });
  } catch (error) {
    logger.error('获取审批历史失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取审批历史失败' });
  }
}

/**
 * 撤回审批
 * POST /api/approvals/:applicationId/withdraw
 * 允许审批人撤回自己的审批
 */
export async function withdrawApproval(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { applicationId } = req.params;
    const { level } = req.body; // 'FACTORY', 'DIRECTOR', 'MANAGER', 'CEO'

    if (!level || !['FACTORY', 'DIRECTOR', 'MANAGER', 'CEO'].includes(level)) {
      res.status(400).json({ error: '无效的审批级别' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        factoryApprovals: { where: { approverId: user.id } },
        directorApprovals: { where: { approverId: user.id } },
        managerApprovals: { where: { approverId: user.id } },
        ceoApprovals: { where: { approverId: user.id } },
      },
    });

    if (!application) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    // 检查用户是否有该级别的审批记录
    let hasApproved = false;
    let approvalRecord: any = null;

    switch (level) {
      case 'FACTORY':
        if (user.role !== 'FACTORY_MANAGER') {
          res.status(403).json({ error: '无权撤回厂长审批' });
          return;
        }
        approvalRecord = application.factoryApprovals[0];
        hasApproved = !!approvalRecord;
        break;
      case 'DIRECTOR':
        if (user.role !== 'DIRECTOR') {
          res.status(403).json({ error: '无权撤回总监审批' });
          return;
        }
        approvalRecord = application.directorApprovals[0];
        hasApproved = !!approvalRecord;
        break;
      case 'MANAGER':
        if (user.role !== 'MANAGER') {
          res.status(403).json({ error: '无权撤回经理审批' });
          return;
        }
        approvalRecord = application.managerApprovals[0];
        hasApproved = !!approvalRecord;
        break;
      case 'CEO':
        if (user.role !== 'CEO') {
          res.status(403).json({ error: '无权撤回CEO审批' });
          return;
        }
        approvalRecord = application.ceoApprovals[0];
        hasApproved = !!approvalRecord;
        break;
    }

    if (!hasApproved) {
      res.status(400).json({ error: '您没有该申请的审批记录，无法撤回' });
      return;
    }

    // 检查申请状态是否允许撤回
    // 只允许撤回已通过或待下一级审批的申请
    const currentStatus = application.status;
    const allowedStatuses: Record<string, ApplicationStatus[]> = {
      'FACTORY': [ApplicationStatus.PENDING_DIRECTOR, ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
      'DIRECTOR': [ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
      'MANAGER': [ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
      'CEO': [ApplicationStatus.APPROVED],
    };

    if (!allowedStatuses[level]?.includes(currentStatus)) {
      res.status(400).json({ error: '当前申请状态不允许撤回审批' });
      return;
    }

    // 撤回审批
    await prisma.$transaction(async (tx) => {
      // 删除审批记录
      switch (level) {
        case 'FACTORY':
          await tx.factoryApproval.deleteMany({
            where: { applicationId, approverId: user.id },
          });
          break;
        case 'DIRECTOR':
          await tx.directorApproval.deleteMany({
            where: { applicationId, approverId: user.id },
          });
          break;
        case 'MANAGER':
          await tx.managerApproval.deleteMany({
            where: { applicationId, approverId: user.id },
          });
          break;
        case 'CEO':
          await tx.ceoApproval.deleteMany({
            where: { applicationId, approverId: user.id },
          });
          break;
      }

      // 回退申请状态
      let newStatus: ApplicationStatus;
      switch (level) {
        case 'FACTORY':
          newStatus = ApplicationStatus.PENDING_FACTORY;
          break;
        case 'DIRECTOR':
          newStatus = ApplicationStatus.PENDING_DIRECTOR;
          break;
        case 'MANAGER':
          newStatus = ApplicationStatus.PENDING_MANAGER;
          break;
        case 'CEO':
          newStatus = ApplicationStatus.PENDING_CEO;
          break;
        default:
          newStatus = currentStatus;
      }

      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          completedAt: null, // 清除完成时间
        },
      });
    });

    res.json({
      success: true,
      message: '审批已撤回',
      data: {
        status: level === 'FACTORY' ? ApplicationStatus.PENDING_FACTORY :
                level === 'DIRECTOR' ? ApplicationStatus.PENDING_DIRECTOR :
                level === 'MANAGER' ? ApplicationStatus.PENDING_MANAGER :
                ApplicationStatus.PENDING_CEO,
      },
    });
  } catch (error) {
    logger.error('撤回审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '撤回审批失败' });
  }
}
