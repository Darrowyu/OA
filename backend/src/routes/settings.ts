import { Router } from 'express';
import {
  getSystemInfo,
  getLogs,
  exportLogs,
  getBackups,
  createBackup,
  restoreBackup,
  downloadBackup,
  getAutoBackup,
  setAutoBackup,
  getEmailSettings,
  saveEmailSettings,
} from '../controllers/settings';
import { configController } from '../controllers/config.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authMiddleware, requireRole(UserRole.ADMIN));

// ========== 新配置管理路由 ==========

// 配置分类
router.get('/config/categories', configController.getCategories);

// 配置列表和详情
router.get('/config', configController.getConfigs);
router.get('/config/value/:key', configController.getConfigValue);
router.post('/config/values', configController.getConfigValues);

// 配置更新
router.put('/config/:key', configController.updateConfig);
router.post('/config/batch', configController.batchUpdateConfigs);

// 配置历史
router.get('/config/:key/history', configController.getConfigHistory);

// 初始化默认配置
router.post('/config/initialize', configController.initializeDefaults);

// ========== 保留原有功能路由 ==========

/**
 * @route   GET /api/settings/system-info
 * @desc    获取系统信息
 * @access  Private (Admin only)
 */
router.get('/system-info', getSystemInfo);

/**
 * @route   GET /api/settings/logs
 * @desc    获取系统日志
 * @access  Private (Admin only)
 */
router.get('/logs', getLogs);

/**
 * @route   POST /api/settings/logs/export
 * @desc    导出日志
 * @access  Private (Admin only)
 */
router.post('/logs/export', exportLogs);

/**
 * @route   GET /api/settings/backups
 * @desc    获取备份列表
 * @access  Private (Admin only)
 */
router.get('/backups', getBackups);

/**
 * @route   POST /api/settings/backups
 * @desc    创建备份
 * @access  Private (Admin only)
 */
router.post('/backups', createBackup);

/**
 * @route   POST /api/settings/backups/:id/restore
 * @desc    从备份恢复
 * @access  Private (Admin only)
 */
router.post('/backups/:id/restore', restoreBackup);

/**
 * @route   GET /api/settings/backups/:id/download
 * @desc    下载备份
 * @access  Private (Admin only)
 */
router.get('/backups/:id/download', downloadBackup);

/**
 * @route   GET /api/settings/auto-backup
 * @desc    获取自动备份设置
 * @access  Private (Admin only)
 */
router.get('/auto-backup', getAutoBackup);

/**
 * @route   POST /api/settings/auto-backup
 * @desc    设置自动备份
 * @access  Private (Admin only)
 */
router.post('/auto-backup', setAutoBackup);

/**
 * @route   GET /api/settings/email
 * @desc    获取邮件设置
 * @access  Private (Admin only)
 */
router.get('/email', getEmailSettings);

/**
 * @route   POST /api/settings/email
 * @desc    保存邮件设置
 * @access  Private (Admin only)
 */
router.post('/email', saveEmailSettings);

export default router;
