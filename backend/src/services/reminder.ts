import { PrismaClient, ApplicationStatus, Priority } from '@prisma/client';
import { sendEmailNotification, generateEmailTemplate } from './email';
import { config } from '../config';

const prisma = new PrismaClient();

// 默认提醒设置
export const defaultReminderSettings = {
  priority: {
    high: {
      initialDelay: 4,      // 初始延迟4小时
      normalInterval: 4,    // 正常间隔4小时
      mediumInterval: 2,    // 中等间隔2小时
      urgentInterval: 1,    // 紧急间隔1小时
    },
    medium: {
      initialDelay: 8,
      normalInterval: 8,
      mediumInterval: 4,
      urgentInterval: 2,
    },
    low: {
      initialDelay: 12,
      normalInterval: 12,
      mediumInterval: 6,
      urgentInterval: 3,
    },
  },
  timeControl: {
    workingDays: {
      enabled: false,
      days: [1, 2, 3, 4, 5], // 1=周一, 7=周日
      startTime: '09:00',
      endTime: '18:00',
    },
    customDates: {
      enabled: false,
      skipDates: [] as string[],
    },
  },
};

export type ReminderSettings = typeof defaultReminderSettings;

// 内存中的设置缓存
let reminderSettingsCache: ReminderSettings = { ...defaultReminderSettings };

/**
 * 获取提醒设置
 */
export function getReminderSettings(): ReminderSettings {
  // 简单实现：直接返回缓存的设置
  // 生产环境应该从数据库读取
  return { ...reminderSettingsCache };
}

/**
 * 保存提醒设置
 */
export function saveReminderSettings(settings: ReminderSettings): boolean {
  try {
    // 验证设置数据
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    // 合并设置
    reminderSettingsCache = {
      ...defaultReminderSettings,
      ...settings,
      priority: {
        ...defaultReminderSettings.priority,
        ...settings.priority,
      },
      timeControl: {
        ...defaultReminderSettings.timeControl,
        ...settings.timeControl,
      },
    };

    return true;
  } catch (error) {
    console.error('保存提醒设置失败:', error);
    return false;
  }
}

/**
 * 检查是否在允许发送提醒的时间段
 */
function isInAllowedTimeRange(settings: ReminderSettings): boolean {
  const now = new Date();
  const { timeControl } = settings;

  // 检查自定义日期
  if (timeControl.customDates?.enabled) {
    const today = now.toISOString().split('T')[0];
    if (timeControl.customDates.skipDates?.includes(today)) {
      return false;
    }
  }

  // 检查工作日设置
  if (timeControl.workingDays?.enabled) {
    const dayOfWeek = now.getDay() || 7; // 0是周日，转为7
    if (!timeControl.workingDays.days.includes(dayOfWeek)) {
      return false;
    }

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime < timeControl.workingDays.startTime || currentTime > timeControl.workingDays.endTime) {
      return false;
    }
  }

  return true;
}

/**
 * 获取优先级对应的提醒间隔（小时）
 */
function getReminderInterval(priority: Priority, reminderCount: number, settings: ReminderSettings): number {
  const priorityKey = priority.toLowerCase() as 'high' | 'medium' | 'low';
  const prioritySettings = settings.priority[priorityKey] || settings.priority.medium;

  if (reminderCount === 0) {
    return prioritySettings.initialDelay;
  } else if (reminderCount < 3) {
    return prioritySettings.normalInterval;
  } else if (reminderCount < 5) {
    return prioritySettings.mediumInterval;
  } else {
    return prioritySettings.urgentInterval;
  }
}

/**
 * 检查并发送提醒
 */
