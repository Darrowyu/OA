import { Request, Response } from 'express';
import { z } from 'zod';
import { ApplicationStatus, ApprovalAction, UserRole, Prisma } from '@prisma/client';
import {
  getNextStatus,
  getStatusText,
  checkAllFactoryManagersApproved,
  checkAllManagersApproved,
} from '../utils/application';
import { archiveApplication } from '../services/archive';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { ok, fail } from '../utils/response';
import {
  sendApprovalNotification,
  notifyHighAmountApproval,
  sendApprovalTaskEmails,
  sendApplicationResultEmail,
  type ApplicationEmailInfo,
  type ApprovalTaskType,
} from '../services/notificationService';

import { getCEOApprovalThreshold, requiresCEOApproval } from '../services/approvalConfig.service';

// ============================================
// 审批人查询缓存
// ============================================

interface CachedApprovers {
  users: Array<{ email: string; name: string; id: string }>;
  timestamp: number;
}

const approverCache = new Map<string, CachedApprovers>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/** 获取缓存的审批人列表 */
async function getCachedApproversByRole(
  role: 'DIRECTOR' | 'CEO'
): Promise<Array<{ email: string; name: string; id: string }>> {
  const cached = approverCache.get(role);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.users;
  }

  const users = await prisma.user.findMany({
    where: { role },
    select: { id: true, email: true, name: true },
  });

  const validUsers = users
    .filter((u): u is typeof u & { email: string } => Boolean(u.email))
    .map((u) => ({ id: u.id, email: u.email!, name: u.name || '' }));

  approverCache.set(role, { users: validUsers, timestamp: Date.now() });

  return validUsers;
}

/** 清除审批人缓存（当用户变更时调用） */
export function clearApproverCache(role?: 'DIRECTOR' | 'CEO'): void {
  if (role) {
    approverCache.delete(role);
  } else {
    approverCache.clear();
  }
}

// ============================================
// 申请人通知辅助函数
// ============================================

/** 通知申请人审批结果 */
async function notifyApplicantOfResult(
  applicantId: string | undefined,
  application: { id: string; applicationNo: string; title: string },
  action: 'APPROVE' | 'REJECT',
  comment: string | undefined,
  context: string
): Promise<void> {
  if (!applicantId) return;

  try {
    const applicant = await prisma.user.findUnique({
      where: { id: applicantId },
      select: { email: true },
    });

    if (applicant?.email) {
      await sendApplicationResultEmail(applicant.email, applicantId, {
        id: application.id,
        applicationNo: application.applicationNo,
        title: application.title,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        completedAt: action === 'APPROVE' ? new Date() : null,
        rejectedAt: action === 'REJECT' ? new Date() : null,
        rejectReason: comment?.trim() || null,
      });
    }
  } catch (error) {
    logger.error(`${context}邮件通知失败`, { error: String(error) });
  }
}

// ============================================
// 邮件通知辅助函数
// ============================================

/** 通知指定角色的审批人（按角色查询并发送邮件） */
async function notifyApproversByRole(
  role: 'DIRECTOR' | 'CEO',
  application: ApplicationEmailInfo,
  taskType: ApprovalTaskType
): Promise<void> {
  const recipients = await getCachedApproversByRole(role);

  if (recipients.length > 0) {
    await sendApprovalTaskEmails(recipients, application, taskType);
  }
}

