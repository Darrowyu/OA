import { Request, Response } from 'express';
import { CalendarEventType } from '@prisma/client';
import * as calendarService from '../services/calendarService';
import logger from '../lib/logger';

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

/**
 * 获取日程列表
 * GET /api/calendar/events
 */
export async function getEvents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { startDate, endDate, types, includePrivate } = req.query;

    // 验证时间参数
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少时间范围参数' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // 验证日期有效性
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, error: '无效的时间格式' });
      return;
    }

    // 解析类型过滤
    const typeFilter = types
      ? (types as string).split(',').filter((t): t is CalendarEventType =>
          Object.values(CalendarEventType).includes(t as CalendarEventType)
        )
      : undefined;

    const events = await calendarService.getEvents(user.id, start, end, {
      types: typeFilter,
      includePrivate: includePrivate === 'true',
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('获取日程列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: '获取日程列表失败' });
  }
}

/**
 * 获取单个日程详情
 * GET /api/calendar/events/:id
 */
export async function getEvent(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { id } = req.params;
    const event = await calendarService.getEventById(id, user.id);

    if (!event) {
      res.status(404).json({ success: false, error: '日程不存在' });
      return;
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    logger.error('获取日程详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: '获取日程详情失败' });
  }
}

/**
 * 创建日程
 * POST /api/calendar/events
 */
export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { title, description, startTime, endTime, location, type, isAllDay, recurrence, attendees, isPrivate, color } = req.body;

    // 验证必填字段
    if (!title?.trim()) {
      res.status(400).json({ success: false, error: '标题不能为空' });
      return;
    }

    if (!startTime || !endTime) {
      res.status(400).json({ success: false, error: '开始时间和结束时间不能为空' });
      return;
    }

    // 验证事件类型
    if (type && !Object.values(CalendarEventType).includes(type)) {
      res.status(400).json({ success: false, error: '无效的日程类型' });
      return;
    }

    const event = await calendarService.createEvent(user.id, {
      title: title.trim(),
      description: description?.trim(),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location: location?.trim(),
      type: type || CalendarEventType.MEETING,
      isAllDay: isAllDay ?? false,
      recurrence: recurrence?.trim(),
      attendees: attendees,
      isPrivate: isPrivate ?? false,
      color: color?.trim(),
    });

    res.status(201).json({
      success: true,
      message: '日程创建成功',
      data: event,
    });
  } catch (error) {
    logger.error('创建日程失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '创建日程失败' });
  }
}

/**
 * 更新日程
 * PUT /api/calendar/events/:id
 */
export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { title, description, startTime, endTime, location, type, isAllDay, recurrence, attendees, isPrivate, color } = req.body;

    // 验证事件类型
    if (type && !Object.values(CalendarEventType).includes(type)) {
      res.status(400).json({ success: false, error: '无效的日程类型' });
      return;
    }

    const event = await calendarService.updateEvent(id, user.id, {
      title: title?.trim(),
      description: description?.trim(),
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      location: location?.trim(),
      type: type,
      isAllDay: isAllDay,
      recurrence: recurrence?.trim(),
      attendees: attendees,
      isPrivate: isPrivate,
      color: color?.trim(),
    });

    res.json({
      success: true,
      message: '日程更新成功',
      data: event,
    });
  } catch (error) {
    logger.error('更新日程失败', { error: error instanceof Error ? error.message : '未知错误' });
    const errorMessage = error instanceof Error ? error.message : '更新日程失败';
    if (errorMessage.includes('不存在')) {
      res.status(404).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
}

/**
 * 删除日程
 * DELETE /api/calendar/events/:id
 */
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { id } = req.params;
    await calendarService.deleteEvent(id, user.id);

    res.json({
      success: true,
      message: '日程删除成功',
    });
  } catch (error) {
    logger.error('删除日程失败', { error: error instanceof Error ? error.message : '未知错误' });
    const errorMessage = error instanceof Error ? error.message : '删除日程失败';
    if (errorMessage.includes('不存在')) {
      res.status(404).json({ success: false, error: errorMessage });
    } else {
      res.status(500).json({ success: false, error: errorMessage });
    }
  }
}

/**
 * 获取团队共享日程
 * GET /api/calendar/shared
 */
export async function getSharedEvents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { userIds, startDate, endDate, types } = req.query;

    if (!userIds || !startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const userIdList = (userIds as string).split(',');
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, error: '无效的时间格式' });
      return;
    }

    // 解析类型过滤
    const typeFilter = types
      ? (types as string).split(',').filter((t): t is CalendarEventType =>
          Object.values(CalendarEventType).includes(t as CalendarEventType)
        )
      : undefined;

    const events = await calendarService.getSharedEvents(userIdList, start, end, {
      types: typeFilter,
      includePrivate: false, // 共享视图不包含私有事件
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('获取共享日程失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: '获取共享日程失败' });
  }
}

/**
 * 获取我参与的日程（会议邀请）
 * GET /api/calendar/attending
 */
export async function getAttendingEvents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少时间范围参数' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, error: '无效的时间格式' });
      return;
    }

    const events = await calendarService.getAttendingEvents(user.id, user.email, start, end);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('获取参与日程失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: '获取参与日程失败' });
  }
}

/**
 * 更新参与者状态
 * POST /api/calendar/events/:id/attendee-status
 */
export async function updateAttendeeStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }

    await calendarService.updateAttendeeStatus(id, user.email, status as calendarService.Attendee['status']);

    res.json({
      success: true,
      message: '状态更新成功',
    });
  } catch (error) {
    logger.error('更新参与者状态失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: '更新参与者状态失败' });
  }
}

/**
 * 获取日程统计
 * GET /api/calendar/statistics
 */
export async function getStatistics(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少时间范围参数' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, error: '无效的时间格式' });
      return;
    }

    const stats = await calendarService.getEventStatistics(user.id, start, end);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取日程统计失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ success: false, error: '获取日程统计失败' });
  }
}
