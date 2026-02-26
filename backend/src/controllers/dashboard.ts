import { Request, Response } from 'express';
import { ApplicationStatus, TaskStatus, NotificationType, CalendarEventType } from '@prisma/client';
import prisma from '../lib/prisma';
import * as logger from '../lib/logger';

// 统一的错误响应辅助函数
function errorResponse(res: Response, code: string, message: string, status = 500): void {
  res.status(status).json({ success: false, error: { code, message } });
}

// 成功响应辅助函数
function successResponse<T>(res: Response, data: T): void {
  res.json({ success: true, data });
}

/**
 * 获取工作台统计数据
 * GET /api/dashboard/stats
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 构建查询条件
    const where: Record<string, unknown> = {};
    const taskWhere: Record<string, unknown> = {};

    // 非管理员只能查看自己的数据
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.applicantId = user.id;
      taskWhere.assigneeId = user.id;
    }

    // 并行查询各种统计数据
    const [
      totalProjects,
      pendingTasks,
      inProgressApprovals,
      completedThisMonth,
      // 上月数据用于计算趋势
      lastMonthProjects,
      lastMonthTasks,
      lastMonthApprovals,
      lastMonthCompleted,
    ] = await Promise.all([
      // 总项目数（用申请数代替）
      prisma.application.count({ where }),
      // 待办任务数
      prisma.task.count({
        where: {
          ...taskWhere,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        },
      }),
      // 审批中的申请
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
      // 本月已完成
      prisma.application.count({
        where: {
          ...where,
          status: ApplicationStatus.APPROVED,
          updatedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      // 上月项目数
      prisma.application.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: startOfMonth,
          },
        },
      }),
      // 上月待办任务
      prisma.task.count({
        where: {
          ...taskWhere,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: startOfMonth,
          },
        },
      }),
      // 上月审批中
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
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: startOfMonth,
          },
        },
      }),
      // 上月已完成
      prisma.application.count({
        where: {
          ...where,
          status: ApplicationStatus.APPROVED,
          updatedAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: startOfMonth,
          },
        },
      }),
    ]);

    // 计算趋势百分比
    const calculateTrend = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
    };

    successResponse(res, {
      totalProjects,
      pendingTasks,
      inProgressApprovals,
      completedThisMonth,
      trends: {
        projects: calculateTrend(totalProjects, lastMonthProjects),
        tasks: calculateTrend(pendingTasks, lastMonthTasks),
        approvals: calculateTrend(inProgressApprovals, lastMonthApprovals),
        completed: calculateTrend(completedThisMonth, lastMonthCompleted),
      },
    });
  } catch (error) {
    logger.error('获取工作台统计数据失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取统计数据失败');
  }
}

/**
 * 获取今日日程
 * GET /api/dashboard/schedule
 */
export async function getTodaySchedule(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 获取今日日程事件
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: user.id,
        startTime: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { startTime: 'asc' },
    });

    // 颜色映射
    const colorMap: Record<string, string> = {
      [CalendarEventType.MEETING]: 'bg-blue-500',
      [CalendarEventType.TASK]: 'bg-orange-500',
      [CalendarEventType.REMINDER]: 'bg-purple-500',
      [CalendarEventType.LEAVE]: 'bg-emerald-500',
      [CalendarEventType.BUSINESS]: 'bg-amber-500',
      [CalendarEventType.OTHER]: 'bg-gray-500',
    };

    const nameMap: Record<string, string> = {
      [CalendarEventType.MEETING]: '会议',
      [CalendarEventType.TASK]: '任务',
      [CalendarEventType.REMINDER]: '提醒',
      [CalendarEventType.LEAVE]: '请假',
      [CalendarEventType.BUSINESS]: '出差',
      [CalendarEventType.OTHER]: '其他',
    };

    // 格式化数据
    const formattedEvents = events.map((event) => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // 解析attendees JSON
      let assignees: string[] = [];
      if (event.attendees && typeof event.attendees === 'object' && Array.isArray(event.attendees)) {
        assignees = (event.attendees as Array<{ name?: string }>).map(a => a.name || '').filter(Boolean);
      }

      return {
        id: event.id,
        name: nameMap[event.type] || '其他',
        task: event.title,
        progress: event.type === CalendarEventType.TASK ? 50 : 0, // 默认进度
        startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
        duration,
        color: colorMap[event.type] || colorMap[CalendarEventType.OTHER],
        assignees: assignees.length > 0 ? assignees : ['我'],
      };
    });

    successResponse(res, { events: formattedEvents });
  } catch (error) {
    logger.error('获取今日日程失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取日程失败');
  }
}

