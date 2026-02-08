import apiClient from '@/lib/api';
import { Notification, NotificationType, PaginatedNotifications } from '@/types';

export interface GetNotificationsParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  type?: NotificationType;
}

export interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

export interface MarkReadResponse {
  success: boolean;
  data: Notification;
}

export interface MarkAllReadResponse {
  success: boolean;
  data: { count: number };
}

export interface DeleteNotificationResponse {
  success: boolean;
  message?: string;
}

export interface NotificationDetailResponse {
  success: boolean;
  data: Notification;
}

export const notificationsApi = {
  // 获取通知列表
  getNotifications: (params?: GetNotificationsParams): Promise<{ success: boolean; data: PaginatedNotifications }> =>
    apiClient.get('/notifications', { params }),

  // 获取未读通知数量
  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiClient.get('/notifications/unread-count'),

  // 获取通知详情
  getNotification: (id: string): Promise<NotificationDetailResponse> =>
    apiClient.get(`/notifications/${id}`),

  // 标记通知为已读
  markAsRead: (id: string): Promise<MarkReadResponse> =>
    apiClient.post(`/notifications/${id}/read`),

  // 标记所有通知为已读
  markAllAsRead: (): Promise<MarkAllReadResponse> =>
    apiClient.post('/notifications/mark-all-read'),

  // 删除通知
  deleteNotification: (id: string): Promise<DeleteNotificationResponse> =>
    apiClient.delete(`/notifications/${id}`),

  // 删除所有已读通知
  deleteAllRead: (): Promise<MarkAllReadResponse> =>
    apiClient.delete('/notifications/read'),
};
