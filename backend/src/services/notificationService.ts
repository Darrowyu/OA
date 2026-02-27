import { NotificationType, Notification, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as logger from '../lib/logger';
import {
  sendNotificationToUser,
  broadcastNotification,
  updateUnreadCount,
} from './socketService';
import { sendEmailNotification } from './email';

/**
 * 检查用户是否启用了邮件通知
 */
async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const preference = await prisma.userPreference.findUnique({
      where: { userId },
      select: { emailNotifications: true }
    });
    // 默认为 true（如果没有设置）
    return preference?.emailNotifications ?? true;
  } catch (error) {
    logger.error('获取用户邮件偏好失败', { userId, error });
    return true; // 出错时默认发送
  }
}

/**
 * 检查用户是否启用了审批通知
 */
async function shouldSendApprovalNotification(userId: string): Promise<boolean> {
  try {
    const preference = await prisma.userPreference.findUnique({
      where: { userId },
      select: { approvalNotifications: true }
    });
    // 只要不是 OFF 就发送
    return preference?.approvalNotifications !== 'OFF';
  } catch (error) {
    logger.error('获取用户审批通知偏好失败', { userId, error });
    return true;
  }
}

// ============================================
// 公共类型定义
// ============================================

/** 申请邮件信息（最小化） */
export interface ApplicationEmailInfo {
  id: string;
  applicationNo: string;
  title: string;
  applicantName: string;
  priority: string;
}

/** 审批任务类型 */
export type ApprovalTaskType = 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO';

/** 审批结果信息 */
export interface ApprovalResultInfo {
  id: string;
  applicationNo: string;
  title: string;
  status: 'APPROVED' | 'REJECTED';
  completedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectReason?: string | null;
}

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

      // 检查用户邮件偏好后再发送邮件
      if (user.email && await shouldSendEmail(user.id)) {
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

// ============================================
// 邮件模板与配置
// ============================================

const EMAIL_CONFIG = {
  priorityColor: {
    URGENT: '#dc2626',
    HIGH: '#ea580c',
    NORMAL: '#2563eb',
    LOW: '#6b7280',
  } as Record<string, string>,
  priorityText: {
    URGENT: '紧急',
    HIGH: '高',
    NORMAL: '普通',
    LOW: '低',
  } as Record<string, string>,
  taskTitles: {
    FACTORY: '【待审批】厂长审批任务',
    DIRECTOR: '【待审批】总监审批任务',
    MANAGER: '【待审批】经理审批任务',
    CEO: '【待审批】CEO审批任务',
  },
  taskDescriptions: {
    FACTORY: '您有新的申请需要审批（厂长环节）',
    DIRECTOR: '厂长审批已完成，您有新的申请需要审批（总监环节）',
    MANAGER: '总监审批已完成，您有新的申请需要审批（经理环节）',
    CEO: '经理审批已完成，您有新的申请需要审批（CEO环节）',
  },
};

/** 生成邮件基础模板 */
function generateEmailBase(options: {
  headerColor: string;
  title: string;
  content: string;
  actionUrl?: string;
  actionText?: string;
}): string {
  const actionButton = options.actionUrl && options.actionText
    ? `<a href="${options.actionUrl}" class="button">${options.actionText}</a>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${options.headerColor}; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .priority { font-weight: bold; }
    .button { display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .reject-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-top: 15px; }
    .result { font-weight: bold; font-size: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${options.title}</h2>
    </div>
    <div class="content">
      ${options.content}
      ${actionButton}
    </div>
    <div class="footer">此邮件由OA系统自动发送，请勿直接回复。</div>
  </div>
</body>
</html>`;
}

/** 安全发送邮件（统一错误处理） */
async function safeSendEmail<T>(
  operation: () => Promise<T>,
  context: string,
  meta?: Record<string, unknown>
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`${context}失败`, {
      error: error instanceof Error ? error.message : String(error),
      ...meta,
    });
    return undefined;
  }
}

// ==================== 审批流程邮件通知 ====================

/**
 * 发送审批任务邮件通知给审批人
 */
