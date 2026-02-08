import { Request, Response } from 'express';
import { ApplicationStatus, Priority, Prisma, UserRole } from '@prisma/client';
import {
  generateApplicationNo,
  parseAmount,
  getStatusText,
  getPriorityText,
  isApplicationFinal,
} from '../utils/application';
import { prisma as prismaInstance } from '../lib/prisma';
import logger from '../lib/logger';

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

const prisma = prismaInstance;

/**
 * 获取申请列表（带权限过滤）
 * GET /api/applications
 */
export async function getApplications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const {
      status,
      priority,
      keyword,
      page = '1',
      limit = '20',
      myApplications,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

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

    // 权限过滤
    if (myApplications === 'true') {
      // 只看自己的申请
      where.applicantId = user.id;
    } else {
      // 根据角色过滤可见申请
      switch (user.role) {
        case 'USER':
          // 普通用户只能看自己的
          where.applicantId = user.id;
          break;
        case 'FACTORY_MANAGER':
          // 厂长看待自己审批的和已审批的
          if (!status || status === 'all') {
            where.OR = [
              { status: ApplicationStatus.PENDING_FACTORY, factoryManagerIds: { has: user.employeeId } },
              { factoryApprovals: { some: { approverId: user.id } } },
              { applicantId: user.id },
            ];
          }
          break;
        case 'DIRECTOR':
          // 总监看待审批的和已审批的
          if (!status || status === 'all') {
            where.OR = [
              { status: ApplicationStatus.PENDING_DIRECTOR },
              { directorApprovals: { some: { approverId: user.id } } },
              { applicantId: user.id },
            ];
          }
          break;
        case 'MANAGER':
          // 经理看待自己审批的和已审批的
          if (!status || status === 'all') {
            where.OR = [
              { status: ApplicationStatus.PENDING_MANAGER, managerIds: { has: user.employeeId } },
              { managerApprovals: { some: { approverId: user.id } } },
              { applicantId: user.id },
            ];
          }
          break;
        case 'CEO':
          // CEO看所有待审批和已审批的
          if (!status || status === 'all') {
            where.OR = [
              { status: ApplicationStatus.PENDING_CEO },
              { ceoApprovals: { some: { approverId: user.id } } },
              { applicantId: user.id },
            ];
          }
          break;
        case 'READONLY':
          // 只读用户只能看已完成的
          where.status = { in: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED] };
          break;
        case 'ADMIN':
          // 管理员可以看所有
          break;
      }
    }

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
    res.status(500).json({ error: '获取申请列表失败' });
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
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

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
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    // 权限检查
    const canView = await checkViewPermission(user, application);
    if (!canView) {
      res.status(403).json({ error: '无权查看此申请' });
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
    res.status(500).json({ error: '获取申请详情失败' });
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
      res.status(401).json({ error: '未登录' });
      return;
    }

    // 检查用户是否有提交权限
    if (!['USER', 'DIRECTOR', 'ADMIN'].includes(user.role)) {
      res.status(403).json({ error: '无权提交申请' });
      return;
    }

    const { title, content, amount, priority = 'NORMAL', factoryManagerIds, attachmentIds } = req.body;

    // 验证必填字段
    if (!title?.trim()) {
      res.status(400).json({ error: '标题不能为空' });
      return;
    }
    if (!content?.trim()) {
      res.status(400).json({ error: '内容不能为空' });
      return;
    }
    if (!factoryManagerIds || !Array.isArray(factoryManagerIds) || factoryManagerIds.length === 0) {
      res.status(400).json({ error: '请选择厂长' });
      return;
    }

    // 生成申请编号
    const existingNos = await prisma.application.findMany({ select: { applicationNo: true } });
    const applicationNo = generateApplicationNo(existingNos.map(n => n.applicationNo));

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
        factoryManagerIds,
        managerIds: [], // 初始为空，由总监选择
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
    res.status(500).json({ error: '创建申请失败' });
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
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { title, content, amount, priority, factoryManagerIds, attachmentIds } = req.body;

    // 查找申请
    const existingApp = await prisma.application.findUnique({ where: { id } });
    if (!existingApp) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    // 权限检查：只有申请人或管理员可以修改草稿
    if (existingApp.status !== ApplicationStatus.DRAFT) {
      res.status(400).json({ error: '只能修改草稿状态的申请' });
      return;
    }
    if (existingApp.applicantId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权修改此申请' });
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
    res.status(500).json({ error: '更新申请失败' });
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
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    // 查找申请
    const existingApp = await prisma.application.findUnique({ where: { id } });
    if (!existingApp) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    // 权限检查
    if (existingApp.applicantId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权删除此申请' });
      return;
    }

    // 只能删除草稿或被拒绝的申请
    const deletableStatuses: ApplicationStatus[] = [ApplicationStatus.DRAFT, ApplicationStatus.REJECTED];
    if (!deletableStatuses.includes(existingApp.status)) {
      res.status(400).json({ error: '只能删除草稿或已拒绝的申请' });
      return;
    }

    // 删除申请（级联删除关联数据）
    await prisma.application.delete({ where: { id } });

    res.json({ success: true, message: '申请删除成功' });
  } catch (error) {
    logger.error('删除申请失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '删除申请失败' });
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
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    const existingApp = await prisma.application.findUnique({ where: { id } });
    if (!existingApp) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }

    if (existingApp.applicantId !== user.id) {
      res.status(403).json({ error: '无权提交此申请' });
      return;
    }

    if (existingApp.status !== ApplicationStatus.DRAFT) {
      res.status(400).json({ error: '只能提交草稿状态的申请' });
      return;
    }

    // 创建厂长审批记录
    await prisma.$transaction(async (tx) => {
      // 更新申请状态
      await tx.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.PENDING_FACTORY,
          submittedAt: new Date(),
        },
      });

      // 为每个厂长创建审批记录
      for (const managerId of existingApp.factoryManagerIds) {
        const manager = await tx.user.findUnique({ where: { employeeId: managerId } });
        if (manager) {
          await tx.factoryApproval.create({
            data: {
              applicationId: id,
              approverId: manager.id,
              action: 'PENDING',
            },
          });
        }
      }
    });

    res.json({ success: true, message: '申请提交成功' });
  } catch (error) {
    logger.error('提交申请失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '提交申请失败' });
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
