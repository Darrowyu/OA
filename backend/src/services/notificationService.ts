import { NotificationType, Notification, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as logger from '../lib/logger';
import {
  sendNotificationToUser,
  broadcastNotification,
  updateUnreadCount,
} from './socketService';
import { sendEmailNotification } from './email';

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

// 高金额阈值：10万元
const HIGH_AMOUNT_THRESHOLD = 100000;

/**
 * 高金额申请审批通过通知
 * CEO审批通过后，通知财务人员
 */
export async function notifyHighAmountApproval(
  applicationId: string,
  amount: number,
  applicantName: string
): Promise<void> {
  if (amount < HIGH_AMOUNT_THRESHOLD) return;

  try {
    // 获取财务人员（role为FINANCE或特定用户ID）
    const financeUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'FINANCE' as any },
          { id: 'E10015' }
        ],
        isActive: true
      }
    });

    // 发送系统通知
    for (const user of financeUsers) {
      await createNotification({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: '高金额申请审批通过',
        content: `申请金额 ¥${amount.toLocaleString()} 已审批通过，申请人: ${applicantName}`,
        data: { applicationId, amount }
      });

      // 发送邮件通知
      if (user.email) {
        await sendEmailNotification(
          user.email,
          '高金额申请审批通过通知',
          generateHighAmountEmailContent(applicationId, amount, applicantName),
          applicationId
        );
      }
    }

    // 标记已通知
    await prisma.application.update({
      where: { id: applicationId },
      data: { highAmountNotified: true }
    });

    logger.info(`高金额申请已通知 ${financeUsers.length} 位财务人员`, { applicationId, amount });
  } catch (error) {
    logger.error('高金额通知失败', { error: error instanceof Error ? error.message : String(error), applicationId });
  }
}

/**
 * 生成高金额通知邮件内容
 */
function generateHighAmountEmailContent(
  applicationId: string,
  amount: number,
  applicantName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .amount { color: #dc2626; font-weight: bold; font-size: 18px; }
    .button { display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">高金额申请审批通过通知</h2>
    </div>
    <div class="content">
      <div class="info-row">
        <span class="label">申请编号：</span>${applicationId}
      </div>
      <div class="info-row">
        <span class="label">申请金额：</span><span class="amount">¥${amount.toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="label">申请人：</span>${applicantName}
      </div>
      <div class="info-row" style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px;">
        <strong>提示：</strong>该申请金额超过10万元，请财务部门关注后续付款流程。
      </div>
    </div>
    <div class="footer">
      此邮件由OA系统自动发送，请勿直接回复。
    </div>
  </div>
</body>
</html>
  `;
}
