import type { Request, Response } from 'express'
import { z } from 'zod'
import { attendanceService } from '../services/attendanceService'
import { scheduleService } from '../services/scheduleService'
import type { ClockInType, AttendanceStatus, LeaveType, LeaveRequestStatus } from '@prisma/client'

type AuthRequest = Request & {
  user?: {
    id: string
    role: string
    isActive: boolean
  }
}

// 统一响应辅助函数
function successResponse<T>(res: Response, data: T): void {
  res.json({ success: true, data })
}

function errorResponse(res: Response, code: string, message: string, status = 500): void {
  res.status(status).json({ success: false, error: { code, message } })
}

function validationError(res: Response, message: string): void {
  errorResponse(res, 'VALIDATION_ERROR', message, 400)
}

// 处理Zod验证错误
function handleZodError(res: Response, error: unknown): void {
  if (error instanceof z.ZodError) {
    validationError(res, error.errors[0].message)
    return
  }
  throw error
}

// 解析分页参数
function parsePagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  return {
    page: query.page ? parseInt(query.page as string, 10) : 1,
    pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 20,
  }
}

// 解析日期参数
function parseDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined
}

// ============ Schema Definitions ============

const clockInSchema = z.object({
  type: z.enum(['GPS', 'WIFI', 'MANUAL']),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
})

const createLeaveRequestSchema = z.object({
  type: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'MARRIAGE', 'MATERNITY', 'PATERNITY', 'FUNERAL', 'OTHER']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  days: z.number().min(0.5),
  reason: z.string().min(1, '请假原因不能为空'),
})

const approveLeaveSchema = z.object({
  approved: z.boolean(),
  rejectReason: z.string().optional(),
})

const attendanceQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  status: z.enum(['NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'ON_LEAVE']).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

const leaveRequestQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

const correctAttendanceSchema = z.object({
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().optional(),
  status: z.enum(['NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'ON_LEAVE']).optional(),
  notes: z.string().optional(),
})

const createShiftSchema = z.object({
  name: z.string().min(1, '班次名称不能为空'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, '时间格式错误'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, '时间格式错误'),
  breakTime: z.number().min(0).optional(),
  color: z.string().optional(),
})

const createScheduleSchema = z.object({
  userId: z.string(),
  date: z.string().datetime(),
  shiftId: z.string(),
  isRestDay: z.boolean().optional(),
})

// ============ Attendance Controllers ============

// 上班打卡
export async function clockIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = clockInSchema.parse(req.body)
    const record = await attendanceService.clockIn(req.user!.id, {
      type: data.type as ClockInType,
      location: data.location,
      notes: data.notes,
    })
    successResponse(res, record)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'CLOCK_IN_FAILED', (error as Error).message, 400)
  }
}

// 下班打卡
export async function clockOut(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = clockInSchema.parse(req.body)
    const record = await attendanceService.clockOut(req.user!.id, {
      type: data.type as ClockInType,
      location: data.location,
      notes: data.notes,
    })
    successResponse(res, record)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'CLOCK_OUT_FAILED', (error as Error).message, 400)
  }
}

// 获取今日考勤
export async function getTodayAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const record = await attendanceService.getTodayAttendance(req.user!.id)
    successResponse(res, record)
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message)
  }
}

// 获取考勤列表
export async function getAttendanceList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = attendanceQuerySchema.parse(req.query)
    const isAdmin = req.user!.role === 'ADMIN'
    const { page, pageSize } = parsePagination(query)

    const result = await attendanceService.getAttendanceList({
      startDate: parseDate(query.startDate),
      endDate: parseDate(query.endDate),
      userId: isAdmin ? query.userId : req.user!.id,
      status: query.status as AttendanceStatus,
      page,
      pageSize,
    })

    successResponse(res, result)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'FETCH_FAILED', (error as Error).message)
  }
}

// 创建请假申请
export async function createLeaveRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = createLeaveRequestSchema.parse(req.body)
    const request = await attendanceService.createLeaveRequest(req.user!.id, {
      type: data.type as LeaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: data.days,
      reason: data.reason,
    })
    successResponse(res, request)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400)
  }
}

