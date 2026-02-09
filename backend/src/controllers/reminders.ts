import { Request, Response } from 'express';
import {
  getReminderSettings,
  saveReminderSettings,
  checkAndSendReminders,
  ReminderSettings,
} from '../services/reminder';
import * as logger from '../lib/logger';

/**
 * 获取提醒设置
 * GET /api/settings/reminders
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '权限不足，只有管理员可以查看提醒设置' },
      });
      return;
    }

    const settings = getReminderSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('获取提醒设置失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取提醒设置失败' },
    });
  }
}

/**
 * 保存提醒设置
 * POST /api/settings/reminders
 */
export async function saveSettings(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '权限不足，只有管理员可以修改提醒设置' },
      });
      return;
    }

    const settings: ReminderSettings = req.body;

    // 验证设置数据
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATA', message: '无效的设置数据' },
      });
      return;
    }

    // 验证优先级设置
    if (settings.priority) {
      ['high', 'medium', 'low'].forEach((priority) => {
        const p = settings.priority[priority as keyof typeof settings.priority];
        if (p) {
          p.initialDelay = Math.max(1, parseInt(String(p.initialDelay)) || 8);
          p.normalInterval = Math.max(1, parseInt(String(p.normalInterval)) || 8);
          p.mediumInterval = Math.max(1, parseInt(String(p.mediumInterval)) || 4);
          p.urgentInterval = Math.max(1, parseInt(String(p.urgentInterval)) || 2);
        }
      });
    }

    if (saveReminderSettings(settings)) {
      logger.info(`管理员 ${user.username} 更新了提醒策略`);

      // 立即触发一次提醒检查
      setTimeout(() => {
        logger.info('立即应用新的提醒策略，触发提醒检查...');
        checkAndSendReminders();
      }, 100);

      res.json({
        success: true,
        message: '提醒策略保存成功并已立即生效',
      });
    } else {
      res.status(500).json({
        success: false,
        error: { code: 'SAVE_FAILED', message: '保存设置失败' },
      });
    }
  } catch (error) {
    logger.error('保存提醒设置失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '保存提醒设置失败' },
    });
  }
}

/**
 * 手动触发提醒检查
 * POST /api/settings/reminders/check
 */
export async function triggerCheck(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '权限不足，只有管理员可以触发提醒检查' },
      });
      return;
    }

    logger.info(`管理员 ${user.username} 手动触发提醒检查`);

    // 异步执行提醒检查
    setTimeout(() => {
      checkAndSendReminders();
    }, 100);

    res.json({
      success: true,
      message: '提醒检查已触发，请查看服务器日志了解详细信息',
    });
  } catch (error) {
    logger.error('触发提醒检查失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '触发提醒检查失败' },
    });
  }
}
