import { Request, Response } from 'express';
import { PrismaClient, ApplicationStatus, ApprovalAction } from '@prisma/client';
import {
  getNextStatus,
  isSpecialManager,
  shouldNotifyReadonly,
  getStatusText,
} from '../utils/application';
import { archiveApplication } from '../services/archive';

const prisma = new PrismaClient();

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
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: newStatus,
      statusText: getStatusText(newStatus),
    });
  } catch (error) {
    console.error('厂长审批失败:', error);
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
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: newStatus,
      statusText: getStatusText(newStatus),
      skipManager,
    });
  } catch (error) {
    console.error('总监审批失败:', error);
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
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: newStatus,
      statusText: getStatusText(newStatus),
      isSpecialManager: isSpecial,
    });
  } catch (error) {
    console.error('经理审批失败:', error);
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
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: newStatus,
      statusText: getStatusText(newStatus),
    });
  } catch (error) {
    console.error('CEO审批失败:', error);
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

    console.log(`已通知 ${readonlyUsers.length} 位只读用户关于大额申请 ${applicationId}`);
  } catch (error) {
    console.error('通知只读用户失败:', error);
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

    // 权限检查
    const canView =
      application.applicantId === user.id ||
      user.role === 'ADMIN' ||
      application.factoryApprovals.some((a: any) => a.approverId === user.id) ||
      application.directorApprovals.some((a: any) => a.approverId === user.id) ||
      application.managerApprovals.some((a: any) => a.approverId === user.id) ||
      application.ceoApprovals.some((a: any) => a.approverId === user.id);

    if (!canView) {
      res.status(403).json({ error: '无权查看审批历史' });
      return;
    }

    // 合并所有审批记录并按时间排序
    const allApprovals = [
      ...application.factoryApprovals.map((a: any) => ({ ...a, level: 'FACTORY' })),
      ...application.directorApprovals.map((a: any) => ({ ...a, level: 'DIRECTOR' })),
      ...application.managerApprovals.map((a: any) => ({ ...a, level: 'MANAGER' })),
      ...application.ceoApprovals.map((a: any) => ({ ...a, level: 'CEO' })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      data: allApprovals,
    });
  } catch (error) {
    console.error('获取审批历史失败:', error);
    res.status(500).json({ error: '获取审批历史失败' });
  }
}
