import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getApprovalStats,
  getEquipmentStats,
  getAttendanceStats,
  getUserPerformance,
  getDashboardSummary,
  generateCustomReport,
  exportReport,
  getMyPerformance,
} from '../controllers/reportController';

const router = Router();

// 所有报表接口都需要认证
router.use(authMiddleware);

// 仪表板汇总数据
router.get('/dashboard/summary', getDashboardSummary);

// 审批统计分析
router.get('/approvals', getApprovalStats);

// 设备统计分析
router.get('/equipment', getEquipmentStats);

// 考勤统计分析
router.get('/attendance', getAttendanceStats);

// 个人绩效 - 当前用户
router.get('/performance/me', getMyPerformance);

// 个人绩效 - 指定用户
router.get('/performance/:userId', getUserPerformance);

// 自定义报表生成
router.post('/custom', generateCustomReport);

// 导出报表
router.post('/export', exportReport);

export default router;
