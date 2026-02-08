import { CalendarEventType, type CalendarEvent, type Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// 参与者类型
export interface Attendee {
  userId: string;
  name: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
}

// 创建日程请求类型
export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  type: CalendarEventType;
  isAllDay?: boolean;
  recurrence?: string;
  attendees?: Attendee[];
  isPrivate?: boolean;
  color?: string;
}

// 更新日程请求类型
export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

// 日程响应类型（包含用户信息）
export interface CalendarEventWithUser extends CalendarEvent {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

/**
 * 创建日程事件
 */
export async function createEvent(
  userId: string,
  data: CreateEventRequest
): Promise<CalendarEvent> {
  try {
    // 验证时间
    if (data.endTime <= data.startTime) {
      throw new Error('结束时间必须晚于开始时间');
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim(),
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location?.trim(),
        type: data.type,
        isAllDay: data.isAllDay ?? false,
        recurrence: data.recurrence,
        attendees: data.attendees as Prisma.InputJsonValue,
        isPrivate: data.isPrivate ?? false,
        color: data.color,
      },
    });

    logger.info('创建日程成功', { eventId: event.id, userId, title: event.title });
    return event;
  } catch (error) {
    logger.error('创建日程失败', { error: error instanceof Error ? error.message : '未知错误', userId });
    throw error;
  }
}

/**
 * 获取用户的日程列表
 */
export async function getEvents(
  userId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    types?: CalendarEventType[];
    includePrivate?: boolean;
  }
): Promise<CalendarEventWithUser[]> {
  try {
    const where: Prisma.CalendarEventWhereInput = {
      userId,
      AND: [
        { startTime: { lte: endDate } },
        { endTime: { gte: startDate } },
      ],
    };

    // 类型过滤
    if (options?.types && options.types.length > 0) {
      where.type = { in: options.types };
    }

    // 隐私过滤（如果不包含私有，则过滤掉私有事件）
    if (!options?.includePrivate) {
      where.isPrivate = false;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return events;
  } catch (error) {
    logger.error('获取日程列表失败', { error: error instanceof Error ? error.message : '未知错误', userId });
    throw error;
  }
}

/**
 * 获取单个日程详情
 */
export async function getEventById(
  eventId: string,
  userId: string
): Promise<CalendarEventWithUser | null> {
  try {
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return event;
  } catch (error) {
    logger.error('获取日程详情失败', { error: error instanceof Error ? error.message : '未知错误', eventId });
    throw error;
  }
}

/**
 * 更新日程事件
 */
export async function updateEvent(
  eventId: string,
  userId: string,
  data: UpdateEventRequest
): Promise<CalendarEvent> {
  try {
    // 验证日程是否存在且属于该用户
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!existingEvent) {
      throw new Error('日程不存在或无权限');
    }

    // 验证时间
    const startTime = data.startTime ?? existingEvent.startTime;
    const endTime = data.endTime ?? existingEvent.endTime;
    if (endTime <= startTime) {
      throw new Error('结束时间必须晚于开始时间');
    }

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: data.title?.trim(),
        description: data.description?.trim(),
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location?.trim(),
        type: data.type,
        isAllDay: data.isAllDay,
        recurrence: data.recurrence,
        attendees: data.attendees as Prisma.InputJsonValue,
        isPrivate: data.isPrivate,
        color: data.color,
      },
    });

    logger.info('更新日程成功', { eventId, userId });
    return event;
  } catch (error) {
    logger.error('更新日程失败', { error: error instanceof Error ? error.message : '未知错误', eventId });
    throw error;
  }
}

/**
 * 删除日程事件
 */
export async function deleteEvent(eventId: string, userId: string): Promise<void> {
  try {
    // 验证日程是否存在且属于该用户
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!existingEvent) {
      throw new Error('日程不存在或无权限');
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    logger.info('删除日程成功', { eventId, userId });
  } catch (error) {
    logger.error('删除日程失败', { error: error instanceof Error ? error.message : '未知错误', eventId });
    throw error;
  }
}

/**
 * 获取多个用户的共享日程（团队视图）
 */
export async function getSharedEvents(
  userIds: string[],
  startDate: Date,
  endDate: Date,
  options?: {
    types?: CalendarEventType[];
    includePrivate?: boolean;
  }
): Promise<CalendarEventWithUser[]> {
  try {
    const where: Prisma.CalendarEventWhereInput = {
      userId: { in: userIds },
      AND: [
        { startTime: { lte: endDate } },
        { endTime: { gte: startDate } },
      ],
    };

    // 类型过滤
    if (options?.types && options.types.length > 0) {
      where.type = { in: options.types };
    }

    // 隐私过滤
    if (!options?.includePrivate) {
      where.isPrivate = false;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return events;
  } catch (error) {
    logger.error('获取共享日程失败', { error: error instanceof Error ? error.message : '未知错误', userIds });
    throw error;
  }
}

/**
 * 获取用户作为参与者的日程（会议邀请）
 */
export async function getAttendingEvents(
  userId: string,
  userEmail: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEventWithUser[]> {
  try {
    // 查找用户作为参与者的日程
    const events = await prisma.calendarEvent.findMany({
      where: {
        AND: [
          { startTime: { lte: endDate } },
          { endTime: { gte: startDate } },
        ],
        attendees: {
          path: '$[*].email',
          array_contains: userEmail,
        },
      },
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return events;
  } catch (error) {
    logger.error('获取参与日程失败', { error: error instanceof Error ? error.message : '未知错误', userId });
    throw error;
  }
}

/**
 * 更新参与者的状态
 */
export async function updateAttendeeStatus(
  eventId: string,
  userEmail: string,
  status: Attendee['status']
): Promise<void> {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('日程不存在');
    }

    const attendees = (event.attendees as Attendee[] | null) ?? [];
    const updatedAttendees = attendees.map((attendee) =>
      attendee.email === userEmail ? { ...attendee, status } : attendee
    );

    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        attendees: updatedAttendees as Prisma.InputJsonValue,
      },
    });

    logger.info('更新参与者状态成功', { eventId, userEmail, status });
  } catch (error) {
    logger.error('更新参与者状态失败', { error: error instanceof Error ? error.message : '未知错误', eventId });
    throw error;
  }
}

/**
 * 获取用户的日程统计
 */
export async function getEventStatistics(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  total: number;
  byType: Record<CalendarEventType, number>;
  allDayCount: number;
  withAttendeesCount: number;
}> {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        AND: [
          { startTime: { lte: endDate } },
          { endTime: { gte: startDate } },
        ],
      },
      select: {
        type: true,
        isAllDay: true,
        attendees: true,
      },
    });

    const byType = {} as Record<CalendarEventType, number>;
    let allDayCount = 0;
    let withAttendeesCount = 0;

    for (const event of events) {
      // 按类型统计
      byType[event.type] = (byType[event.type] ?? 0) + 1;

      // 全天事件统计
      if (event.isAllDay) {
        allDayCount++;
      }

      // 有参与者的事件统计
      const attendees = event.attendees as Attendee[] | null;
      if (attendees && attendees.length > 0) {
        withAttendeesCount++;
      }
    }

    return {
      total: events.length,
      byType,
      allDayCount,
      withAttendeesCount,
    };
  } catch (error) {
    logger.error('获取日程统计失败', { error: error instanceof Error ? error.message : '未知错误', userId });
    throw error;
  }
}