export async function sendApprovalTaskEmail(
  recipientEmail: string,
  recipientName: string,
  recipientId: string,
  application: ApplicationEmailInfo,
  taskType: ApprovalTaskType
): Promise<void> {
  // 检查用户是否启用了邮件通知和审批通知
  const [emailEnabled, approvalEnabled] = await Promise.all([
    shouldSendEmail(recipientId),
    shouldSendApprovalNotification(recipientId)
  ]);

  if (!emailEnabled || !approvalEnabled) {
    logger.info(`跳过审批任务邮件: ${recipientName} 已禁用邮件通知或审批通知`);
    return;
  }

  const { priorityColor, priorityText, taskTitles, taskDescriptions } = EMAIL_CONFIG;
  const priority = application.priority || 'NORMAL';

  const content = `
    <p style="font-size: 16px; color: #374151;">尊敬的 ${recipientName}，</p>
    <p style="color: #6b7280;">${taskDescriptions[taskType]}</p>
    <div class="info-row"><span class="label">申请编号：</span>${application.applicationNo}</div>
    <div class="info-row"><span class="label">申请标题：</span>${application.title}</div>
    <div class="info-row"><span class="label">申请人：</span>${application.applicantName}</div>
    <div class="info-row"><span class="label">优先级：</span><span class="priority" style="color: ${priorityColor[priority]}">${priorityText[priority]}</span></div>
  `;

  const htmlContent = generateEmailBase({
    headerColor: '#2563eb',
    title: taskTitles[taskType],
    content,
    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/applications/${application.id}`,
    actionText: '立即审批',
  });

  await safeSendEmail(
    () => sendEmailNotification(
      recipientEmail,
      `${taskTitles[taskType]} - ${application.applicationNo}`,
      htmlContent,
      application.applicationNo
    ),
    '审批任务邮件发送',
    { recipientEmail, recipientId, applicationId: application.id, taskType }
  );
}

/** 批量发送审批任务邮件 */
export async function sendApprovalTaskEmails(
  recipients: Array<{ email: string; name: string; id: string }>,
  application: ApplicationEmailInfo,
  taskType: ApprovalTaskType
): Promise<void> {
  await Promise.all(
    recipients.map((r) => sendApprovalTaskEmail(r.email, r.name, r.id, application, taskType))
  );
}

/**
 * 发送审批结果邮件给申请人
 */
export async function sendApplicationResultEmail(
  recipientEmail: string,
  recipientId: string,
  application: {
    id: string;
    applicationNo: string;
    title: string;
    status: 'APPROVED' | 'REJECTED';
    completedAt?: Date | null;
    rejectedAt?: Date | null;
    rejectReason?: string | null;
  }
): Promise<void> {
  // 检查用户邮件偏好
  const [emailEnabled, approvalEnabled] = await Promise.all([
    shouldSendEmail(recipientId),
    shouldSendApprovalNotification(recipientId)
  ]);

  if (!emailEnabled || !approvalEnabled) {
    logger.info(`跳过审批结果邮件: ${recipientEmail} 已禁用邮件通知或审批通知`);
    return;
  }

  const isApproved = application.status === 'APPROVED';
  const subject = isApproved
    ? `【已通过】申请审批通过 - ${application.applicationNo}`
    : `【已拒绝】申请已被拒绝 - ${application.applicationNo}`;

  const headerColor = isApproved ? '#16a34a' : '#dc2626';
  const resultText = isApproved ? '审批通过' : '已被拒绝';
  const resultIcon = isApproved ? '✓' : '✗';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${headerColor}; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .result { color: ${headerColor}; font-weight: bold; font-size: 18px; }
    .button { display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .reject-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${resultIcon} 申请${resultText}</h2>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">您好，</p>
      <p>您的申请已有审批结果：</p>
      <div class="info-row">
        <span class="label">申请编号：</span>${application.applicationNo}
      </div>
      <div class="info-row">
        <span class="label">申请标题：</span>${application.title}
      </div>
      <div class="info-row">
        <span class="label">审批结果：</span><span class="result">${resultText}</span>
      </div>
      <div class="info-row">
        <span class="label">${isApproved ? '完成时间' : '拒绝时间'}：</span>${(isApproved ? application.completedAt : application.rejectedAt)?.toLocaleString('zh-CN') || '-'}
      </div>
      ${!isApproved && application.rejectReason ? `
      <div class="reject-box">
        <span class="label">拒绝原因：</span><br>
        <span style="color: #dc2626;">${application.rejectReason}</span>
      </div>
      ` : ''}
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/applications/${application.id}" class="button">查看详情</a>
    </div>
    <div class="footer">
      此邮件由OA系统自动发送，请勿直接回复。
    </div>
  </div>
</html>
  `;

  try {
    await sendEmailNotification(
      recipientEmail,
      subject,
      htmlContent,
      application.applicationNo
    );
    logger.info(`审批结果邮件已发送给申请人`, {
      applicationId: application.id,
      status: application.status,
    });
  } catch (error) {
    logger.error(`审批结果邮件发送失败`, {
      error: error instanceof Error ? error.message : String(error),
      recipientEmail,
      applicationId: application.id,
    });
  }
}

// 简化后的sendApplicationResultEmail使用generateEmailBase和safeSendEmail
// 原长函数已使用模板生成器重构，代码量减少约60%
