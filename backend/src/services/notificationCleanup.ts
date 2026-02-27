import { prisma } from '../lib/prisma';
import * as logger from '../lib/logger';

// 默认清理配置
const CLEANUP_CONFIG = {
  // 已读通知保留天数
  READ_NOTIFICATION_RETENTION_DAYS: parseInt(process.env.READ_NOTIFICATION_RETENTION_DAYS || '30', 10),
  // 未读系统广播通知保留天数
  UNREAD_BROADCAST_RETENTION_DAYS: parseInt(process.env.UNREAD_BROADCAST_RETENTION_DAYS || '90', 10),
  // 清理执行时间（小时，24小时制）
  CLEANUP_HOUR: parseInt(process.env.CLEANUP_HOUR || '3', 10),
  // 是否启用清理
  ENABLED: process.env.ENABLE_NOTIFICATION_CLEANUP !== 'false',
};

/**
 * 清理过期的已读通知
 */
async function cleanupReadNotifications(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.READ_NOTIFICATION_RETENTION_DAYS);

  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      readAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * 清理过期的系统广播通知（userId = 'system'）
 */
async function cleanupOldBroadcastNotifications(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.UNREAD_BROADCAST_RETENTION_DAYS);

  const result = await prisma.notification.deleteMany({
    where: {
      userId: 'system',
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * 执行清理任务
 */
export async function runNotificationCleanup(): Promise<{
  readDeleted: number;
  broadcastDeleted: number;
  totalDeleted: number;
}> {
  if (!CLEANUP_CONFIG.ENABLED) {
    logger.info('通知清理任务已禁用');
    return { readDeleted: 0, broadcastDeleted: 0, totalDeleted: 0 };
  }

  logger.info('开始执行通知数据清理任务...');

  try {
    const [readDeleted, broadcastDeleted] = await Promise.all([
      cleanupReadNotifications(),
      cleanupOldBroadcastNotifications(),
    ]);

    const totalDeleted = readDeleted + broadcastDeleted;

    logger.info('通知清理任务完成', {
      readDeleted,
      broadcastDeleted,
      totalDeleted,
      readRetentionDays: CLEANUP_CONFIG.READ_NOTIFICATION_RETENTION_DAYS,
      broadcastRetentionDays: CLEANUP_CONFIG.UNREAD_BROADCAST_RETENTION_DAYS,
    });

    return { readDeleted, broadcastDeleted, totalDeleted };
  } catch (error) {
    logger.error('通知清理任务失败', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * 计算到下一次清理时间的毫秒数
 */
function getMsUntilNextCleanup(): number {
  const now = new Date();
  const next = new Date();
  next.setHours(CLEANUP_CONFIG.CLEANUP_HOUR, 0, 0, 0);

  if (next <= now) {
    // 如果今天的清理时间已过，设置为明天
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * 启动定期清理任务
 */
export function startNotificationCleanupScheduler(): void {
  if (!CLEANUP_CONFIG.ENABLED) {
    logger.info('通知清理调度器未启动（已禁用）');
    return;
  }

  const scheduleNext = () => {
    const delay = getMsUntilNextCleanup();
    const nextRunTime = new Date(Date.now() + delay);

    logger.info(`通知清理任务已调度，下次执行时间: ${nextRunTime.toLocaleString('zh-CN')}`);

    setTimeout(async () => {
      try {
        await runNotificationCleanup();
      } catch (error) {
        logger.error('通知清理任务执行失败', { error });
      } finally {
        // 无论成功与否，都调度下一次
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
}

/**
 * 手动触发清理（用于测试或管理接口）
 */
export async function triggerManualCleanup(): Promise<{
  success: boolean;
  message: string;
  details?: {
    readDeleted: number;
    broadcastDeleted: number;
    totalDeleted: number;
  };
}> {
  try {
    const result = await runNotificationCleanup();
    return {
      success: true,
      message: `清理完成，共删除 ${result.totalDeleted} 条通知`,
      details: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `清理失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
