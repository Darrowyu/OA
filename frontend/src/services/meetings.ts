import apiClient from '@/lib/api';

// ==================== 类型定义 ====================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

// 会议室类型
export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  facilities: string[] | null;
  image: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { meetings: number };
}

export interface MeetingRoomInput {
  name: string;
  capacity: number;
  location?: string;
  facilities?: string[];
  image?: string;
  description?: string;
}

// 参会者类型
export interface Attendee {
  userId: string;
  name: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

// 会议状态
export type MeetingStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

// 会议类型
export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  roomId: string | null;
  room: {
    id: string;
    name: string;
    capacity: number;
    location: string | null;
  } | null;
  startTime: string;
  endTime: string;
  organizerId: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  attendees: Attendee[] | null;
  status: MeetingStatus;
  minutes: string | null;
  attachments: Array<{ name: string; url: string; size: number }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingInput {
  title: string;
  description?: string;
  roomId?: string;
  startTime: string;
  endTime: string;
  attendees?: Attendee[];
}

export interface MeetingListItem {
  id: string;
  title: string;
  description: string | null;
  roomId: string | null;
  room: { name: string } | null;
  startTime: string;
  endTime: string;
  organizerId: string;
  organizer: { name: string };
  attendees: Attendee[] | null;
  status: MeetingStatus;
  createdAt: string;
}

// 会议室预订信息
export interface RoomBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  organizer: { name: string };
}

// ==================== API 服务 ====================

export const meetingApi = {
  // ========== 会议室管理 ==========

  // 获取会议室列表
  getRooms: (params?: PaginationParams & { minCapacity?: number; facilities?: string[]; isActive?: boolean }) =>
    apiClient.get<PaginatedResponse<MeetingRoom>>('/meetings/rooms', { params }),

  // 获取所有可用会议室（不分页）
  getAllRooms: () =>
    apiClient.get<{ success: boolean; data: MeetingRoom[] }>('/meetings/rooms/all'),

  // 获取会议室详情
  getRoomById: (id: string) =>
    apiClient.get<{ success: boolean; data: MeetingRoom }>(`/meetings/rooms/${id}`),

  // 创建会议室（仅管理员）
  createRoom: (data: MeetingRoomInput) =>
    apiClient.post<{ success: boolean; message: string; data: MeetingRoom }>('/meetings/rooms', data),

  // 更新会议室（仅管理员）
  updateRoom: (id: string, data: Partial<MeetingRoomInput>) =>
    apiClient.put<{ success: boolean; message: string; data: MeetingRoom }>(`/meetings/rooms/${id}`, data),

  // 删除会议室（仅管理员）
  deleteRoom: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/meetings/rooms/${id}`),

  // 检查会议室可用性
  checkRoomAvailability: (id: string, startTime: string, endTime: string, excludeMeetingId?: string) =>
    apiClient.get<{ success: boolean; data: { isAvailable: boolean } }>(`/meetings/rooms/${id}/availability`, {
      params: { startTime, endTime, excludeMeetingId },
    }),

  // 获取会议室某天的预订情况
  getRoomBookings: (id: string, date: string) =>
    apiClient.get<{ success: boolean; data: RoomBooking[] }>(`/meetings/rooms/${id}/bookings`, {
      params: { date },
    }),

  // ========== 会议管理 ==========

  // 获取会议列表
  getMeetings: (params?: PaginationParams & {
    startDate?: string;
    endDate?: string;
    status?: MeetingStatus;
    roomId?: string;
    type?: 'organized' | 'attending';
  }) =>
    apiClient.get<PaginatedResponse<MeetingListItem>>('/meetings', { params }),

  // 获取会议详情
  getMeetingById: (id: string) =>
    apiClient.get<{ success: boolean; data: Meeting }>(`/meetings/${id}`),

  // 创建会议
  createMeeting: (data: MeetingInput) =>
    apiClient.post<{ success: boolean; message: string; data: Meeting }>('/meetings', data),

  // 更新会议
  updateMeeting: (id: string, data: Partial<MeetingInput>) =>
    apiClient.put<{ success: boolean; message: string; data: Meeting }>(`/meetings/${id}`, data),

  // 取消会议
  cancelMeeting: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/meetings/${id}/cancel`),

  // 完成会议
  completeMeeting: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/meetings/${id}/complete`),

  // 更新会议纪要
  updateMinutes: (id: string, minutes: string) =>
    apiClient.put<{ success: boolean; message: string }>(`/meetings/${id}/minutes`, { minutes }),

  // 更新参会状态
  updateAttendeeStatus: (id: string, status: 'PENDING' | 'ACCEPTED' | 'DECLINED') =>
    apiClient.put<{ success: boolean; message: string }>(`/meetings/${id}/attendee-status`, { status }),
};

// ==================== 工具函数 ====================

// 获取会议状态文本
export function getMeetingStatusText(status: MeetingStatus): string {
  const statusMap: Record<MeetingStatus, string> = {
    SCHEDULED: '已预定',
    ONGOING: '进行中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };
  return statusMap[status] || status;
}

// 获取会议状态颜色
export function getMeetingStatusColor(status: MeetingStatus): string {
  const colorMap: Record<MeetingStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    ONGOING: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-700';
}

// 获取参会状态文本
export function getAttendeeStatusText(status: Attendee['status']): string {
  const statusMap: Record<Attendee['status'], string> = {
    PENDING: '待确认',
    ACCEPTED: '已接受',
    DECLINED: '已拒绝',
  };
  return statusMap[status] || status;
}

// 格式化会议时间
export function formatMeetingTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();
  const isToday = start.toDateString() === now.toDateString();
  const isSameDay = start.toDateString() === end.toDateString();

  const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

  if (isToday) {
    return `今天 ${timeStr}`;
  }

  if (isSameDay) {
    return `${start.getMonth() + 1}月${start.getDate()}日 ${timeStr}`;
  }

  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
}

// 格式化持续时间
export function formatDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}分钟`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (mins === 0) {
    return `${hours}小时`;
  }

  return `${hours}小时${mins}分钟`;
}

// 设施图标映射
export const facilityIcons: Record<string, string> = {
  projector: '📽️',
  whiteboard: '📝',
  video: '📹',
  microphone: '🎤',
  speaker: '🔊',
  wifi: '📶',
  tv: '📺',
  phone: '☎️',
  coffee: '☕',
  water: '💧',
  aircon: '❄️',
};

// 设施名称映射
export const facilityNames: Record<string, string> = {
  projector: '投影仪',
  whiteboard: '白板',
  video: '视频会议',
  microphone: '麦克风',
  speaker: '音响',
  wifi: '无线网络',
  tv: '电视',
  phone: '电话',
  coffee: '咖啡机',
  water: '饮水机',
  aircon: '空调',
};
