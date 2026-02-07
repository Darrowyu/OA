import { Request, Response } from 'express';
import { PrismaClient, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取申请统计数据
 * GET /api/statistics/applications
 */
export async function getApplicationStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return;
    }

    // 构建查询条件
    const where: any = {};

    // 非管理员只能看自己的申请
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
    }

    // 获取所有申请
    const applications = await prisma.application.findMany({
      where,
      select: {
        amount: true,
        status: true,
      },
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
      // 累加总金额(默认CNY)
      stats.total.cny += amount;

      // 根据状态累加金额(默认CNY)
      if (app.status === ApplicationStatus.APPROVED) {
        stats.count.approved++;
        stats.approved.cny += amount;
      } else if (app.status === ApplicationStatus.REJECTED) {
        stats.count.rejected++;
        stats.rejected.cny += amount;
      } else if (
        app.status === ApplicationStatus.PENDING_FACTORY ||
        app.status === ApplicationStatus.PENDING_DIRECTOR ||
        app.status === ApplicationStatus.PENDING_MANAGER ||
        app.status === ApplicationStatus.PENDING_CEO
      ) {
        stats.count.pending++;
        stats.pending.cny += amount;
      } else if (app.status === ApplicationStatus.DRAFT) {
        stats.count.draft++;
      }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取申请统计失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取统计信息失败' } });
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
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } });
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

    // 计算统计数据
    const stats = {
      totalPending: pendingApplications.length,
      overdue: 0,
      remindable: 0,
      todayReminders: 0,
      byPriority: {
        URGENT: 0,
        HIGH: 0,
        NORMAL: 0,
        LOW: 0,
      },
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
        if (hoursSinceSubmission > 24) {
          stats.overdue++;
        }
      }

      // 今天发送的提醒
      if (app.reminderLogs.length > 0) {
        const lastReminder = new Date(app.reminderLogs[0].sentAt);
        if (lastReminder >= today) {
          stats.todayReminders++;
        }
      }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取提醒统计失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取提醒统计失败' } });
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
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return;
    }

    const where: any = {};
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
    }

    // 并行查询各种统计
    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalUsers,
      recentApplications,
    ] = await Promise.all([
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

    res.json({
      success: true,
      data: {
        counts: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications,
        },
        users: totalUsers,
        recent: recentApplications,
      },
    });
  } catch (error) {
    console.error('获取概览统计失败:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '获取概览统计失败' } });
  }
}
