import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createProductDevelopment,
  getProductDevelopments,
  getProductDevelopment,
  approveProductDevelopment,
  deleteProductDevelopment,
} from '../controllers/productDevelopment';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取新产品开发企划表列表
router.get('/', getProductDevelopments);

// 创建新产品开发企划表
router.post('/', createProductDevelopment);

// 获取新产品开发企划表详情
router.get('/:id', getProductDevelopment);

// 审核人审批
router.post('/:id/approve', approveProductDevelopment);

// 删除新产品开发企划表
router.delete('/:id', deleteProductDevelopment);

export default router;
