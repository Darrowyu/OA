import { Request, Response } from 'express';
import { z } from 'zod';
import { ApplicationStatus, Priority, Prisma, UserRole } from '@prisma/client';
import {
  parseAmount,
  getStatusText,
  getPriorityText,
  isApplicationFinal,
} from '../utils/application';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { createNotifications, sendApprovalTaskEmails } from '../services/notificationService';
import { fail } from '../utils/response';
import { parsePaginationParams } from '../utils/validation';

// 用户类型定义
interface RequestUser {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  employeeId?: string;
  name?: string;
  department?: string | null;
  isActive: boolean;
}

// 审批记录类型
interface ApprovalRecord {
  approverId: string;
}

// 申请类型定义
interface ApplicationWithRelations {
  id: string;
  applicantId: string;
  status: ApplicationStatus;
  factoryManagerIds: string[];
  managerIds: string[];
  factoryApprovals: ApprovalRecord[];
  directorApprovals: ApprovalRecord[];
  managerApprovals: ApprovalRecord[];
  ceoApprovals: ApprovalRecord[];
}

// Zod 验证 Schema
const createApplicationSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多200字符'),
  content: z.string().min(1, '内容不能为空').max(5000, '内容最多5000字符'),
  amount: z.union([z.string(), z.number()]).optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  factoryManagerIds: z.array(z.string().min(1, '厂长ID不能为空')).optional(),
  attachmentIds: z.array(z.string()).optional(),
  // 新增：申请类型和流程配置
  type: z.enum(['STANDARD', 'PRODUCT_DEVELOPMENT', 'FEASIBILITY_STUDY', 'BUSINESS_TRIP', 'OTHER']).default('STANDARD'),
  flowConfig: z.object({
    skipFactory: z.boolean(),
    targetLevel: z.enum(['DIRECTOR', 'CEO']),
  }).optional(),
});

const updateApplicationSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多200字符').optional(),
  content: z.string().min(1, '内容不能为空').max(5000, '内容最多5000字符').optional(),
  amount: z.union([z.string(), z.number()]).optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  factoryManagerIds: z.array(z.string().min(1, '厂长ID不能为空')).optional(),
  attachmentIds: z.array(z.string()).optional(),
});

const paginationQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  keyword: z.string().max(100, '搜索关键词最多100字符').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/**
 * 获取申请列表（带权限过滤）
 * GET /api/applications
 */
