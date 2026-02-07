import { Router } from 'express';
import {
  getSettings,
  saveSettings,
  triggerCheck,
} from '../controllers/reminders';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authMiddleware, requireRole(UserRole.ADMIN));

/**
 * @route   GET /api/settings/reminders
 * @desc    获取提醒设置
 * @access  Private (Admin only)
 */
router.get('/', getSettings);

/**
 * @route   POST /api/settings/reminders
 * @desc    保存提醒设置
 * @access  Private (Admin only)
 */
router.post('/', saveSettings);

/**
 * @route   POST /api/settings/reminders/check
 * @desc    手动触发提醒检查
 * @access  Private (Admin only)
 */
router.post('/check', triggerCheck);

export default router;
