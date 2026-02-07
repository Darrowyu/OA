import { Router } from 'express';
import {
  archiveOldApplications,
  getArchiveStats,
  recoverApplications,
  checkDataIntegrity,
} from '../controllers/admin';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authMiddleware, requireRole(UserRole.ADMIN));

/**
 * @route   POST /api/admin/archive
 * @desc    归档旧申请
 * @access  Private (Admin only)
 */
router.post('/archive', archiveOldApplications);

/**
 * @route   GET /api/admin/archive-stats
 * @desc    获取归档统计
 * @access  Private (Admin only)
 */
router.get('/archive-stats', getArchiveStats);

/**
 * @route   POST /api/admin/recover
 * @desc    恢复已归档的申请
 * @access  Private (Admin only)
 */
router.post('/recover', recoverApplications);

/**
 * @route   GET /api/admin/data-integrity
 * @desc    数据完整性检查
 * @access  Private (Admin only)
 */
router.get('/data-integrity', checkDataIntegrity);

export default router;