/**
 * 获取部门成员
 * GET /api/dashboard/team-members
 */
export async function getTeamMembers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    // 获取当前用户的部门信息
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true },
    });

    // 查询同部门成员
    const where: Record<string, unknown> = { isActive: true };
    if (currentUser?.departmentId) {
      where.departmentId = currentUser.departmentId;
    }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        department: { select: { name: true } },
      },
      take: 10,
    });

    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: member.username,
      role: member.department?.name || member.role,
      avatar: undefined,
    }));

    successResponse(res, { members: formattedMembers });
  } catch (error) {
    logger.error('获取部门成员失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取部门成员失败');
  }
}

/**
 * 获取即将开始的会议
 * GET /api/dashboard/upcoming-meetings
 */
export async function getUpcomingMeetings(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    const now = new Date();

    // 获取即将开始的会议 - 通过参会者记录查询
    const meetings = await prisma.meeting.findMany({
      where: {
        startTime: { gte: now },
        OR: [
          { organizerId: user.id },
          { attendeeRecords: { some: { userId: user.id } } },
        ],
      },
      include: {
        attendeeRecords: {
          include: {
            user: { select: { username: true } },
          },
        },
        room: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 5,
    });

    // 格式化数据
    const formattedMeetings = meetings.map((meeting) => {
      const startTime = new Date(meeting.startTime);
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      let dateStr: string;
      if (startTime.toDateString() === today.toDateString()) {
        dateStr = '今天';
      } else if (startTime.toDateString() === tomorrow.toDateString()) {
        dateStr = '明天';
      } else {
        dateStr = `${startTime.getMonth() + 1}月${startTime.getDate()}日`;
      }

      return {
        id: meeting.id,
        title: meeting.title,
        date: dateStr,
        time: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
        attendees: meeting.attendeeRecords.map((p) => p.user.username),
        comments: 0, // 暂无评论功能
        links: meeting.room ? 1 : 0,
      };
    });

    successResponse(res, { meetings: formattedMeetings });
  } catch (error) {
    logger.error('获取即将开始的会议失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取会议失败');
  }
}

/**
 * 获取今日任务
 * GET /api/dashboard/today-tasks
 */
export async function getTodayTasks(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 构建查询条件
    const where: Record<string, unknown> = {
      dueDate: { gte: startOfDay, lte: endOfDay },
    };

    // 非管理员只能查看自己的任务
    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.assigneeId = user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { username: true } },
        project: { select: { name: true } },
      },
      orderBy: { priority: 'desc' },
      take: 10,
    });

    // 优先级映射
    const priorityMap: Record<string, string> = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      URGENT: 'urgent',
    };

    // 格式化数据
    const formattedTasks = tasks.map((task) => {
      let progress = 0;
      if (task.status === TaskStatus.DONE) progress = 100;
      else if (task.status === TaskStatus.IN_PROGRESS) progress = 50;
      else if (task.status === TaskStatus.REVIEW) progress = 80;

      return {
        id: task.id,
        name: task.title,
        description: task.description || '暂无描述',
        priority: priorityMap[task.priority] || 'medium',
        progress,
        assignees: task.assignee ? [task.assignee.username] : [],
        comments: 0, // 暂无评论统计
        links: 0,
      };
    });

    successResponse(res, { tasks: formattedTasks });
  } catch (error) {
    logger.error('获取今日任务失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取任务失败');
  }
}

