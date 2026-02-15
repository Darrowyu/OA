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
import { auditMiddleware } from '../middleware/auditMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 厂长审批
router.post('/factory/:applicationId', auditMiddleware({
  action: 'FACTORY_APPROVE',
  entityType: 'Approval',
  entityIdExtractor: (req) => req.params.applicationId,
  captureNewValues: true
}), factoryApprove);

// 总监审批
router.post('/director/:applicationId', auditMiddleware({
  action: 'DIRECTOR_APPROVE',
  entityType: 'Approval',
  entityIdExtractor: (req) => req.params.applicationId,
  captureNewValues: true
}), directorApprove);

// 经理审批
router.post('/manager/:applicationId', auditMiddleware({
  action: 'MANAGER_APPROVE',
  entityType: 'Approval',
  entityIdExtractor: (req) => req.params.applicationId,
  captureNewValues: true
}), managerApprove);

// CEO审批
router.post('/ceo/:applicationId', auditMiddleware({
  action: 'CEO_APPROVE',
  entityType: 'Approval',
  entityIdExtractor: (req) => req.params.applicationId,
  captureNewValues: true
}), ceoApprove);

// 获取审批历史
router.get('/:applicationId/history', getApprovalHistory);

// 撤回审批
router.post('/:applicationId/withdraw', auditMiddleware({
  action: 'WITHDRAW_APPROVAL',
  entityType: 'Approval',
  entityIdExtractor: (req) => req.params.applicationId,
  captureOldValues: true
}), withdrawApproval);

export default router;
