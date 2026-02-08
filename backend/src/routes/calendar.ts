import { Router } from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getSharedEvents,
  getAttendingEvents,
  updateAttendeeStatus,
  getStatistics,
} from '../controllers/calendarController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取日程列表
router.get('/events', getEvents);

// 获取单个日程详情
router.get('/events/:id', getEvent);

// 创建日程
router.post('/events', createEvent);

// 更新日程
router.put('/events/:id', updateEvent);

// 删除日程
router.delete('/events/:id', deleteEvent);

// 更新参与者状态
router.post('/events/:id/attendee-status', updateAttendeeStatus);

// 获取团队共享日程
router.get('/shared', getSharedEvents);

// 获取我参与的日程
router.get('/attending', getAttendingEvents);

// 获取日程统计
router.get('/statistics', getStatistics);

export default router;
