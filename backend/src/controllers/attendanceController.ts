import type { Request, Response } from 'express'
import { z } from 'zod'
import { attendanceService, scheduleService } from '../services/attendanceService'
import type { ClockInType, AttendanceStatus, LeaveType, LeaveRequestStatus } from '@prisma/client'

type AuthRequest = Request & {
  user?: {
    id: string
    role: string
    isActive: boolean
  }
}

const clockInSchema = z.object({
  type: z.enum(['GPS', 'WIFI', 'MANUAL']),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
})

const clockOutSchema = clockInSchema

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

const statisticsQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

const correctAttendanceSchema = z.object({
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().optional(),
  status: z.enum(['NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'ON_LEAVE']).optional(),
  notes: z.string().optional(),
})

// 上班打卡
export const clockIn = async (req: AuthRequest, res: Response) => {
  try {
    const data = clockInSchema.parse(req.body)
    const userId = req.user!.id

    const record = await attendanceService.clockIn(userId, {
      type: data.type as ClockInType,
      location: data.location,
      notes: data.notes,
    })

    res.json({
      success: true,
      data: record,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'CLOCK_IN_FAILED', message: (error as Error).message },
    })
  }
}

// 下班打卡
export const clockOut = async (req: AuthRequest, res: Response) => {
  try {
    const data = clockOutSchema.parse(req.body)
    const userId = req.user!.id

    const record = await attendanceService.clockOut(userId, {
      type: data.type as ClockInType,
      location: data.location,
      notes: data.notes,
    })

    res.json({
      success: true,
      data: record,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'CLOCK_OUT_FAILED', message: (error as Error).message },
    })
  }
}

// 获取今日考勤
export const getTodayAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const record = await attendanceService.getTodayAttendance(userId)

    res.json({
      success: true,
      data: record,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    })
  }
}

// 获取考勤列表
export const getAttendanceList = async (req: AuthRequest, res: Response) => {
  try {
    const query = attendanceQuerySchema.parse(req.query)
    const isAdmin = req.user!.role === 'ADMIN'

    const result = await attendanceService.getAttendanceList({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      userId: isAdmin ? query.userId : req.user!.id,
      status: query.status as AttendanceStatus,
      page: query.page ? parseInt(query.page) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize) : 20,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    })
  }
}

// 创建请假申请
export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const data = createLeaveRequestSchema.parse(req.body)
    const userId = req.user!.id

    const request = await attendanceService.createLeaveRequest(userId, {
      type: data.type as LeaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: data.days,
      reason: data.reason,
    })

    res.json({
      success: true,
      data: request,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    })
  }
}

// 获取请假列表
export const getLeaveRequests = async (req: AuthRequest, res: Response) => {
  try {
    const query = leaveRequestQuerySchema.parse(req.query)
    const isAdmin = req.user!.role === 'ADMIN'

    const result = await attendanceService.getLeaveRequests({
      userId: isAdmin ? query.userId : req.user!.id,
      status: query.status as LeaveRequestStatus,
      page: query.page ? parseInt(query.page) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize) : 20,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    })
  }
}

// 审批请假
export const approveLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = approveLeaveSchema.parse(req.body)
    const approverId = req.user!.id

    const request = await attendanceService.approveLeaveRequest(
      id,
      approverId,
      data.approved,
      data.rejectReason
    )

    res.json({
      success: true,
      data: request,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'APPROVE_FAILED', message: (error as Error).message },
    })
  }
}

// 获取考勤统计
export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const query = statisticsQuerySchema.parse(req.query)
    const isAdmin = req.user!.role === 'ADMIN'
    const userId = isAdmin && query.userId ? query.userId : req.user!.id

    const stats = await attendanceService.getStatistics(
      userId,
      new Date(query.startDate),
      new Date(query.endDate)
    )

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    })
  }
}

// 修正考勤（管理员）
export const correctAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = correctAttendanceSchema.parse(req.body)

    const record = await attendanceService.correctAttendance(id, {
      clockIn: data.clockIn ? new Date(data.clockIn) : undefined,
      clockOut: data.clockOut ? new Date(data.clockOut) : undefined,
      status: data.status as AttendanceStatus,
      notes: data.notes,
    })

    res.json({
      success: true,
      data: record,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'CORRECT_FAILED', message: (error as Error).message },
    })
  }
}

// ============ 排班管理 ============

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

const scheduleQuerySchema = z.object({
  userId: z.string().optional(),
  month: z.string().datetime(),
})

// 创建班次
export const createShift = async (req: AuthRequest, res: Response) => {
  try {
    const data = createShiftSchema.parse(req.body)
    const shift = await scheduleService.createShift(data)

    res.json({
      success: true,
      data: shift,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    })
  }
}

// 获取班次列表
export const getShifts = async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const shifts = await scheduleService.getShifts(includeInactive)

    res.json({
      success: true,
      data: shifts,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    })
  }
}

// 更新班次
export const updateShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = createShiftSchema.partial().parse(req.body)
    const shift = await scheduleService.updateShift(id, data)

    res.json({
      success: true,
      data: shift,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: (error as Error).message },
    })
  }
}

// 删除班次
export const deleteShift = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await scheduleService.deleteShift(id)

    res.json({
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    })
  }
}

// 创建排班
export const createSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const data = createScheduleSchema.parse(req.body)
    const schedule = await scheduleService.createSchedule({
      userId: data.userId,
      date: new Date(data.date),
      shiftId: data.shiftId,
      isRestDay: data.isRestDay,
    })

    res.json({
      success: true,
      data: schedule,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: (error as Error).message },
    })
  }
}

// 获取排班列表
export const getSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const query = scheduleQuerySchema.parse(req.query)
    const isAdmin = req.user!.role === 'ADMIN'
    const userId = isAdmin && query.userId ? query.userId : req.user!.id

    const schedules = await scheduleService.getUserSchedules(
      userId,
      new Date(query.month)
    )

    res.json({
      success: true,
      data: schedules,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: (error as Error).message },
    })
  }
}

// 删除排班
export const deleteSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await scheduleService.deleteSchedule(id)

    res.json({
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (error as Error).message },
    })
  }
}

// 设置休息日
export const setRestDay = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, date, isRestDay } = z.object({
      userId: z.string(),
      date: z.string().datetime(),
      isRestDay: z.boolean(),
    }).parse(req.body)

    const schedule = await scheduleService.setRestDay(
      userId,
      new Date(date),
      isRestDay
    )

    res.json({
      success: true,
      data: schedule,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      })
      return
    }
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: (error as Error).message },
    })
  }
}
