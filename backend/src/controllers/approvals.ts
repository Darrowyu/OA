import { Request, Response } from 'express';
import { z } from 'zod';
import { ApplicationStatus, ApprovalAction, UserRole, Prisma } from '@prisma/client';
import {
  getNextStatus,
  shouldNotifyReadonly,
  getStatusText,
} from '../utils/application';
import { archiveApplication } from '../services/archive';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { ok, fail } from '../utils/response';
import { sendApprovalNotification } from '../services/notificationService';
import { escapeHtml } from '../utils/validation';

// 审批验证 Schema
const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { message: '无效的审批操作' }),
  comment: z.string().max(500, '评论最多500字符').optional().transform((val) => {
    if (!val) return val;
    // XSS 防护：转义 HTML 标签
    return escapeHtml(val);
  }),
});

const directorApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { message: '无效的审批操作' }),
  comment: z.string().max(500, '评论最多500字符').optional().transform((val) => {
    if (!val) return val;
    return escapeHtml(val);
  }),
  selectedManagerIds: z.array(z.string()).optional(),
  skipManager: z.boolean().optional().default(false),
});

// 审批级别配置
type ApprovalLevel = 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO';

interface ApprovalConfig {
  level: ApprovalLevel;
  requiredRole: UserRole;
  statusField: keyof Prisma.ApplicationWhereInput;
  statusValue: ApplicationStatus;
  approverIdField: string;
  txModel: {
    findFirst: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
}

// 根据级别获取审批配置
function getApprovalConfig(level: ApprovalLevel, tx: Prisma.TransactionClient): ApprovalConfig {
  const configs: Record<ApprovalLevel, Omit<ApprovalConfig, 'txModel'> & { txModelKey: keyof typeof tx }> = {
    FACTORY: {
      level: 'FACTORY',
      requiredRole: 'FACTORY_MANAGER',
      statusField: 'factoryManagerIds',
      statusValue: ApplicationStatus.PENDING_FACTORY,
      approverIdField: 'approverId',
      txModelKey: 'factoryApproval',
    },
    DIRECTOR: {
      level: 'DIRECTOR',
      requiredRole: 'DIRECTOR',
      statusField: 'status',
      statusValue: ApplicationStatus.PENDING_DIRECTOR,
      approverIdField: 'approverId',
      txModelKey: 'directorApproval',
    },
    MANAGER: {
      level: 'MANAGER',
      requiredRole: 'MANAGER',
      statusField: 'managerIds',
      statusValue: ApplicationStatus.PENDING_MANAGER,
      approverIdField: 'approverId',
      txModelKey: 'managerApproval',
    },
    CEO: {
      level: 'CEO',
      requiredRole: 'CEO',
      statusField: 'status',
      statusValue: ApplicationStatus.PENDING_CEO,
      approverIdField: 'approverId',
      txModelKey: 'ceoApproval',
    },
  };
  const config = configs[level];
  return {
    ...config,
    txModel: tx[config.txModelKey] as unknown as ApprovalConfig['txModel'],
  };
}

/**
 * 通用审批处理
 */
async function processApproval(
  level: ApprovalLevel,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { applicationId } = req.params;

    // Zod 验证
    const parseResult = approvalActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const { action, comment } = parseResult.data;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    await prisma.$transaction(async (tx) => {
      const config = getApprovalConfig(level, tx);

      // 角色权限检查
      if (user.role !== config.requiredRole) {
        throw new Error('权限不足');
      }

      // 状态检查
      const statusChecks: Record<ApprovalLevel, boolean> = {
        FACTORY: application.status === ApplicationStatus.PENDING_FACTORY,
        DIRECTOR: application.status === ApplicationStatus.PENDING_DIRECTOR,
        MANAGER: application.status === ApplicationStatus.PENDING_MANAGER,
        CEO: application.status === ApplicationStatus.PENDING_CEO,
      };

      if (!statusChecks[level]) {
        throw new Error('申请状态不正确');
      }

      // 特定级别检查
      if (level === 'FACTORY' && (!user.employeeId || !application.factoryManagerIds.includes(user.employeeId))) {
        throw new Error('您不是该申请的指定审批人');
      }
      if (level === 'MANAGER' && (!user.employeeId || !application.managerIds.includes(user.employeeId))) {
        throw new Error('您不是该申请的指定审批人');
      }

      const approvalAction = action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT;
      const newStatus = getNextStatus(application.status, action);

      // 更新或创建审批记录
      const existingApproval = await config.txModel.findFirst({
        where: { applicationId, approverId: user.id },
      });

      const approvalData = {
        action: approvalAction,
        comment: comment?.trim() || null,
        approvedAt: new Date(),
      };

      if (existingApproval) {
        await config.txModel.update({
          where: { id: (existingApproval as { id: string }).id },
          data: approvalData,
        });
      } else {
        await config.txModel.create({
          data: {
            applicationId,
            approverId: user.id,
            ...approvalData,
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
        const updateData: Prisma.ApplicationUpdateInput = { status: newStatus };

        // CEO审批通过时设置完成时间
        if (level === 'CEO') {
          updateData.completedAt = new Date();
        }

        await tx.application.update({
          where: { id: applicationId },
          data: updateData,
        });

        // 经理审批通过后创建CEO审批记录
        if (level === 'MANAGER') {
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
        }

        // 最终审批通过后处理归档
        if (level === 'CEO') {
          await handleReadonlyNotification(applicationId, application.amount ? Number(application.amount) : null);
          const archiveResult = await archiveApplication(applicationId, tx);
          if (!archiveResult.success) {
            throw new Error(`归档失败: ${archiveResult.error}`);
          }
        }
      }

      return { newStatus };
    });

    const newStatus = getNextStatus(application.status, action);

    // P0修复: 集成通知到业务流程 - 通知申请人审批结果
    try {
      const actionType = action === 'APPROVE' ? 'approve' : 'reject' as const;
      await sendApprovalNotification(
        application.applicantId,
        applicationId,
        application.applicationNo,
        application.title,
        actionType
      );
    } catch (notifyError) {
      logger.error('审批通知发送失败', { error: notifyError });
    }

    res.json(ok({
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: newStatus,
      statusText: getStatusText(newStatus),
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : '审批失败';
    logger.error(`${level}审批失败`, { error: msg });
    res.status(500).json(fail('INTERNAL_ERROR', msg));
  }
}

/**
 * 厂长审批
 * POST /api/approvals/factory/:applicationId
 */
export function factoryApprove(req: Request, res: Response): Promise<void> {
  return processApproval('FACTORY', req, res);
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
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    if (user.role !== 'DIRECTOR') {
      res.status(403).json(fail('FORBIDDEN', '管理员没有审批权限'));
      return;
    }

    const { applicationId } = req.params;

    // Zod 验证
    const parseResult = directorApprovalSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const { action, comment, selectedManagerIds, skipManager } = parseResult.data;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    if (application.status !== ApplicationStatus.PENDING_DIRECTOR) {
      res.status(400).json(fail('INVALID_STATUS', '申请状态不正确'));
      return;
    }

    // 如果选择通过且未跳过经理，必须选择经理
    if (action === 'APPROVE' && !skipManager && (!selectedManagerIds || selectedManagerIds.length === 0)) {
      res.status(400).json(fail('MISSING_MANAGERS', '请选择审批经理'));
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

        // 如果不跳过经理，批量创建经理审批记录（避免N+1）
        if (!skipManager && selectedManagerIds && selectedManagerIds.length > 0) {
          const managers = await tx.user.findMany({
            where: { employeeId: { in: selectedManagerIds } }
          });
          await tx.managerApproval.createMany({
            data: managers.map(manager => ({
              applicationId,
              approverId: manager.id,
              action: ApprovalAction.PENDING,
            })),
          });
        }
      }
    });

    res.json(ok({
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: newStatus,
      statusText: getStatusText(newStatus),
      skipManager,
    }));
  } catch (error) {
    logger.error('总监审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '审批失败'));
  }
}

/**
 * 经理审批
 * POST /api/approvals/manager/:applicationId
 */
export function managerApprove(req: Request, res: Response): Promise<void> {
  return processApproval('MANAGER', req, res);
}

/**
 * CEO审批
 * POST /api/approvals/ceo/:applicationId
 */
export function ceoApprove(req: Request, res: Response): Promise<void> {
  return processApproval('CEO', req, res);
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

    // 批量创建提醒记录（避免N+1）
    if (readonlyUsers.length > 0) {
      await prisma.reminderLog.createMany({
        data: readonlyUsers.map(user => ({
          applicationId,
          recipientId: user.id,
          reminderType: 'SYSTEM',
          reminderCount: 1,
        })),
      });
    }

    logger.info(`已通知 ${readonlyUsers.length} 位只读用户关于大额申请`, { applicationId });
  } catch (error) {
    logger.error('通知只读用户失败', { error: error instanceof Error ? error.message : '未知错误', applicationId });
  }
}

// 审批记录类型
interface ApprovalWithApprover {
  approver: { id: string; name: string; employeeId: string; role: UserRole };
  createdAt: Date;
  [key: string]: unknown;
}

/**
 * 获取审批历史
 * GET /api/approvals/:applicationId/history
 */
export async function getApprovalHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
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
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
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
      res.status(403).json(fail('FORBIDDEN', '无权查看审批历史'));
      return;
    }

    // 合并所有审批记录并按时间排序
    const allApprovals = [
      ...application.factoryApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'FACTORY' as const })),
      ...application.directorApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'DIRECTOR' as const })),
      ...application.managerApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'MANAGER' as const })),
      ...application.ceoApprovals.map((a: ApprovalWithApprover) => ({ ...a, level: 'CEO' as const })),
    ].sort((a: ApprovalWithApprover, b: ApprovalWithApprover) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(ok(allApprovals));
  } catch (error) {
    logger.error('获取审批历史失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取审批历史失败'));
  }
}

