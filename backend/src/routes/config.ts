import { Router } from 'express';
import { configController } from '../controllers/config.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authMiddleware, requireRole(UserRole.ADMIN));

// 配置分类
router.get('/categories', configController.getCategories);

// 初始化默认配置（放在具体路由之前）
router.post('/initialize', configController.initializeDefaults);

// 批量操作（放在具体路由之前）
router.post('/batch', configController.batchUpdateConfigs);
router.post('/values', configController.getConfigValues);

// 配置列表和详情
router.get('/', configController.getConfigs);
router.get('/value/:key', configController.getConfigValue);

// 配置历史
router.get('/:key/history', configController.getConfigHistory);

// 配置更新
router.put('/:key', configController.updateConfig);

export default router;
