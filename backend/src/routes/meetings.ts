import { Router } from 'express';
import {
  getRooms,
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkRoomAvailability,
  getRoomBookings,
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  completeMeeting,
  updateMinutes,
  updateAttendeeStatus,
} from '../controllers/meetings';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// ========== 会议室路由 ==========

// 获取会议室列表（分页）
router.get('/rooms', getRooms);

// 获取所有可用会议室（不分页，用于下拉选择）
router.get('/rooms/all', getAllRooms);

// 获取会议室详情
router.get('/rooms/:id', getRoomById);

// 创建会议室（仅管理员）
router.post('/rooms', createRoom);

// 更新会议室（仅管理员）
router.put('/rooms/:id', updateRoom);

// 删除会议室（仅管理员）
router.delete('/rooms/:id', deleteRoom);

// 检查会议室可用性
router.get('/rooms/:id/availability', checkRoomAvailability);

// 获取会议室某天的预订情况
router.get('/rooms/:id/bookings', getRoomBookings);

// ========== 会议路由 ==========

// 获取会议列表
router.get('/', getMeetings);

// 创建会议
router.post('/', createMeeting);

// 获取会议详情
router.get('/:id', getMeetingById);

// 更新会议
router.put('/:id', updateMeeting);

// 取消会议
router.post('/:id/cancel', cancelMeeting);

// 完成会议
router.post('/:id/complete', completeMeeting);

// 更新会议纪要
router.put('/:id/minutes', updateMinutes);

// 更新参会状态
router.put('/:id/attendee-status', updateAttendeeStatus);

export default router;
