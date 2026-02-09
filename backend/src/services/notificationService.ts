import { NotificationType, Notification, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as logger from '../lib/logger';
import {
  sendNotificationToUser,
  broadcastNotification,
  updateUnreadCount,
} from './socketService';

// 创建通知数据类型
export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
}

// 获取通知选项
export interface GetNotificationsOptions {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  type?: NotificationType;
}

// 分页响应类型
export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 创建通知并实时推送
 */
export async function createNotification(
  data: CreateNotificationData
): Promise<Notification> {
  // 创建数据库记录
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      data: data.data as Prisma.InputJsonValue,
    },
  });

  // 实时推送给用户
  await sendNotificationToUser(data.userId, notification);

  // 更新未读数量
  const unreadCount = await getUnreadCount(data.userId);
  await updateUnreadCount(data.userId, unreadCount);

  logger.info(`通知创建成功: ${notification.id}`);
  return notification;
}

/**
 * 批量创建通知
 */
export async function createNotifications(
  data: CreateNotificationData[]
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  for (const item of data) {
    const notification = await createNotification(item);
    notifications.push(notification);
  }

  return notifications;
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(
  userId: string,
  options: GetNotificationsOptions = {}
): Promise<PaginatedNotifications> {
  const { page = 1, pageSize = 20, isRead, type } = options;

  // 构建查询条件
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(isRead !== undefined && { isRead }),
    ...(type && { type }),
  };

  // 查询总数
  const total = await prisma.notification.count({ where });

  // 查询数据
  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * 标记通知为已读
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  // 验证通知所有权
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    return null;
  }

  // 更新为已读
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  // 更新未读数量
  const unreadCount = await getUnreadCount(userId);
  await updateUnreadCount(userId, unreadCount);

  return updated;
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  // 更新未读数量
  await updateUnreadCount(userId, 0);

  logger.info(`用户 ${userId} 标记 ${result.count} 条通知为已读`);
  return result.count;
}

/**
 * 删除通知
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  // 验证通知所有权
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    return false;
  }

  // 删除通知
  await prisma.notification.delete({
    where: { id: notificationId },
  });

  // 如果删除的是未读通知，更新未读数量
  if (!notification.isRead) {
    const unreadCount = await getUnreadCount(userId);
    await updateUnreadCount(userId, unreadCount);
  }

  return true;
}

/**
 * 删除所有已读通知
 */
export async function deleteAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      isRead: true,
    },
  });

  logger.info(`用户 ${userId} 删除 ${result.count} 条已读通知`);
  return result.count;
}

/**
 * 发送系统广播通知
 */
export async function sendSystemBroadcast(
  title: string,
  content: string,
  data?: Record<string, unknown>
): Promise<number> {
  // 创建广播通知记录 (存储在系统中，userId 为系统ID)
  const notification = await prisma.notification.create({
    data: {
      userId: 'system',
      type: NotificationType.SYSTEM,
      title,
      content,
      data: data as Prisma.InputJsonValue,
    },
  });

  // 广播给所有在线用户
  const onlineCount = await broadcastNotification(notification);

  logger.info(`系统广播发送成功: ${title}, 在线用户数: ${onlineCount}`);
  return onlineCount;
}

/**
 * 发送审批流程通知
 */
export async function sendApprovalNotification(
  userId: string,
  applicationId: string,
  applicationNo: string,
  title: string,
  action: 'submit' | 'approve' | 'reject' | 'transfer'
): Promise<Notification> {
  const actionText = {
    submit: '提交了新审批',
    approve: '审批已通过',
    reject: '审批被驳回',
    transfer: '审批已转交',
  }[action];

  return createNotification({
    userId,
    type: NotificationType.APPROVAL,
    title: `审批通知: ${title}`,
    content: `申请单号 ${applicationNo} ${actionText}`,
    data: {
      applicationId,
      applicationNo,
      action,
    },
  });
}

/**
 * 获取通知详情
 */
export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });
}
