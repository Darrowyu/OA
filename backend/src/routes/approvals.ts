import { Router } from 'express';
import {
  factoryApprove,
  directorApprove,
  managerApprove,
  ceoApprove,
  getApprovalHistory,
  withdrawApproval,
} from '../controllers/approvals';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 厂长审批
router.post('/factory/:applicationId', factoryApprove);

// 总监审批
router.post('/director/:applicationId', directorApprove);

// 经理审批
router.post('/manager/:applicationId', managerApprove);

// CEO审批
router.post('/ceo/:applicationId', ceoApprove);

// 获取审批历史
router.get('/:applicationId/history', getApprovalHistory);

// 撤回审批
router.post('/:applicationId/withdraw', withdrawApproval);

export default router;