// 获取请假列表
export async function getLeaveRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = leaveRequestQuerySchema.parse(req.query)
    const isAdmin = req.user!.role === 'ADMIN'
    const { page, pageSize } = parsePagination(query)

    const result = await attendanceService.getLeaveRequests({
      userId: isAdmin ? query.userId : req.user!.id,
      status: query.status as LeaveRequestStatus,
      page,
      pageSize,
    })

    successResponse(res, result)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'FETCH_FAILED', (error as Error).message)
  }
}

// 审批请假
export async function approveLeaveRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const data = approveLeaveSchema.parse(req.body)
    const request = await attendanceService.approveLeaveRequest(
      id,
      req.user!.id,
      data.approved,
      data.rejectReason
    )
    successResponse(res, request)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'APPROVE_FAILED', (error as Error).message, 400)
  }
}

// 获取考勤统计
export async function getStatistics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = z.object({
      userId: z.string().optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }).parse(req.query)

    const isAdmin = req.user!.role === 'ADMIN'
    const userId = isAdmin && query.userId ? query.userId : req.user!.id

    const stats = await attendanceService.getStatistics(
      userId,
      new Date(query.startDate),
      new Date(query.endDate)
    )

    successResponse(res, stats)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'FETCH_FAILED', (error as Error).message)
  }
}

// 修正考勤（管理员）
export async function correctAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const data = correctAttendanceSchema.parse(req.body)
    const record = await attendanceService.correctAttendance(id, {
      clockIn: data.clockIn ? new Date(data.clockIn) : undefined,
      clockOut: data.clockOut ? new Date(data.clockOut) : undefined,
      status: data.status as AttendanceStatus,
      notes: data.notes,
    })
    successResponse(res, record)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'CORRECT_FAILED', (error as Error).message, 400)
  }
}

// ============ Schedule Controllers ============

// 创建班次
export async function createShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = createShiftSchema.parse(req.body)
    const shift = await scheduleService.createShift(data)
    successResponse(res, shift)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400)
  }
}

// 获取班次列表
export async function getShifts(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const includeInactive = _req.query.includeInactive === 'true'
    const shifts = await scheduleService.getShifts(includeInactive)
    successResponse(res, shifts)
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message)
  }
}

// 更新班次
export async function updateShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const data = createShiftSchema.partial().parse(req.body)
    const shift = await scheduleService.updateShift(id, data)
    successResponse(res, shift)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400)
  }
}

// 删除班次
export async function deleteShift(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    await scheduleService.deleteShift(id)
    successResponse(res, null)
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 400)
  }
}

// 创建排班
export async function createSchedule(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = createScheduleSchema.parse(req.body)
    const schedule = await scheduleService.createSchedule({
      userId: data.userId,
      date: new Date(data.date),
      shiftId: data.shiftId,
      isRestDay: data.isRestDay,
    })
    successResponse(res, schedule)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400)
  }
}

// 获取排班列表
export async function getSchedules(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = z.object({
      userId: z.string().optional(),
      month: z.string().datetime(),
    }).parse(req.query)

    const isAdmin = req.user!.role === 'ADMIN'
    const userId = isAdmin && query.userId ? query.userId : req.user!.id
    const schedules = await scheduleService.getUserSchedules(userId, new Date(query.month))

    successResponse(res, schedules)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'FETCH_FAILED', (error as Error).message)
  }
}

// 删除排班
export async function deleteSchedule(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params
    await scheduleService.deleteSchedule(id)
    successResponse(res, null)
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 400)
  }
}

// 设置休息日
export async function setRestDay(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, date, isRestDay } = z.object({
      userId: z.string(),
      date: z.string().datetime(),
      isRestDay: z.boolean(),
    }).parse(req.body)

    const schedule = await scheduleService.setRestDay(userId, new Date(date), isRestDay)
    successResponse(res, schedule)
  } catch (error) {
    handleZodError(res, error)
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400)
  }
}
