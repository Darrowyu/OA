import { Router } from 'express';
import {
  exportApplications,
  exportUsers,
} from '../controllers/export';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/export/applications
 * @desc    导出申请到Excel
 * @access  Private
 */
router.get('/applications', exportApplications);

/**
 * @route   GET /api/export/users
 * @desc    导出用户到Excel
 * @access  Private (Admin only)
 */
router.get('/users', requireRole(UserRole.ADMIN), exportUsers);

export default router;
