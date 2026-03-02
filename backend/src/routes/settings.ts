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
  getSecuritySettings,
  saveSecuritySettings,
  getAppearanceSettings,
  saveAppearanceSettings,
  getNotificationSettings,
  saveNotificationSettings,
  getStorageSettings,
  saveStorageSettings,
} from '../controllers/settings';
import { configController } from '../controllers/config.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authMiddleware, requireRole(UserRole.ADMIN));

// ========== 新配置管理路由（保持向后兼容） ==========

// 配置分类
router.get('/config/categories', configController.getCategories);

// 初始化默认配置（放在具体路由之前）
router.post('/config/initialize', configController.initializeDefaults);

// 批量操作（放在具体路由之前）
router.post('/config/batch', configController.batchUpdateConfigs);
router.post('/config/values', configController.getConfigValues);

// 配置列表和详情
router.get('/config', configController.getConfigs);
router.get('/config/value/:key', configController.getConfigValue);

// 配置历史
router.get('/config/:key/history', configController.getConfigHistory);

// 配置更新
router.put('/config/:key', configController.updateConfig);

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

// ========== 新增设置模块路由 ==========

/**
 * @route   GET /api/settings/security
 * @desc    获取安全设置
 * @access  Private (Admin only)
 */
router.get('/security', getSecuritySettings);

/**
 * @route   POST /api/settings/security
 * @desc    保存安全设置
 * @access  Private (Admin only)
 */
router.post('/security', saveSecuritySettings);

/**
 * @route   GET /api/settings/appearance
 * @desc    获取界面设置
 * @access  Private (Admin only)
 */
router.get('/appearance', getAppearanceSettings);

/**
 * @route   POST /api/settings/appearance
 * @desc    保存界面设置
 * @access  Private (Admin only)
 */
router.post('/appearance', saveAppearanceSettings);

/**
 * @route   GET /api/settings/notifications
 * @desc    获取通知设置
 * @access  Private (Admin only)
 */
router.get('/notifications', getNotificationSettings);

/**
 * @route   POST /api/settings/notifications
 * @desc    保存通知设置
 * @access  Private (Admin only)
 */
router.post('/notifications', saveNotificationSettings);

/**
 * @route   GET /api/settings/storage
 * @desc    获取存储设置
 * @access  Private (Admin only)
 */
router.get('/storage', getStorageSettings);

/**
 * @route   POST /api/settings/storage
 * @desc    保存存储设置
 * @access  Private (Admin only)
 */
router.post('/storage', saveStorageSettings);

export default router;