export async function getApplications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const queryResult = paginationQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json(fail('INVALID_PARAMS', queryResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const { status, priority, keyword } = queryResult.data;
    const { page: pageNum, pageSize: limitNum, skip } = parsePaginationParams(queryResult.data.page, queryResult.data.limit);

    // 构建查询条件
    const where: Prisma.ApplicationWhereInput = {};

    // 状态过滤
    if (status && status !== 'all') {
      where.status = status as ApplicationStatus;
    }

    // 优先级过滤
    if (priority && priority !== 'all') {
      where.priority = priority as Priority;
    }

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string, mode: 'insensitive' } },
        { content: { contains: keyword as string, mode: 'insensitive' } },
        { applicationNo: { contains: keyword as string, mode: 'insensitive' } },
        { applicantName: { contains: keyword as string, mode: 'insensitive' } },
      ];
    }

    // 权限过滤 - 基于用户角色自动过滤
    if (user.role === 'USER') {
      // 普通用户只能看自己的申请
      where.applicantId = user.id;
    } else if (user.role !== 'ADMIN') {
      // 非管理员角色根据角色权限过滤
      const roleFilters: Record<string, Prisma.ApplicationWhereInput> = {
        FACTORY_MANAGER: {
          OR: [
            { status: ApplicationStatus.PENDING_FACTORY, factoryManagerIds: { has: user.employeeId } },
            { factoryApprovals: { some: { approverId: user.id } } },
            { applicantId: user.id },
          ],
        },
        DIRECTOR: {
          OR: [
            { status: ApplicationStatus.PENDING_DIRECTOR },
            { directorApprovals: { some: { approverId: user.id } } },
            { applicantId: user.id },
          ],
        },
        MANAGER: {
          OR: [
            { status: ApplicationStatus.PENDING_MANAGER, managerIds: { has: user.employeeId } },
            { managerApprovals: { some: { approverId: user.id } } },
            { applicantId: user.id },
          ],
        },
        CEO: {
          OR: [
            { status: ApplicationStatus.PENDING_CEO },
            { ceoApprovals: { some: { approverId: user.id } } },
            { applicantId: user.id },
          ],
        },
        READONLY: {
          status: { in: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED] },
        },
      };

      if (roleFilters[user.role]) {
        Object.assign(where, roleFilters[user.role]);
      }
    }
    // ADMIN不需要额外过滤，可以看所有申请

    // 并行查询总数和数据
    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          applicant: {
            select: { id: true, name: true, email: true, department: true, employeeId: true },
          },
          _count: {
            select: { attachments: true },
          },
        },
      }),
    ]);

    // 格式化响应数据
    const formattedApps = applications.map(app => ({
      id: app.id,
      applicationNo: app.applicationNo,
      title: app.title,
      content: app.content.substring(0, 200) + (app.content.length > 200 ? '...' : ''), // 截断内容
      amount: app.amount,
      priority: app.priority,
      priorityText: getPriorityText(app.priority),
      status: app.status,
      statusText: getStatusText(app.status),
      applicantId: app.applicantId,
      applicantName: app.applicantName,
      applicantDept: app.applicantDept,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      attachmentCount: app._count.attachments,
    }));

    res.json({
      success: true,
      data: {
        items: formattedApps,
        pagination: {
          page: pageNum,
          pageSize: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('获取申请列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取申请列表失败'));
  }
}

/**
 * 获取申请详情
 * GET /api/applications/:id
 */
export async function getApplication(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json(fail('INVALID_ID', '无效的申请ID'));
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: {
          select: { id: true, name: true, email: true, department: true, employeeId: true },
        },
        attachments: {
          select: { id: true, filename: true, size: true, mimeType: true, createdAt: true },
        },
        factoryApprovals: {
          include: {
            approver: { select: { id: true, name: true, employeeId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        directorApprovals: {
          include: {
            approver: { select: { id: true, name: true, employeeId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        managerApprovals: {
          include: {
            approver: { select: { id: true, name: true, employeeId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        ceoApprovals: {
          include: {
            approver: { select: { id: true, name: true, employeeId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    // 权限检查
    const canView = await checkViewPermission(user, application);
    if (!canView) {
      res.status(403).json(fail('FORBIDDEN', '无权查看此申请'));
      return;
    }

    res.json({
      success: true,
      data: {
        ...application,
        statusText: getStatusText(application.status),
        priorityText: getPriorityText(application.priority),
      },
    });
  } catch (error) {
    logger.error('获取申请详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取申请详情失败'));
  }
}

/**
 * 创建申请
 * POST /api/applications
 */
export async function createApplication(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    // 检查用户是否有提交权限
    if (!['USER', 'DIRECTOR', 'ADMIN'].includes(user.role)) {
      res.status(403).json(fail('FORBIDDEN', '无权提交申请'));
      return;
    }

    // Zod 验证
    const parseResult = createApplicationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const { title, content, amount, priority, factoryManagerIds, attachmentIds, type, flowConfig } = parseResult.data;

    // 验证：标准申请必须选择厂长
    if (type === 'STANDARD' && (!factoryManagerIds || factoryManagerIds.length === 0)) {
      res.status(400).json(fail('VALIDATION_ERROR', '标准申请请至少选择一位厂长'));
      return;
    }

    // 生成申请编号 - 只查询当天最新编号，避免全表扫描
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `APP-${dateStr}-`;

    const latestApp = await prisma.application.findFirst({
      where: { applicationNo: { startsWith: prefix } },
      orderBy: { applicationNo: 'desc' },
      select: { applicationNo: true },
    });

    let nextNum = 1;
    if (latestApp?.applicationNo) {
      const match = latestApp.applicationNo.match(/-(\d{4})$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const applicationNo = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // 解析金额
    const parsedAmount = parseAmount(amount);

    // 创建申请
    const application = await prisma.application.create({
      data: {
        applicationNo,
        title: title.trim(),
        content: content.trim(),
        amount: parsedAmount,
        priority: priority as Priority,
        status: ApplicationStatus.DRAFT,
        applicantId: user.id,
        applicantName: user.name || '',
        applicantDept: user.department || '',
        factoryManagerIds: factoryManagerIds || [],
        managerIds: [], // 初始为空，由总监选择
        type: type as any,
        flowConfig: flowConfig || undefined,
      },
    });

    // 关联附件
    if (attachmentIds && attachmentIds.length > 0) {
      await prisma.attachment.updateMany({
        where: { id: { in: attachmentIds } },
        data: { applicationId: application.id },
      });
    }

    res.status(201).json({
      success: true,
      message: '申请创建成功',
      data: {
        ...application,
        statusText: getStatusText(application.status),
        priorityText: getPriorityText(application.priority),
      },
    });
  } catch (error) {
    logger.error('创建申请失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '创建申请失败'));
  }
}

/**
 * 更新申请
 * PUT /api/applications/:id
 */
export async function updateApplication(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json(fail('INVALID_ID', '无效的申请ID'));
      return;
    }

    // Zod 验证
    const parseResult = updateApplicationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const { title, content, amount, priority, factoryManagerIds, attachmentIds } = parseResult.data;

    // 查找申请
    const existingApp = await prisma.application.findUnique({ where: { id } });
    if (!existingApp) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    // 权限检查：只有申请人或管理员可以修改草稿
    if (existingApp.status !== ApplicationStatus.DRAFT) {
      res.status(400).json(fail('INVALID_STATUS', '只能修改草稿状态的申请'));
      return;
    }
    if (existingApp.applicantId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json(fail('FORBIDDEN', '无权修改此申请'));
      return;
    }

    // 构建更新数据
    const updateData: Prisma.ApplicationUpdateInput = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (amount !== undefined) updateData.amount = parseAmount(amount);
    if (priority !== undefined) updateData.priority = priority as Priority;
    if (factoryManagerIds !== undefined) updateData.factoryManagerIds = factoryManagerIds;

    // 更新申请
    const updatedApp = await prisma.application.update({
      where: { id },
      data: updateData,
    });

    // 更新附件关联
    if (attachmentIds !== undefined) {
      // 先清除未关联的附件
      await prisma.attachment.deleteMany({
        where: { applicationId: id, isApprovalAttachment: false },
      });
      // 关联新附件
      if (attachmentIds.length > 0) {
        await prisma.attachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { applicationId: id },
        });
      }
    }

    res.json({
      success: true,
      message: '申请更新成功',
      data: {
        ...updatedApp,
        statusText: getStatusText(updatedApp.status),
        priorityText: getPriorityText(updatedApp.priority),
      },
    });
  } catch (error) {
    logger.error('更新申请失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '更新申请失败'));
  }
}

/**
 * 删除申请
 * DELETE /api/applications/:id
 */
export async function deleteApplication(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json(fail('INVALID_ID', '无效的申请ID'));
      return;
    }

    // 查找申请
    const existingApp = await prisma.application.findUnique({ where: { id } });
    if (!existingApp) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    // 权限检查
    if (existingApp.applicantId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json(fail('FORBIDDEN', '无权删除此申请'));
      return;
    }

    // 只能删除草稿或被拒绝的申请
    const deletableStatuses: ApplicationStatus[] = [ApplicationStatus.DRAFT, ApplicationStatus.REJECTED];
    if (!deletableStatuses.includes(existingApp.status)) {
      res.status(400).json(fail('INVALID_STATUS', '只能删除草稿或已拒绝的申请'));
      return;
    }

    // 删除申请（级联删除关联数据）
    await prisma.application.delete({ where: { id } });

    res.json({ success: true, message: '申请删除成功' });
  } catch (error) {
    logger.error('删除申请失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '删除申请失败'));
  }
}

/**
 * 提交申请（将草稿转为审批中）
 * POST /api/applications/:id/submit
 */
export async function submitApplication(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      res.status(400).json(fail('INVALID_ID', '无效的申请ID'));
      return;
    }

    const existingApp = await prisma.application.findUnique({ where: { id } });
    if (!existingApp) {
      res.status(404).json(fail('NOT_FOUND', '申请不存在'));
      return;
    }

    if (existingApp.applicantId !== user.id) {
      res.status(403).json(fail('FORBIDDEN', '无权提交此申请'));
      return;
    }

    if (existingApp.status !== ApplicationStatus.DRAFT) {
      res.status(400).json(fail('INVALID_STATUS', '只能提交草稿状态的申请'));
      return;
    }

    // 根据申请类型确定提交流程
    const result = await prisma.$transaction(async (tx) => {
      // 解析flowConfig
      const flowConfig = existingApp.flowConfig as { skipFactory?: boolean; targetLevel?: 'DIRECTOR' | 'CEO' } | null;
      const isOtherType = existingApp.type === 'OTHER';
      const skipFactory = isOtherType && flowConfig?.skipFactory;
      const targetLevel = flowConfig?.targetLevel;

      if (isOtherType && skipFactory) {
        // 其他申请且跳过厂长：直接进入目标审批级别
        const nextStatus = targetLevel === 'CEO'
          ? ApplicationStatus.PENDING_CEO
          : ApplicationStatus.PENDING_DIRECTOR;

        await tx.application.update({
          where: { id },
          data: {
            status: nextStatus,
            submittedAt: new Date(),
          },
        });

        // 创建对应级别的审批记录
        if (targetLevel === 'CEO') {
          const ceo = await tx.user.findFirst({ where: { role: 'CEO' } });
          if (ceo) {
            await tx.ceoApproval.create({
              data: {
                applicationId: id,
                approverId: ceo.id,
                action: 'PENDING',
              },
            });
          }
          return { targetUsers: ceo ? [ceo] : [], application: existingApp };
        } else {
          // 总监审批 - 所有总监都能审批
          const directors = await tx.user.findMany({ where: { role: 'DIRECTOR' } });
          await tx.directorApproval.createMany({
            data: directors.map(director => ({
              applicationId: id,
              approverId: director.id,
              action: 'PENDING',
            })),
          });
          return { targetUsers: directors, application: existingApp };
        }
      } else {
        // 标准流程：提交给厂长
        await tx.application.update({
          where: { id },
          data: {
            status: ApplicationStatus.PENDING_FACTORY,
            submittedAt: new Date(),
          },
        });

        // 为每个厂长创建审批记录（批量查询+批量创建，避免N+1）
        const managers = await tx.user.findMany({
          where: { employeeId: { in: existingApp.factoryManagerIds } }
        });
        await tx.factoryApproval.createMany({
          data: managers.map(manager => ({
            applicationId: id,
            approverId: manager.id,
            action: 'PENDING',
          })),
        });

        return { targetUsers: managers, application: existingApp };
      }
    });

    // P0修复: 集成通知到业务流程 - 通知审批人有新的审批待处理
    try {
      if (result?.targetUsers && result.targetUsers.length > 0) {
        const notifications = result.targetUsers.map(user => ({
          userId: user.id,
          type: 'APPROVAL' as const,
          title: '新的审批待处理',
          content: `申请 "${result.application.title}" 需要您审批`,
          data: {
            applicationId: id,
            applicationNo: result.application.applicationNo,
            action: 'submit',
          },
        }));
        await createNotifications(notifications);

        // 发送邮件通知给审批人
        const recipients = result.targetUsers
          .filter((u) => Boolean(u.email))
          .map((u) => ({ email: u.email!, name: u.name || u.username, id: u.id }));

        if (recipients.length) {
          const flowConfig = existingApp.flowConfig as { skipFactory?: boolean; targetLevel?: 'DIRECTOR' | 'CEO' } | null;
          const skipFactory = existingApp.type === 'OTHER' && flowConfig?.skipFactory;
          const taskType = skipFactory ? (flowConfig?.targetLevel === 'CEO' ? 'CEO' : 'DIRECTOR') : 'FACTORY';

          await sendApprovalTaskEmails(recipients, {
            id: existingApp.id,
            applicationNo: existingApp.applicationNo,
            title: existingApp.title,
            applicantName: existingApp.applicantName,
            priority: existingApp.priority,
          }, taskType);
        }
      }
    } catch (notifyError) {
      logger.error('提交申请通知发送失败', { error: notifyError });
    }

    res.json({ success: true, message: '申请提交成功' });
  } catch (error) {
    logger.error('提交申请失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '提交申请失败'));
  }
}

/**
 * 检查用户是否有权限查看申请
 */
async function checkViewPermission(user: RequestUser, application: ApplicationWithRelations): Promise<boolean> {
  // 申请人自己可以看
  if (application.applicantId === user.id) return true;

  // 管理员可以看所有
  if (user.role === 'ADMIN') return true;

  // 只读用户只能看已完成的
  if (user.role === 'READONLY') {
    return isApplicationFinal(application.status);
  }

  // 厂长可以看分配给自己的
  if (user.role === 'FACTORY_MANAGER') {
    if (application.factoryManagerIds.includes(user.employeeId || '')) return true;
    if (application.factoryApprovals.some((a: ApprovalRecord) => a.approverId === user.id)) return true;
  }

  // 总监可以看所有待审批和已审批的
  if (user.role === 'DIRECTOR') {
    if (application.status === ApplicationStatus.PENDING_DIRECTOR) return true;
    if (application.directorApprovals.some((a: ApprovalRecord) => a.approverId === user.id)) return true;
  }

  // 经理可以看分配给自己的
  if (user.role === 'MANAGER') {
    if (application.managerIds.includes(user.employeeId || '')) return true;
    if (application.managerApprovals.some((a: ApprovalRecord) => a.approverId === user.id)) return true;
  }

  // CEO可以看待审批和已审批的
  if (user.role === 'CEO') {
    if (application.status === ApplicationStatus.PENDING_CEO) return true;
    if (application.ceoApprovals.some((a: ApprovalRecord) => a.approverId === user.id)) return true;
  }

  return false;
}
