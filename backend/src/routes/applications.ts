import { Router } from 'express';
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  submitApplication,
} from '../controllers/applications';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取申请列表
router.get('/', getApplications);

// 创建申请
router.post('/', createApplication);

// 获取申请详情
router.get('/:id', getApplication);

// 更新申请
router.put('/:id', updateApplication);

// 删除申请
router.delete('/:id', deleteApplication);

// 提交申请
router.post('/:id/submit', submitApplication);

export default router;
