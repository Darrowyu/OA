import apiClient from '@/lib/api';
import { AnnouncementType } from '@/types';

// 附件类型
export interface Attachment {
  name: string;
  url: string;
  size: number;
}

// 公告数据类型
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetDepts?: string[];
  isTop: boolean;
  validFrom: string;
  validUntil?: string;
  attachments?: Attachment[];
  viewCount: number;
  authorId: string;
  authorName?: string;
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建公告请求
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  type: AnnouncementType;
  targetDepts?: string[];
  isTop?: boolean;
  validFrom: string;
  validUntil?: string;
  attachments?: Attachment[];
}

// 更新公告请求
export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  targetDepts?: string[];
  isTop?: boolean;
  validFrom?: string;
  validUntil?: string | null;
  attachments?: Attachment[];
}

// 查询参数
export interface GetAnnouncementsParams {
  page?: number;
  pageSize?: number;
  type?: AnnouncementType | 'all';
  isTop?: boolean;
  search?: string;
  includeExpired?: boolean;
}

// 分页响应
export interface AnnouncementsResponse {
  success: boolean;
  data: {
    items: Announcement[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// 单个公告响应
export interface AnnouncementResponse {
  success: boolean;
  data: Announcement;
}

// 阅读统计用户
export interface ReadUser {
  id: string;
  name: string;
  department: string;
  readAt: string;
}

export interface UnreadUser {
  id: string;
  name: string;
  department: string;
}

// 阅读统计
export interface ReadStats {
  totalUsers: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
  readUsers: ReadUser[];
  unreadUsers: UnreadUser[];
}

// 统计响应
export interface StatsResponse {
  success: boolean;
  data: ReadStats;
}

// 未读数量响应
export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

// 删除响应
export interface DeleteResponse {
  success: boolean;
  message?: string;
}

// 切换置顶请求
export interface ToggleTopRequest {
  isTop: boolean;
}

// 公告类型标签
export const announcementTypeLabels: Record<AnnouncementType, string> = {
  COMPANY: '公司公告',
  DEPARTMENT: '部门公告',
  SYSTEM: '系统通知',
};

// 公告类型样式
export const announcementTypeStyles: Record<AnnouncementType, string> = {
  COMPANY: 'bg-blue-100 text-blue-700',
  DEPARTMENT: 'bg-green-100 text-green-700',
  SYSTEM: 'bg-purple-100 text-purple-700',
};

// 公告API
export const announcementsApi = {
  // 获取公告列表
  getAnnouncements: (params?: GetAnnouncementsParams): Promise<AnnouncementsResponse> =>
    apiClient.get<AnnouncementsResponse>('/announcements', { params }),

  // 获取公告详情
  getAnnouncement: (id: string): Promise<AnnouncementResponse> =>
    apiClient.get<AnnouncementResponse>(`/announcements/${id}`),

  // 创建公告
  createAnnouncement: (data: CreateAnnouncementRequest): Promise<AnnouncementResponse> =>
    apiClient.post<AnnouncementResponse>('/announcements', data),

  // 更新公告
  updateAnnouncement: (id: string, data: UpdateAnnouncementRequest): Promise<AnnouncementResponse> =>
    apiClient.put<AnnouncementResponse>(`/announcements/${id}`, data),

  // 删除公告
  deleteAnnouncement: (id: string): Promise<DeleteResponse> =>
    apiClient.delete<DeleteResponse>(`/announcements/${id}`),

  // 获取阅读统计
  getReadStats: (id: string): Promise<StatsResponse> =>
    apiClient.get<StatsResponse>(`/announcements/${id}/stats`),

  // 切换置顶状态
  toggleTop: (id: string, isTop: boolean): Promise<AnnouncementResponse> =>
    apiClient.post<AnnouncementResponse>(`/announcements/${id}/toggle-top`, { isTop }),

  // 获取未读数量
  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiClient.get<UnreadCountResponse>('/announcements/unread-count'),
};