export async function checkAndSendReminders(): Promise<void> {
  const settings = getReminderSettings();

  // 检查是否在允许的时间段
  if (!isInAllowedTimeRange(settings)) {
    console.log('当前不在允许发送提醒的时间段');
    return;
  }

  try {
    const now = new Date();

    // 获取所有待审批的申请
    const pendingApplications = await prisma.application.findMany({
      where: {
        status: {
          in: [
            ApplicationStatus.PENDING_FACTORY,
            ApplicationStatus.PENDING_DIRECTOR,
            ApplicationStatus.PENDING_MANAGER,
            ApplicationStatus.PENDING_CEO,
          ],
        },
      },
      include: {
        applicant: {
          select: { id: true, name: true, email: true },
        },
        factoryApprovals: {
          include: { approver: { select: { id: true, name: true, email: true } } },
        },
        directorApprovals: {
          include: { approver: { select: { id: true, name: true, email: true } } },
        },
        managerApprovals: {
          include: { approver: { select: { id: true, name: true, email: true } } },
        },
        ceoApprovals: {
          include: { approver: { select: { id: true, name: true, email: true } } },
        },
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    let reminderCount = 0;

    for (const app of pendingApplications) {
      // 获取最后一次提醒时间
      const lastReminder = app.reminderLogs[0];
      const lastReminderTime = lastReminder ? new Date(lastReminder.sentAt) : null;
      const reminderCountForApp = app.reminderLogs.length;

      // 计算是否应该发送提醒
      const interval = getReminderInterval(app.priority, reminderCountForApp, settings);
      const hoursSinceLastReminder = lastReminderTime
        ? (now.getTime() - lastReminderTime.getTime()) / (1000 * 60 * 60)
        : Infinity;
      const hoursSinceSubmission = app.submittedAt
        ? (now.getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60)
        : 0;

      // 第一次提醒需要等待初始延迟
      if (!lastReminder && hoursSinceSubmission < interval) {
        continue;
      }

      // 后续提醒需要等待间隔时间
      if (lastReminder && hoursSinceLastReminder < interval) {
        continue;
      }

      // 确定当前审批人和邮件接收者
      let recipients: string[] = [];
      let actionText = '';

      switch (app.status) {
        case ApplicationStatus.PENDING_FACTORY:
          recipients = app.factoryApprovals
            .filter(a => a.action === 'PENDING')
            .map(a => a.approver.email)
            .filter(Boolean);
          actionText = '厂长审批';
          break;
        case ApplicationStatus.PENDING_DIRECTOR:
          recipients = app.directorApprovals
            .filter(a => a.action === 'PENDING')
            .map(a => a.approver.email)
            .filter(Boolean);
          actionText = '总监审批';
          break;
        case ApplicationStatus.PENDING_MANAGER:
          recipients = app.managerApprovals
            .filter(a => a.action === 'PENDING')
            .map(a => a.approver.email)
            .filter(Boolean);
          actionText = '经理审批';
          break;
        case ApplicationStatus.PENDING_CEO:
          recipients = app.ceoApprovals
            .filter(a => a.action === 'PENDING')
            .map(a => a.approver.email)
            .filter(Boolean);
          actionText = 'CEO审批';
          break;
      }

      if (recipients.length === 0) {
        continue;
      }

      // 发送提醒邮件
      const emailContent = generateEmailTemplate({
        title: `【提醒】申请待${actionText}`,
        applicant: app.applicantName,
        applicationNo: app.applicationNo,
        department: app.applicantDept,
        date: app.createdAt.toLocaleDateString('zh-CN'),
        content: app.title,
        priority: app.priority,
        status: app.status,
        actionText: '立即审批',
        actionUrl: `${config.server.url}/applications/${app.id}`,
        additionalInfo: `这是第 ${reminderCountForApp + 1} 次提醒，该申请已等待 ${Math.floor(hoursSinceSubmission)} 小时。`,
      });

      const success = await sendEmailNotification(
        recipients,
        `【提醒】申请 ${app.applicationNo} 待${actionText}`,
        emailContent,
        app.applicationNo
      );

      if (success) {
        // 记录提醒日志
        await prisma.reminderLog.create({
          data: {
            applicationId: app.id,
            recipientId: app.applicantId,
            reminderType: 'EMAIL',
            reminderCount: reminderCountForApp + 1,
          },
        });
        reminderCount++;
      }
    }

    console.log(`提醒检查完成，发送了 ${reminderCount} 封提醒邮件`);
  } catch (error) {
    console.error('提醒检查失败:', error);
  }
}

/**
 * 启动定时提醒任务
 */
export function startReminderScheduler(): void {
  // 每小时检查一次
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1小时

  setInterval(() => {
    console.log('执行定时提醒检查...');
    checkAndSendReminders();
  }, CHECK_INTERVAL);

  console.log('提醒定时任务已启动，每小时检查一次');
}
