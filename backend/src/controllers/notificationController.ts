import { Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationById,
} from '../services/notificationService';
import * as logger from '../lib/logger';

/**
 * 获取用户通知列表
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const isRead = req.query.isRead !== undefined
      ? req.query.isRead === 'true'
      : undefined;
    const type = req.query.type as NotificationType | undefined;

    const result = await getUserNotifications(userId, {
      page,
      pageSize,
      isRead,
      type,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('获取通知列表失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取通知列表失败',
      },
    });
  }
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCountController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const count = await getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('获取未读数量失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取未读数量失败',
      },
    });
  }
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const notification = await markAsRead(id, userId);

    if (!notification) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '通知不存在或无权访问',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('标记已读失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '标记已读失败',
      },
    });
  }
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const count = await markAllAsRead(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('标记全部已读失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '标记全部已读失败',
      },
    });
  }
}

/**
 * 删除通知
 */
export async function deleteNotificationController(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const success = await deleteNotification(id, userId);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '通知不存在或无权删除',
        },
      });
      return;
    }

    res.json({
      success: true,
      message: '通知已删除',
    });
  } catch (error) {
    logger.error('删除通知失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除通知失败',
      },
    });
  }
}

/**
 * 删除所有已读通知
 */
export async function deleteAllReadNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const count = await deleteAllRead(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('删除已读通知失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除已读通知失败',
      },
    });
  }
}

/**
 * 获取通知详情
 */
export async function getNotificationDetail(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const notification = await getNotificationById(id, userId);

    if (!notification) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '通知不存在或无权访问',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('获取通知详情失败', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取通知详情失败',
      },
    });
  }
}
