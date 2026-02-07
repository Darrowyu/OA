import { Router } from 'express';
import {
  getApplicationStats,
  getReminderStats,
  getDashboardStats,
} from '../controllers/statistics';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/statistics/applications
 * @desc    获取申请统计数据
 * @access  Private
 */
router.get('/applications', getApplicationStats);

/**
 * @route   GET /api/statistics/reminders
 * @desc    获取提醒统计数据
 * @access  Private (Admin only)
 */
router.get('/reminders', requireRole(UserRole.ADMIN), getReminderStats);

/**
 * @route   GET /api/statistics/dashboard
 * @desc    获取系统概览统计
 * @access  Private
 */
router.get('/dashboard', getDashboardStats);

export default router;
