import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Priority, ApplicationType, ApprovalAction, Prisma } from '@prisma/client';
import { fail } from '../utils/response';
import logger from '../lib/logger';

// 扩展ApplicationStatus以包含PENDING_REVIEWER
type ExtendedApplicationStatus = 'DRAFT' | 'PENDING_FACTORY' | 'PENDING_DIRECTOR' | 'PENDING_MANAGER' | 'PENDING_CEO' | 'PENDING_REVIEWER' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

// 项目内容Schema验证
const projectContentSchema = z.object({
  nature: z.string().min(1, '产品性质不能为空'),
  successProbability: z.string().min(1, '成功概率不能为空'),
  competition: z.string().min(1, '竞争情况不能为空'),
  developmentCost: z.string().min(1, '开发费用不能为空'),
  productionCost: z.string().min(1, '生产成本不能为空'),
  compliance: z.string().min(1, '合规性不能为空'),
  profitForecast: z.string().min(1, '利润预测不能为空'),
});

// 创建新产品开发企划表请求验证Schema
const createProductDevelopmentSchema = z.object({
  projectName: z.string().min(1, '项目名称不能为空'),
  customerName: z.string().min(1, '客户名称不能为空'),
  projectSources: z.array(z.string()).min(1, '请至少选择一个开发源由'),
  projectContent: projectContentSchema,
  reviewerId: z.string().min(1, '请选择项目审核人'),
  proposerId: z.string().min(1, '请选择项目申请人'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

// 审批操作验证Schema
const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().optional(),
});

/**
 * 生成PD编号: PD + YYYYMMDD + 流水号(3位)
 * 示例: PD20260224-001
 */
async function generateProjectNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PD${dateStr}-`;

  const latest = await prisma.application.findFirst({
    where: { projectNo: { startsWith: prefix } },
    orderBy: { projectNo: 'desc' },
    select: { projectNo: true },
  });

  let nextNum = 1;
  if (latest?.projectNo) {
    const match = latest.projectNo.match(/-(\d{3})$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

/**
 * 创建新产品开发企划表
 * POST /api/product-development
 */
export async function createProductDevelopment(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const parseResult = createProductDevelopmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const data = parseResult.data;
    const projectNo = await generateProjectNo();

    const application = await prisma.$transaction(async (tx) => {
      // 创建申请
      const app = await tx.application.create({
        data: {
          applicationNo: projectNo,
          projectNo,
          type: ApplicationType.PRODUCT_DEVELOPMENT,
          formType: '新产品开发企划表',
          title: `新产品开发: ${data.projectName}`,
          content: JSON.stringify(data.projectContent),
          projectName: data.projectName,
          customerName: data.customerName,
          projectSources: data.projectSources,
          projectContent: data.projectContent,
          projectReviewerId: data.reviewerId,
          projectProposerId: data.proposerId,
          priority: data.priority as Priority,
          status: 'PENDING_REVIEWER' as ExtendedApplicationStatus,
          applicantId: user.id,
          applicantName: user.name || '',
          applicantDept: user.department || '',
          submittedAt: new Date(),
        },
      });

      // 创建审核人审批记录 (level=1 表示审核人级别)
      await tx.approval.create({
        data: {
          applicationId: app.id,
          approverId: data.reviewerId,
          level: 1,
          action: ApprovalAction.PENDING,
        },
      });

      return app;
    });

    res.status(201).json({
      success: true,
      message: '新产品开发企划表创建成功',
      data: application,
    });
  } catch (error) {
    logger.error('创建新产品开发企划表失败', { error });
    res.status(500).json(fail('INTERNAL_ERROR', '创建失败'));
  }
}

/**
 * 获取新产品开发企划表列表
 * GET /api/product-development
 */
export async function getProductDevelopments(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { page = '1', limit = '10', status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.ApplicationWhereInput = {
      type: ApplicationType.PRODUCT_DEVELOPMENT,
      deletedAt: null,
    };

    // 状态过滤
    if (status && status !== 'all') {
      where.status = status as ExtendedApplicationStatus;
    }

    // 权限过滤
    if (user.role === 'USER') {
      where.applicantId = user.id;
    }

    const [total, items] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          projectReviewer: { select: { id: true, name: true } },
          projectProposer: { select: { id: true, name: true } },
          approvals: {
            where: { level: 1 },
            include: { approver: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page: pageNum,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    logger.error('获取新产品开发企划表列表失败', { error });
    res.status(500).json(fail('INTERNAL_ERROR', '获取列表失败'));
  }
}

/**
 * 获取新产品开发企划表详情
 * GET /api/product-development/:id
 */
export async function getProductDevelopment(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        type: ApplicationType.PRODUCT_DEVELOPMENT,
        deletedAt: null,
      },
      include: {
        projectReviewer: { select: { id: true, name: true, department: true } },
        projectProposer: { select: { id: true, name: true, department: true } },
        approvals: {
          include: { approver: { select: { id: true, name: true, department: true } } },
          orderBy: { level: 'asc' },
        },
        attachments: true,
      },
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '企划表不存在'));
      return;
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    logger.error('获取新产品开发企划表详情失败', { error });
    res.status(500).json(fail('INTERNAL_ERROR', '获取详情失败'));
  }
}

/**
 * 审核人审批新产品开发企划表
 * POST /api/product-development/:id/approve
 */
export async function approveProductDevelopment(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;
    const parseResult = approvalActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message || '参数验证失败'));
      return;
    }

    const { action, comment } = parseResult.data;

    // 查找申请和审批记录
    const application = await prisma.application.findFirst({
      where: {
        id,
        type: ApplicationType.PRODUCT_DEVELOPMENT,
        deletedAt: null,
      },
      include: {
        approvals: {
          where: { level: 1 },
        },
      },
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '企划表不存在'));
      return;
    }

    // 验证当前用户是否为审核人
    const approvalRecord = application.approvals[0];
    if (!approvalRecord || approvalRecord.approverId !== user.id) {
      res.status(403).json(fail('FORBIDDEN', '您不是该企划表的审核人'));
      return;
    }

    // 验证状态
    if (application.status !== 'PENDING_REVIEWER') {
      res.status(400).json(fail('INVALID_STATUS', '该企划表当前状态不允许审批'));
      return;
    }

    // 执行审批
    const updatedApplication = await prisma.$transaction(async (tx) => {
      // 更新审批记录
      await tx.approval.update({
        where: { id: approvalRecord.id },
        data: {
          action: action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT,
          comment: comment || null,
        },
      });

      // 更新申请状态
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const updateData: Prisma.ApplicationUpdateInput = {
        status: newStatus as ExtendedApplicationStatus,
        completedAt: action === 'APPROVE' ? new Date() : null,
      };

      if (action === 'REJECT') {
        updateData.rejectedBy = user.id;
        updateData.rejectedAt = new Date();
        updateData.rejectReason = comment || '审核人驳回';
      }

      return tx.application.update({
        where: { id },
        data: updateData,
      });
    });

    res.json({
      success: true,
      message: action === 'APPROVE' ? '审批通过' : '已驳回',
      data: updatedApplication,
    });
  } catch (error) {
    logger.error('审批新产品开发企划表失败', { error });
    res.status(500).json(fail('INTERNAL_ERROR', '审批失败'));
  }
}

/**
 * 删除新产品开发企划表（软删除）
 * DELETE /api/product-development/:id
 */
export async function deleteProductDevelopment(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        type: ApplicationType.PRODUCT_DEVELOPMENT,
        deletedAt: null,
      },
    });

    if (!application) {
      res.status(404).json(fail('NOT_FOUND', '企划表不存在'));
      return;
    }

    // 只能删除自己创建的草稿或被驳回的申请
    if (application.applicantId !== user.id) {
      res.status(403).json(fail('FORBIDDEN', '只能删除自己创建的企划表'));
      return;
    }

    const deletableStatuses: ExtendedApplicationStatus[] = ['DRAFT', 'REJECTED'];
    if (!deletableStatuses.includes(application.status as ExtendedApplicationStatus)) {
      res.status(400).json(fail('INVALID_STATUS', '只能删除草稿或被驳回的企划表'));
      return;
    }

    await prisma.application.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    logger.error('删除新产品开发企划表失败', { error });
    res.status(500).json(fail('INTERNAL_ERROR', '删除失败'));
  }
}
