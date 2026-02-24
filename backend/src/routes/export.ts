import { Router } from 'express';
import {
  exportApplications,
  exportUsers,
  exportProductDevelopment,
  exportFeasibilityStudy,
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

/**
 * @route   GET /api/export/product-development/:id
 * @desc    导出新产品开发企划表到Excel
 * @access  Private
 */
router.get('/product-development/:id', authMiddleware, exportProductDevelopment);

/**
 * @route   GET /api/export/feasibility-study/:id
 * @desc    导出可行性评估表到Excel
 * @access  Private
 */
router.get('/feasibility-study/:id', authMiddleware, exportFeasibilityStudy);

export default router;