/**
 * 获取任务完成统计
 * GET /api/dashboard/task-statistics
 */
export async function getTaskStatistics(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    const { range = '6months' } = req.query;

    // 根据范围计算起始日期
    const now = new Date();
    let months = 6;
    if (range === '1month') months = 1;
    else if (range === '3months') months = 3;
    else if (range === '1year') months = 12;

    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // 构建查询条件
    const where: Record<string, unknown> = {
      createdAt: { gte: startDate },
    };

    if (user.role !== 'ADMIN' && user.role !== 'READONLY') {
      where.assigneeId = user.id;
    }

    // 获取任务数据
    const tasks = await prisma.task.findMany({
      where,
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 按月聚合数据
    const data: Array<{ month: string; target: number; actual: number }> = [];

    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const monthStr = `${monthDate.getMonth() + 1}月`;

      // 该月创建的任务数作为目标
      const target = tasks.filter((t) => {
        const created = new Date(t.createdAt);
        return created.getMonth() === monthDate.getMonth() &&
               created.getFullYear() === monthDate.getFullYear();
      }).length;

      // 该月完成的任务数作为实际
      const actual = tasks.filter((t) => {
        if (t.status !== TaskStatus.DONE) return false;
        const updated = new Date(t.updatedAt);
        return updated.getMonth() === monthDate.getMonth() &&
               updated.getFullYear() === monthDate.getFullYear();
      }).length;

      data.push({ month: monthStr, target, actual });
    }

    successResponse(res, { data });
  } catch (error) {
    logger.error('获取任务统计失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取任务统计失败');
  }
}

/**
 * 获取最新动态
 * GET /api/dashboard/activities
 */
export async function getRecentActivities(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'UNAUTHORIZED', '未登录', 401);
      return;
    }

    // 获取最近的系统通知作为动态
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { username: true } },
      },
    });

    // 获取最近的审批记录
    const approvals = await prisma.approval.findMany({
      where: {
        OR: [
          { approverId: user.id },
          { application: { applicantId: user.id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        approver: { select: { username: true } },
        application: { select: { title: true, applicantName: true } },
      },
    });

    // 合并并格式化活动
    const activities: Array<{
      id: string;
      user: string;
      action: string;
      target: string;
      timestamp: string;
    }> = [];

    // 添加审批动态
    approvals.forEach((approval) => {
      const actionMap: Record<string, string> = {
        APPROVE: '审批通过了',
        REJECT: '拒绝了',
        PENDING: '转交了',
      };

      activities.push({
        id: `approval-${approval.id}`,
        user: approval.approver.username,
        action: actionMap[approval.action] || '处理了',
        target: approval.application?.title || '申请',
        timestamp: formatTimeAgo(new Date(approval.createdAt)),
      });
    });

    // 添加通知动态
    notifications.forEach((notification) => {
      if (notification.type === NotificationType.SYSTEM) {
        activities.push({
          id: `notification-${notification.id}`,
          user: '系统',
          action: '发送了通知',
          target: notification.title,
          timestamp: formatTimeAgo(new Date(notification.createdAt)),
        });
      } else if (notification.type === NotificationType.TASK) {
        activities.push({
          id: `notification-${notification.id}`,
          user: notification.user?.username || '系统',
          action: '分配了任务',
          target: notification.title,
          timestamp: formatTimeAgo(new Date(notification.createdAt)),
        });
      }
    });

    successResponse(res, { activities: activities.slice(0, 10) });
  } catch (error) {
    logger.error('获取最新动态失败', { error });
    errorResponse(res, 'INTERNAL_ERROR', '获取动态失败');
  }
}

// 格式化时间为相对时间
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}
