import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import type { AttendanceStatus, ClockInType, LeaveType, LeaveRequestStatus } from '@prisma/client'

export interface ClockInData {
  type: ClockInType
  location?: {
    lat: number
    lng: number
    address?: string
  }
  notes?: string
}

export interface ClockOutData {
  type: ClockInType
  location?: {
    lat: number
    lng: number
    address?: string
  }
  notes?: string
}

export interface CreateLeaveRequestData {
  type: LeaveType
  startDate: Date
  endDate: Date
  days: number
  reason: string
}

export interface AttendanceQueryParams {
  startDate?: Date
  endDate?: Date
  userId?: string
  status?: AttendanceStatus
  page?: number
  pageSize?: number
}

export interface LeaveRequestQueryParams {
  userId?: string
  status?: LeaveRequestStatus
  page?: number
  pageSize?: number
}

export interface AttendanceStatistics {
  totalDays: number
  normalDays: number
  lateDays: number
  earlyLeaveDays: number
  absentDays: number
  onLeaveDays: number
  attendanceRate: number
  avgWorkHours: number
}

export class AttendanceService {
  // 上班打卡
  async clockIn(userId: string, data: ClockInData) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 检查今日是否已打卡
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    if (existing?.clockIn) {
      throw new Error('今日已上班打卡')
    }

    // 获取用户今日排班
    const schedule = await prisma.schedule.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        shift: true,
      },
    })

    // 计算打卡状态（是否迟到）
    const now = new Date()
    let status: AttendanceStatus = 'NORMAL'

    if (schedule?.shift) {
      const shiftStart = this.parseTimeString(schedule.shift.startTime)
      const clockInTime = now.getHours() * 60 + now.getMinutes()

      // 假设 9:05 后算迟到
      if (clockInTime > shiftStart + 5) {
        status = 'LATE'
      }
    }

    if (existing) {
      // 更新现有记录
      return prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          clockIn: now,
          clockInType: data.type,
          clockInLocation: data.location ? (data.location as Prisma.InputJsonValue) : undefined,
          notes: data.notes,
          status,
        },
      })
    }

    // 创建新记录
    return prisma.attendanceRecord.create({
      data: {
        userId,
        date: today,
        clockIn: now,
        clockInType: data.type,
        clockInLocation: data.location ? (data.location as Prisma.InputJsonValue) : undefined,
        notes: data.notes,
        status,
      },
    })
  }

  // 下班打卡
  async clockOut(userId: string, data: ClockOutData) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const record = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    if (!record) {
      throw new Error('今日尚未上班打卡')
    }

    if (record.clockOut) {
      throw new Error('今日已下班打卡')
    }

    const now = new Date()
    const clockIn = record.clockIn!

    // 计算工作时长
    const workHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

    // 检查是否早退
    let status = record.status
    const schedule = await prisma.schedule.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        shift: true,
      },
    })

    if (schedule?.shift) {
      const shiftEnd = this.parseTimeString(schedule.shift.endTime)
      const clockOutTime = now.getHours() * 60 + now.getMinutes()

      // 早于下班时间算早退
      if (clockOutTime < shiftEnd - 5 && status === 'NORMAL') {
        status = 'EARLY_LEAVE'
      }
    }

    return prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: now,
        clockOutType: data.type,
        clockOutLocation: data.location ? (data.location as Prisma.InputJsonValue) : undefined,
        workHours: Math.round(workHours * 100) / 100,
        status,
      },
    })
  }

  // 获取今日考勤
  async getTodayAttendance(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })
  }

  // 获取考勤列表
  async getAttendanceList(params: AttendanceQueryParams) {
    const { startDate, endDate, userId, status, page = 1, pageSize = 20 } = params

    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, Date>).gte = startDate
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = endDate
      }
    }

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.attendanceRecord.count({ where }),
    ])

    return {
      items: records,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  // 创建请假申请
  async createLeaveRequest(userId: string, data: CreateLeaveRequestData) {
    // 检查日期冲突
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { not: 'REJECTED' },
        OR: [
          {
            startDate: { lte: data.startDate },
            endDate: { gte: data.startDate },
          },
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.endDate },
          },
        ],
      },
    })

    if (existing) {
      throw new Error('该时间段已有请假申请')
    }

    return prisma.leaveRequest.create({
      data: {
        userId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days: data.days,
        reason: data.reason,
        status: 'PENDING',
      },
    })
  }

  // 获取请假列表
  async getLeaveRequests(params: LeaveRequestQueryParams) {
    const { userId, status, page = 1, pageSize = 20 } = params

    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ])

    return {
      items: requests,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  // 审批请假
  async approveLeaveRequest(requestId: string, approverId: string, approved: boolean, rejectReason?: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      throw new Error('请假申请不存在')
    }

    if (request.status !== 'PENDING') {
      throw new Error('该申请已被处理')
    }

    return prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approverId,
        approvedAt: new Date(),
        rejectReason: approved ? null : rejectReason,
      },
    })
  }

  // 获取考勤统计
  async getStatistics(userId: string, startDate: Date, endDate: Date): Promise<AttendanceStatistics> {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const totalDays = records.length
    const normalDays = records.filter(r => r.status === 'NORMAL').length
    const lateDays = records.filter(r => r.status === 'LATE').length
    const earlyLeaveDays = records.filter(r => r.status === 'EARLY_LEAVE').length
    const absentDays = records.filter(r => r.status === 'ABSENT').length
    const onLeaveDays = records.filter(r => r.status === 'ON_LEAVE').length

    const workHoursSum = records
      .filter(r => r.workHours)
      .reduce((sum, r) => sum + (r.workHours || 0), 0)

    const workDays = records.filter(r => r.workHours).length

    return {
      totalDays,
      normalDays,
      lateDays,
      earlyLeaveDays,
      absentDays,
      onLeaveDays,
      attendanceRate: totalDays > 0 ? Math.round((normalDays / totalDays) * 100) : 0,
      avgWorkHours: workDays > 0 ? Math.round((workHoursSum / workDays) * 100) / 100 : 0,
    }
  }

  // 管理员：补卡/修正考勤
  async correctAttendance(recordId: string, data: {
    clockIn?: Date
    clockOut?: Date
    status?: AttendanceStatus
    notes?: string
  }) {
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
    })

    if (!record) {
      throw new Error('考勤记录不存在')
    }

    // 重新计算工作时长
    let workHours: number | undefined
    if (data.clockIn && data.clockOut) {
      workHours = Math.round((data.clockOut.getTime() - data.clockIn.getTime()) / (1000 * 60 * 60) * 100) / 100
    }

    return prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        ...data,
        workHours,
      },
    })
  }

  // 辅助方法：解析时间字符串（如 "09:00"）为分钟数
  private parseTimeString(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + (minutes || 0)
  }
}

export const attendanceService = new AttendanceService()