/** 根据工号列表通知审批人 */
async function notifyApproversByIds(
  employeeIds: string[],
  application: ApplicationEmailInfo,
  taskType: ApprovalTaskType
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true, email: true, name: true },
  });

  const recipients = users
    .filter((u): u is typeof u & { email: string } => Boolean(u.email))
    .map((u) => ({ id: u.id, email: u.email!, name: u.name || '' }));

  if (recipients.length > 0) {
    await sendApprovalTaskEmails(recipients, application, taskType);
  }
}
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
  flowType: z.enum(['TO_MANAGER', 'TO_CEO', 'COMPLETE']).optional().default('TO_MANAGER'),
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
        // 厂长审批：检查是否所有厂长都已通过（并行审批逻辑）
        if (level === 'FACTORY') {
          const allApproved = await checkAllFactoryManagersApproved(
            tx, applicationId, application.factoryManagerIds
          );

          if (allApproved) {
            // 所有厂长通过，进入总监阶段
            await tx.application.update({
              where: { id: applicationId },
              data: { status: ApplicationStatus.PENDING_DIRECTOR }
            });
          }
          // 否则不更新状态，保持 PENDING_FACTORY，等待其他厂长审批
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

          // 经理审批：检查是否所有经理都已通过（并行审批逻辑）
          if (level === 'MANAGER') {
            const allApproved = await checkAllManagersApproved(
              tx, applicationId, application.managerIds
            );

            if (allApproved) {
              // 所有经理通过，进入CEO阶段
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
            // 否则不更新状态，保持 PENDING_MANAGER，等待其他经理审批
          }

          // 最终审批通过后处理归档
          if (level === 'CEO') {
            await handleReadonlyNotification(applicationId, application.amount ? Number(application.amount) : null);

            // CEO审批通过后，高金额申请通知财务人员
            if (action === 'APPROVE' && application.amount) {
              const amount = Number(application.amount);
              const needCEOApproval = await requiresCEOApproval(amount);
              if (needCEOApproval) {
                // 在事务外异步发送通知，不阻塞主流程
                setImmediate(() => {
                  notifyHighAmountApproval(
                    applicationId,
                    amount,
                    application.applicantName
                  ).catch((err) => {
                    logger.error('高金额通知发送失败', { error: err });
                  });
                });
              }
            }

            const archiveResult = await archiveApplication(applicationId, tx);
            if (!archiveResult.success) {
              throw new Error(`归档失败: ${archiveResult.error}`);
            }
          }
        }
      }

      return { newStatus };
    });

    const newStatus = getNextStatus(application.status, action);
    const oldStatus = application.status;

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
      logger.error('审批通知发送失败', {
        error: notifyError instanceof Error ? notifyError.message : String(notifyError),
      });
    }

    // 发送邮件通知申请人审批结果（通过/拒绝）
    try {
      const applicant = await prisma.user.findUnique({
        where: { id: application.applicantId },
        select: { email: true },
      });

      if (applicant?.email) {
        await sendApplicationResultEmail(applicant.email, application.applicantId, {
          id: applicationId,
          applicationNo: application.applicationNo,
          title: application.title,
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          completedAt: action === 'APPROVE' ? new Date() : null,
          rejectedAt: action === 'REJECT' ? new Date() : null,
          rejectReason: comment?.trim() || null,
        });
      }
    } catch (emailError) {
      logger.error('审批结果邮件发送失败', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    // 流程流转邮件通知
    const appInfo: ApplicationEmailInfo = {
      id: applicationId,
      applicationNo: application.applicationNo,
      title: application.title,
      applicantName: application.applicantName,
      priority: application.priority,
    };

    // 厂长通过 → 通知总监
    if (level === 'FACTORY' && action === 'APPROVE' && oldStatus === ApplicationStatus.PENDING_FACTORY) {
      try {
        const allApproved = await checkAllFactoryManagersApproved(
          prisma, applicationId, application.factoryManagerIds
        );
        if (allApproved) await notifyApproversByRole('DIRECTOR', appInfo, 'DIRECTOR');
      } catch (flowError) {
        logger.error('厂长流转总监邮件通知失败', { error: String(flowError) });
      }
    }

    // 经理通过 → 通知CEO
    if (level === 'MANAGER' && action === 'APPROVE' && oldStatus === ApplicationStatus.PENDING_MANAGER) {
      try {
        const allApproved = await checkAllManagersApproved(prisma, applicationId, application.managerIds);
        if (allApproved) await notifyApproversByRole('CEO', appInfo, 'CEO');
      } catch (flowError) {
        logger.error('经理流转CEO邮件通知失败', { error: String(flowError) });
      }
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
 * 支持三种流向：TO_MANAGER、TO_CEO、COMPLETE
 *
 * 注意：对于其他申请(OTHER类型)且skipFactory=true的情况，总监审批后直接批准
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

    const { action, comment, flowType, selectedManagerIds } = parseResult.data;

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

    // 解析flowConfig
    const flowConfig = application.flowConfig as { skipFactory?: boolean; targetLevel?: 'DIRECTOR' | 'CEO' } | null;
    const isOtherSkipFactory = application.type === 'OTHER' && flowConfig?.skipFactory;
    const targetLevel = flowConfig?.targetLevel;

    // 其他申请且目标是总监：总监审批后直接批准，不需要flowType选择
    if (isOtherSkipFactory && targetLevel === 'DIRECTOR') {
      await prisma.$transaction(async (tx) => {
        // 创建总监审批记录
        await tx.directorApproval.create({
          data: {
            applicationId,
            approverId: user.id,
            action: action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT,
            comment: comment?.trim() || null,
            skipManager: true,
            flowType: action === 'APPROVE' ? 'COMPLETE' : undefined,
            approvedAt: new Date(),
          },
        });

        if (action === 'REJECT') {
          await tx.application.update({
            where: { id: applicationId },
            data: {
              status: ApplicationStatus.REJECTED,
              rejectedBy: user.id,
              rejectedAt: new Date(),
              rejectReason: comment?.trim() || null,
            },
          });
        } else {
          // 直接批准
          await tx.application.update({
            where: { id: applicationId },
            data: {
              status: ApplicationStatus.APPROVED,
              completedAt: new Date(),
            },
          });
          // 归档
          await handleReadonlyNotification(applicationId, application.amount ? Number(application.amount) : null);
          const archiveResult = await archiveApplication(applicationId, tx);
          if (!archiveResult.success) {
            throw new Error(`归档失败: ${archiveResult.error}`);
          }
        }
      });

      const updatedApp = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { status: true, applicantId: true, applicationNo: true, title: true }
      });

      // 发送邮件通知给申请人（其他申请总监直接完成）
      await notifyApplicantOfResult(
        updatedApp?.applicantId,
        { id: applicationId, applicationNo: updatedApp?.applicationNo || '', title: updatedApp?.title || '' },
        action,
        comment,
        '其他申请总监审批结果'
      );

      res.json(ok({
        message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
        status: updatedApp?.status,
        statusText: getStatusText(updatedApp?.status || ApplicationStatus.REJECTED),
      }));
      return;
    }

    // 其他申请且目标是CEO：总监审批后直接流向CEO
    if (isOtherSkipFactory && targetLevel === 'CEO') {
      await prisma.$transaction(async (tx) => {
        // 创建总监审批记录
        await tx.directorApproval.create({
          data: {
            applicationId,
            approverId: user.id,
            action: action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT,
            comment: comment?.trim() || null,
            skipManager: true,
            flowType: action === 'APPROVE' ? 'TO_CEO' : undefined,
            approvedAt: new Date(),
          },
        });

        if (action === 'REJECT') {
          await tx.application.update({
            where: { id: applicationId },
            data: {
              status: ApplicationStatus.REJECTED,
              rejectedBy: user.id,
              rejectedAt: new Date(),
              rejectReason: comment?.trim() || null,
            },
          });
        } else {
          // 更新状态为待CEO审批
          await tx.application.update({
            where: { id: applicationId },
            data: {
              status: ApplicationStatus.PENDING_CEO,
            },
          });
          // 创建CEO审批记录
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
      });

      const updatedApp = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { status: true, applicantId: true, applicationNo: true, title: true }
      });

      // 发送邮件通知（其他申请流向CEO）
      if (action === 'APPROVE') {
        // 通知CEO有新的审批任务
        try {
          await notifyApproversByRole('CEO', {
            id: applicationId,
            applicationNo: application.applicationNo,
            title: application.title,
            applicantName: application.applicantName,
            priority: application.priority,
          }, 'CEO');
        } catch (emailError) {
          logger.error('其他申请流向CEO邮件通知失败', { error: String(emailError) });
        }
      } else {
        // 拒绝时通知申请人
        await notifyApplicantOfResult(
          updatedApp?.applicantId,
          { id: applicationId, applicationNo: updatedApp?.applicationNo || '', title: updatedApp?.title || '' },
          'REJECT',
          comment,
          '其他申请总监拒绝'
        );
      }

      res.json(ok({
        message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
        status: updatedApp?.status,
        statusText: getStatusText(updatedApp?.status || ApplicationStatus.REJECTED),
      }));
      return;
    }

    // 标准申请：需要选择flowType
    // 如果选择通过且流向经理，必须选择经理
    if (action === 'APPROVE' && flowType === 'TO_MANAGER' && (!selectedManagerIds || selectedManagerIds.length === 0)) {
      res.status(400).json(fail('MISSING_MANAGERS', '请选择审批经理'));
      return;
    }

    const approvalAction = action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT;

    await prisma.$transaction(async (tx) => {
      // 确定新状态
      let nextStatus: ApplicationStatus;

      if (action === 'APPROVE') {
        switch (flowType) {
          case 'TO_MANAGER':
            nextStatus = ApplicationStatus.PENDING_MANAGER;
            break;
          case 'TO_CEO':
            nextStatus = ApplicationStatus.PENDING_CEO;
            break;
          case 'COMPLETE':
            nextStatus = ApplicationStatus.APPROVED;
            break;
          default:
            nextStatus = ApplicationStatus.PENDING_MANAGER;
        }
      } else {
        nextStatus = ApplicationStatus.REJECTED;
      }

      // 创建总监审批记录
      await tx.directorApproval.create({
        data: {
          applicationId,
          approverId: user.id,
          action: approvalAction,
          comment: comment?.trim() || null,
          selectedManagerIds: flowType === 'TO_MANAGER' ? (selectedManagerIds || []) : [],
          skipManager: flowType !== 'TO_MANAGER',
          flowType,
          approvedAt: new Date(),
        },
      });

      if (action === 'REJECT') {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: nextStatus,
            rejectedBy: user.id,
            rejectedAt: new Date(),
            rejectReason: comment?.trim() || null,
          },
        });
      } else {
        // 更新申请状态
        const updateData: Prisma.ApplicationUpdateInput = {
          status: nextStatus,
          managerIds: flowType === 'TO_MANAGER' ? selectedManagerIds : [],
        };

        // 直接完成时设置完成时间
        if (flowType === 'COMPLETE') {
          updateData.completedAt = new Date();
        }

        await tx.application.update({
          where: { id: applicationId },
          data: updateData,
        });

        // 根据流向创建相应的审批记录
        if (flowType === 'TO_MANAGER' && selectedManagerIds && selectedManagerIds.length > 0) {
          // 创建经理审批记录
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
        } else if (flowType === 'TO_CEO') {
          // 创建CEO审批记录
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
        } else if (flowType === 'COMPLETE') {
          // 直接完成，处理归档
          await handleReadonlyNotification(applicationId, application.amount ? Number(application.amount) : null);
          const archiveResult = await archiveApplication(applicationId, tx);
          if (!archiveResult.success) {
            throw new Error(`归档失败: ${archiveResult.error}`);
          }
        }
      }

      return { nextStatus };
    });

    // 重新查询获取最终状态
    const updatedApp = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { status: true }
    });

    // 总监审批流转邮件通知
    const appInfo: ApplicationEmailInfo = {
      id: applicationId,
      applicationNo: application.applicationNo,
      title: application.title,
      applicantName: application.applicantName,
      priority: application.priority,
    };

    if (action === 'APPROVE') {
      try {
        if (flowType === 'TO_MANAGER' && selectedManagerIds?.length) {
          await notifyApproversByIds(selectedManagerIds, appInfo, 'MANAGER');
        } else if (flowType === 'TO_CEO') {
          await notifyApproversByRole('CEO', appInfo, 'CEO');
        }
      } catch (emailError) {
        logger.error('总监审批流转邮件通知失败', { error: String(emailError) });
      }
    }

    // 总监拒绝时通知申请人
    if (action === 'REJECT') {
      try {
        const applicant = await prisma.user.findUnique({
          where: { id: application.applicantId },
          select: { email: true },
        });
        if (applicant?.email) {
          await sendApplicationResultEmail(applicant.email, application.applicantId, {
            id: applicationId,
            applicationNo: application.applicationNo,
            title: application.title,
            status: 'REJECTED',
            rejectedAt: new Date(),
            rejectReason: comment?.trim() || null,
          });
        }
      } catch (emailError) {
        logger.error('总监拒绝邮件通知失败', { error: String(emailError) });
      }
    }

    res.json(ok({
      message: action === 'APPROVE' ? '审批通过' : '审批已拒绝',
      status: updatedApp?.status,
      statusText: getStatusText(updatedApp?.status || ApplicationStatus.REJECTED),
      flowType: action === 'APPROVE' ? flowType : undefined,
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
 * 规则: 金额 >= CEO审批阈值的审批通过后通知只读用户
 */
async function handleReadonlyNotification(applicationId: string, amount: number | null): Promise<void> {
  // 使用配置中的CEO审批阈值判断是否通知
  const threshold = await getCEOApprovalThreshold();
  if (!amount || amount < threshold) return;

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
