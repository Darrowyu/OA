import { Router } from 'express'
import {
  clockIn,
  clockOut,
  getTodayAttendance,
  getAttendanceList,
  createLeaveRequest,
  getLeaveRequests,
  approveLeaveRequest,
  getStatistics,
  correctAttendance,
  createShift,
  getShifts,
  updateShift,
  deleteShift,
  createSchedule,
  getSchedules,
  deleteSchedule,
  setRestDay,
} from '../controllers/attendanceController'
import { authenticate } from '../middleware/auth'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// ============ 打卡相关 ============
router.post('/clock-in', clockIn)
router.post('/clock-out', clockOut)
router.get('/today', getTodayAttendance)

// ============ 考勤记录 ============
router.get('/', getAttendanceList)
router.put('/:id/correct', correctAttendance)

// ============ 请假申请 ============
router.post('/leave', createLeaveRequest)
router.get('/leave', getLeaveRequests)
router.put('/leave/:id/approve', approveLeaveRequest)

// ============ 统计 ============
router.get('/statistics', getStatistics)

// ============ 班次管理 ============
router.get('/shifts', getShifts)
router.post('/shifts', createShift)
router.put('/shifts/:id', updateShift)
router.delete('/shifts/:id', deleteShift)

// ============ 排班管理 ============
router.get('/schedules', getSchedules)
router.post('/schedules', createSchedule)
router.delete('/schedules/:id', deleteSchedule)
router.post('/schedules/rest-day', setRestDay)

export default router
