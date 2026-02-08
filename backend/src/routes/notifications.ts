import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCountController,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationController,
  deleteAllReadNotifications,
  getNotificationDetail,
} from '../controllers/notificationController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取通知列表
router.get('/', getNotifications);

// 获取未读通知数量
router.get('/unread-count', getUnreadCountController);

// 标记所有通知为已读
router.post('/mark-all-read', markAllNotificationsAsRead);

// 删除所有已读通知
router.delete('/read', deleteAllReadNotifications);

// 获取通知详情
router.get('/:id', getNotificationDetail);

// 标记通知为已读
router.post('/:id/read', markNotificationAsRead);

// 删除通知
router.delete('/:id', deleteNotificationController);

export default router;