// 撤回审批配置
const approvalLevelConfig: Record<string, {
  role: UserRole;
  modelName: string;
  pendingStatus: ApplicationStatus;
  // 定义后续需要清理的审批级别
  subsequentLevels?: string[];
}> = {
  FACTORY: {
    role: 'FACTORY_MANAGER',
    modelName: 'factoryApproval',
    pendingStatus: ApplicationStatus.PENDING_FACTORY,
    subsequentLevels: ['directorApproval', 'managerApproval', 'ceoApproval'],
  },
  DIRECTOR: {
    role: 'DIRECTOR',
    modelName: 'directorApproval',
    pendingStatus: ApplicationStatus.PENDING_DIRECTOR,
    subsequentLevels: ['managerApproval', 'ceoApproval'],
  },
  MANAGER: {
    role: 'MANAGER',
    modelName: 'managerApproval',
    pendingStatus: ApplicationStatus.PENDING_MANAGER,
    subsequentLevels: ['ceoApproval'],
  },
  CEO: {
    role: 'CEO',
    modelName: 'ceoApproval',
    pendingStatus: ApplicationStatus.PENDING_CEO,
  },
};

// 允许撤回的状态
const allowedWithdrawStatuses: Record<string, ApplicationStatus[]> = {
  FACTORY: [ApplicationStatus.PENDING_DIRECTOR, ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
  DIRECTOR: [ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
  MANAGER: [ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
  CEO: [ApplicationStatus.APPROVED],
};

/**
 * 撤回审批
 * POST /api/approvals/:applicationId/withdraw
 * 允许审批人撤回自己的审批
 */
export async function withdrawApproval(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { applicationId } = req.params;
    const { level } = req.body;

    if (!level || !approvalLevelConfig[level]) {
      res.status(400).json(fail('INVALID_LEVEL', '无效的审批级别'));
      return;
    }

    const config = approvalLevelConfig[level];

    if (user.role !== config.role) {
      res.status(403).json(fail('FORBIDDEN', `无权撤回${level === 'FACTORY' ? '厂长' : level === 'DIRECTOR' ? '总监' : level === 'MANAGER' ? '经理' : 'CEO'}审批`));
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        [config.modelName]: { where: { approverId: user.id } },
      } as Prisma.ApplicationInclude,
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    // 检查是否有审批记录
    const approvals = (application as unknown as Record<string, unknown[]>)[config.modelName] || [];
    if (approvals.length === 0) {
      res.status(400).json(fail('NO_APPROVAL', '您没有该申请的审批记录，无法撤回'));
      return;
    }

    // 检查申请状态是否允许撤回
    if (!allowedWithdrawStatuses[level]?.includes(application.status)) {
      res.status(400).json(fail('INVALID_STATUS', '当前申请状态不允许撤回审批'));
      return;
    }

    // 撤回审批
    await prisma.$transaction(async (tx) => {
      // 删除当前级别的审批记录
      await ((tx as unknown) as Record<string, { deleteMany: (args: unknown) => Promise<unknown> }>)[config.modelName].deleteMany({
        where: { applicationId, approverId: user.id },
      });

      // 清理后续级别的所有审批记录，确保数据一致性
      if (config.subsequentLevels && config.subsequentLevels.length > 0) {
        for (const level of config.subsequentLevels) {
          await ((tx as unknown) as Record<string, { deleteMany: (args: unknown) => Promise<unknown> }>)[level].deleteMany({
            where: { applicationId },
          });
        }
      }

      // 回退申请状态
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: config.pendingStatus,
          completedAt: null,
        },
      });
    });

    res.json(ok({
      message: '审批已撤回',
      status: config.pendingStatus,
    }));
  } catch (error) {
    logger.error('撤回审批失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '撤回审批失败'));
  }
}
