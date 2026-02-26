import { Router } from 'express';
import {
  getDashboardStats,
  getTodaySchedule,
  getTeamMembers,
  getUpcomingMeetings,
  getTodayTasks,
  getTaskStatistics,
  getRecentActivities,
} from '../controllers/dashboard';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard/stats
 * @desc    获取工作台统计数据
 * @access  Private
 */
router.get('/stats', getDashboardStats);

/**
 * @route   GET /api/dashboard/schedule
 * @desc    获取今日日程
 * @access  Private
 */
router.get('/schedule', getTodaySchedule);

/**
 * @route   GET /api/dashboard/team-members
 * @desc    获取部门成员
 * @access  Private
 */
router.get('/team-members', getTeamMembers);

/**
 * @route   GET /api/dashboard/upcoming-meetings
 * @desc    获取即将开始的会议
 * @access  Private
 */
router.get('/upcoming-meetings', getUpcomingMeetings);

/**
 * @route   GET /api/dashboard/today-tasks
 * @desc    获取今日任务
 * @access  Private
 */
router.get('/today-tasks', getTodayTasks);

/**
 * @route   GET /api/dashboard/task-statistics
 * @desc    获取任务完成统计
 * @access  Private
 */
router.get('/task-statistics', getTaskStatistics);

/**
 * @route   GET /api/dashboard/activities
 * @desc    获取最新动态
 * @access  Private
 */
router.get('/activities', getRecentActivities);

export default router;
