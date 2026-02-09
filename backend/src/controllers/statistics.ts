import { Request, Response } from 'express';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import * as logger from '../lib/logger';

const prisma = new PrismaClient();

// 统一的错误响应辅助函数
function errorResponse(res: Response, code: string, message: string, status = 500): void {
  res.status(status).json({ success: false, error: { code, message } });
}

// 成功响应辅助函数
function successResponse<T>(res: Response, data: T): void {
  res.json({ success: true, data });
}

/**
 * 获取申请统计数据
 * GET /api/statistics/applications
 */
export async function getApplicationStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    // 构建查询条件 - 非管理员只能看自己的申请
    const where: Record<string, unknown> = {};
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
    }

    // 获取所有申请
    const applications = await prisma.application.findMany({
      where,
      select: { amount: true, status: true },
    });

    // 初始化统计数据
    const stats = {
      total: { cny: 0, usd: 0 },
      pending: { cny: 0, usd: 0 },
      approved: { cny: 0, usd: 0 },
      rejected: { cny: 0, usd: 0 },
      count: {
        total: applications.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
      },
    };

    // 统计各状态的申请金额
    applications.forEach((app) => {
      const amount = Number(app.amount) || 0;
      stats.total.cny += amount;

      // 使用配置对象映射状态到统计字段
      const statusHandlers: Record<string, () => void> = {
        [ApplicationStatus.APPROVED]: () => {
          stats.count.approved++;
          stats.approved.cny += amount;
        },
        [ApplicationStatus.REJECTED]: () => {
          stats.count.rejected++;
          stats.rejected.cny += amount;
        },
        [ApplicationStatus.DRAFT]: () => stats.count.draft++,
      };

      // 处理待审批状态（统一处理所有PENDING状态）
      if (app.status.startsWith('PENDING_')) {
        stats.count.pending++;
        stats.pending.cny += amount;
      } else if (statusHandlers[app.status]) {
        statusHandlers[app.status]();
      }
    });

    successResponse(res, stats);
  } catch (error) {
    logger.error('获取申请统计失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取统计信息失败');
  }
}

/**
 * 获取提醒统计数据
 * GET /api/statistics/reminders
 */
export async function getReminderStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', '权限不足', 403);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 获取待审批的申请
    const pendingApplications = await prisma.application.findMany({
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
      select: {
        id: true,
        submittedAt: true,
        priority: true,
        status: true,
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    // 初始化统计数据
    const stats = {
      totalPending: pendingApplications.length,
      overdue: 0,
      remindable: 0,
      todayReminders: 0,
      byPriority: { URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0 },
      byStage: {
        PENDING_FACTORY: 0,
        PENDING_DIRECTOR: 0,
        PENDING_MANAGER: 0,
        PENDING_CEO: 0,
      },
    };

    pendingApplications.forEach((app) => {
      // 按优先级统计
      stats.byPriority[app.priority as keyof typeof stats.byPriority]++;

      // 按阶段统计
      stats.byStage[app.status as keyof typeof stats.byStage]++;

      // 计算是否超时（超过24小时为超时）
      if (app.submittedAt) {
        const hoursSinceSubmission = (now.getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceSubmission > 24) stats.overdue++;
      }

      // 今天发送的提醒
      if (app.reminderLogs.length > 0) {
        const lastReminder = new Date(app.reminderLogs[0].sentAt);
        if (lastReminder >= today) stats.todayReminders++;
      }
    });

    successResponse(res, stats);
  } catch (error) {
    logger.error('获取提醒统计失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取提醒统计失败');
  }
}

/**
 * 获取系统概览统计
 * GET /api/statistics/dashboard
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
    }

    // 并行查询各种统计
    const [totalApplications, pendingApplications, approvedApplications, rejectedApplications, totalUsers, recentApplications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.count({
        where: {
          ...where,
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
      prisma.application.count({
        where: { ...where, status: ApplicationStatus.APPROVED },
      }),
      prisma.application.count({
        where: { ...where, status: ApplicationStatus.REJECTED },
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          applicationNo: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          applicantName: true,
        },
      }),
    ]);

    successResponse(res, {
      counts: {
        total: totalApplications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
      },
      users: totalUsers,
      recent: recentApplications,
    });
  } catch (error) {
    logger.error('获取概览统计失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取概览统计失败');
  }
}
