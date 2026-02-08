import apiClient from '@/lib/api';

// 日程类型枚举
export enum CalendarEventType {
  MEETING = 'MEETING',
  TASK = 'TASK',
  REMINDER = 'REMINDER',
  LEAVE = 'LEAVE',
  BUSINESS = 'BUSINESS',
  OTHER = 'OTHER',
}

// 参与者状态
export enum AttendeeStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE',
}

// 参与者类型
export interface Attendee {
  userId: string;
  name: string;
  email: string;
  status: AttendeeStatus;
}

// 日程事件类型
export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: CalendarEventType;
  isAllDay: boolean;
  recurrence?: string;
  attendees?: Attendee[];
  isPrivate: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

// 创建日程请求
export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: CalendarEventType;
  isAllDay?: boolean;
  recurrence?: string;
  attendees?: Attendee[];
  isPrivate?: boolean;
  color?: string;
}

// 更新日程请求
export type UpdateEventRequest = Partial<CreateEventRequest>;

// 获取日程参数
export interface GetEventsParams {
  startDate: string;
  endDate: string;
  types?: CalendarEventType[];
  includePrivate?: boolean;
}

// 获取共享日程参数
export interface GetSharedEventsParams {
  userIds: string[];
  startDate: string;
  endDate: string;
  types?: CalendarEventType[];
}

// 日程统计
export interface CalendarStatistics {
  total: number;
  byType: Record<CalendarEventType, number>;
  allDayCount: number;
  withAttendeesCount: number;
}

// API 响应类型
interface CalendarResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 日程 API 服务
 */
export const calendarApi = {
  /**
   * 获取日程列表
   */
  getEvents: (params: GetEventsParams): Promise<CalendarResponse<CalendarEvent[]>> => {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    if (params.types?.length) {
      queryParams.append('types', params.types.join(','));
    }
    if (params.includePrivate) {
      queryParams.append('includePrivate', 'true');
    }

    return apiClient.get<CalendarResponse<CalendarEvent[]>>(`/calendar/events?${queryParams.toString()}`);
  },

  /**
   * 获取单个日程详情
   */
  getEvent: (id: string): Promise<CalendarResponse<CalendarEvent>> => {
    return apiClient.get<CalendarResponse<CalendarEvent>>(`/calendar/events/${id}`);
  },

  /**
   * 创建日程
   */
  createEvent: (data: CreateEventRequest): Promise<CalendarResponse<CalendarEvent>> => {
    return apiClient.post<CalendarResponse<CalendarEvent>>('/calendar/events', data);
  },

  /**
   * 更新日程
   */
  updateEvent: (id: string, data: UpdateEventRequest): Promise<CalendarResponse<CalendarEvent>> => {
    return apiClient.put<CalendarResponse<CalendarEvent>>(`/calendar/events/${id}`, data);
  },

  /**
   * 删除日程
   */
  deleteEvent: (id: string): Promise<CalendarResponse<void>> => {
    return apiClient.delete<CalendarResponse<void>>(`/calendar/events/${id}`);
  },

  /**
   * 获取团队共享日程
   */
  getSharedEvents: (params: GetSharedEventsParams): Promise<CalendarResponse<CalendarEvent[]>> => {
    const queryParams = new URLSearchParams({
      userIds: params.userIds.join(','),
      startDate: params.startDate,
      endDate: params.endDate,
    });

    if (params.types?.length) {
      queryParams.append('types', params.types.join(','));
    }

    return apiClient.get<CalendarResponse<CalendarEvent[]>>(`/calendar/shared?${queryParams.toString()}`);
  },

  /**
   * 获取我参与的日程
   */
  getAttendingEvents: (params: { startDate: string; endDate: string }): Promise<CalendarResponse<CalendarEvent[]>> => {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    return apiClient.get<CalendarResponse<CalendarEvent[]>>(`/calendar/attending?${queryParams.toString()}`);
  },

  /**
   * 更新参与者状态
   */
  updateAttendeeStatus: (eventId: string, status: AttendeeStatus): Promise<CalendarResponse<void>> => {
    return apiClient.post<CalendarResponse<void>>(`/calendar/events/${eventId}/attendee-status`, { status });
  },

  /**
   * 获取日程统计
   */
  getStatistics: (params: { startDate: string; endDate: string }): Promise<CalendarResponse<CalendarStatistics>> => {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    return apiClient.get<CalendarResponse<CalendarStatistics>>(`/calendar/statistics?${queryParams.toString()}`);
  },
};

/**
 * 获取事件类型的显示名称
 */
export function getEventTypeName(type: CalendarEventType): string {
  const typeNames: Record<CalendarEventType, string> = {
    [CalendarEventType.MEETING]: '会议',
    [CalendarEventType.TASK]: '任务',
    [CalendarEventType.REMINDER]: '提醒',
    [CalendarEventType.LEAVE]: '请假',
    [CalendarEventType.BUSINESS]: '出差',
    [CalendarEventType.OTHER]: '其他',
  };
  return typeNames[type] || '其他';
}

/**
 * 获取事件类型的颜色
 */
export function getEventTypeColor(type: CalendarEventType): string {
  const typeColors: Record<CalendarEventType, string> = {
    [CalendarEventType.MEETING]: '#3B82F6', // 蓝色
    [CalendarEventType.TASK]: '#10B981', // 绿色
    [CalendarEventType.REMINDER]: '#F59E0B', // 黄色
    [CalendarEventType.LEAVE]: '#8B5CF6', // 紫色
    [CalendarEventType.BUSINESS]: '#EC4899', // 粉色
    [CalendarEventType.OTHER]: '#6B7280', // 灰色
  };
  return typeColors[type] || '#6B7280';
}

/**
 * 获取参与者状态的显示名称
 */
export function getAttendeeStatusName(status: AttendeeStatus): string {
  const statusNames: Record<AttendeeStatus, string> = {
    [AttendeeStatus.PENDING]: '待确认',
    [AttendeeStatus.ACCEPTED]: '已接受',
    [AttendeeStatus.DECLINED]: '已拒绝',
    [AttendeeStatus.TENTATIVE]: '暂定',
  };
  return statusNames[status] || '待确认';
}
