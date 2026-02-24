import { configService } from './config.service';
import logger from '../lib/logger';

/**
 * 任务配置服务
 * 封装从系统配置读取任务相关配置的接口
 */

export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskDefaults {
  /** 默认优先级 */
  defaultPriority: TaskPriority;
  /** 任务提醒时间（截止前小时数） */
  reminderBeforeHours: number;
}

/**
 * 获取任务默认配置
 */
export async function getTaskDefaults(): Promise<TaskDefaults> {
  try {
    const [defaultPriority, reminderBeforeHours] = await Promise.all([
      configService.getValue<TaskPriority>('task.defaultPriority', 'medium'),
      configService.getValue<number>('task.reminderBeforeHours', 24),
    ]);

    return {
      defaultPriority: defaultPriority ?? 'medium',
      reminderBeforeHours: reminderBeforeHours ?? 24,
    };
  } catch (error) {
    logger.error('获取任务默认配置失败', { error });
    // 返回默认值
    return {
      defaultPriority: 'medium',
      reminderBeforeHours: 24,
    };
  }
}

/**
 * 获取默认任务优先级
 */
export async function getDefaultPriority(): Promise<TaskPriority> {
  try {
    const value = await configService.getValue<TaskPriority>('task.defaultPriority', 'medium');
    return value ?? 'medium';
  } catch (error) {
    logger.error('获取默认任务优先级失败', { error });
    return 'medium';
  }
}

/**
 * 获取任务提醒时间（截止前小时数）
 */
export async function getReminderBeforeHours(): Promise<number> {
  try {
    const value = await configService.getValue<number>('task.reminderBeforeHours', 24);
    return value ?? 24;
  } catch (error) {
    logger.error('获取任务提醒时间失败', { error });
    return 24;
  }
}

/**
 * 计算任务提醒时间
 * @param dueDate 任务截止日期
 */
export async function calculateReminderTime(dueDate: Date): Promise<Date> {
  const hours = await getReminderBeforeHours();
  const reminderTime = new Date(dueDate);
  reminderTime.setHours(reminderTime.getHours() - hours);
  return reminderTime;
}

/**
 * 检查是否需要发送提醒
 * @param dueDate 任务截止日期
 * @param lastReminderTime 上次提醒时间（可选）
 */
export async function shouldSendReminder(
  dueDate: Date,
  lastReminderTime?: Date | null
): Promise<boolean> {
  const reminderTime = await calculateReminderTime(dueDate);
  const now = new Date();

  // 如果已经过了提醒时间
  if (now < reminderTime) {
    return false;
  }

  // 如果已经发送过提醒，且距离上次提醒不到24小时，不再发送
  if (lastReminderTime) {
    const hoursSinceLastReminder = (now.getTime() - lastReminderTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastReminder < 24) {
      return false;
    }
  }

  return true;
}

/**
 * 获取优先级显示名称
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority] || '中';
}

/**
 * 获取优先级颜色
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    high: '#EF4444', // red-500
    medium: '#F59E0B', // amber-500
    low: '#10B981', // emerald-500
  };
  return colors[priority] || '#F59E0B';
}
