import { Router } from 'express';
import {
  getAuditLogsController,
  getAuditStatsController,
  getAuditLogByIdController,
  getAuditActionsController,
  getEntityTypesController,
} from '../controllers/auditController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有审计路由都需要认证和管理员权限
router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));

/**
 * @route   GET /api/audit/logs
 * @desc    获取审计日志列表（支持分页、筛选）
 * @access  Private (Admin only)
 */
router.get('/logs', getAuditLogsController);

/**
 * @route   GET /api/audit/stats
 * @desc    获取审计日志统计信息
 * @access  Private (Admin only)
 */
router.get('/stats', getAuditStatsController);

/**
 * @route   GET /api/audit/actions
 * @desc    获取操作类型列表
 * @access  Private (Admin only)
 */
router.get('/actions', getAuditActionsController);

/**
 * @route   GET /api/audit/entity-types
 * @desc    获取实体类型列表
 * @access  Private (Admin only)
 */
router.get('/entity-types', getEntityTypesController);

/**
 * @route   GET /api/audit/logs/:id
 * @desc    获取单条审计日志详情
 * @access  Private (Admin only)
 */
router.get('/logs/:id', getAuditLogByIdController);

export default router;
