import { prisma } from '../lib/prisma'
import * as logger from '../lib/logger'

export interface CreateShiftData {
  name: string
  startTime: string
  endTime: string
  breakTime?: number
  color?: string
}

export interface CreateScheduleData {
  userId: string
  date: Date
  shiftId: string
  isRestDay?: boolean
}

export interface BatchScheduleData {
  userIds: string[]
  dates: Date[]
  shiftId: string
}

export class ScheduleService {
  // 创建班次
  async createShift(data: CreateShiftData) {
    return prisma.shift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        breakTime: data.breakTime ?? 60,
        color: data.color,
      },
    })
  }

  // 更新班次
  async updateShift(shiftId: string, data: Partial<CreateShiftData>) {
    return prisma.shift.update({
      where: { id: shiftId },
      data,
    })
  }

  // 删除班次
  async deleteShift(shiftId: string) {
    // 检查是否有关联的排班
    const scheduleCount = await prisma.schedule.count({
      where: { shiftId },
    })

    if (scheduleCount > 0) {
      // 软删除：标记为禁用
      return prisma.shift.update({
        where: { id: shiftId },
        data: { isActive: false },
      })
    }

    return prisma.shift.delete({
      where: { id: shiftId },
    })
  }

  // 获取所有班次
  async getShifts(includeInactive = false) {
    return prisma.shift.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  // 获取单个班次
  async getShiftById(shiftId: string) {
    return prisma.shift.findUnique({
      where: { id: shiftId },
    })
  }

  // 创建排班
  async createSchedule(data: CreateScheduleData) {
    // 检查是否已有排班
    const existing = await prisma.schedule.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: data.date,
        },
      },
    })

    if (existing) {
      // 更新现有排班
      return prisma.schedule.update({
        where: { id: existing.id },
        data: {
          shiftId: data.shiftId,
          isRestDay: data.isRestDay ?? false,
        },
        include: {
          shift: true,
          user: {
            select: {
              id: true,
              name: true,
              employeeId: true,
            },
          },
        },
      })
    }

    return prisma.schedule.create({
      data: {
        userId: data.userId,
        date: data.date,
        shiftId: data.shiftId,
        isRestDay: data.isRestDay ?? false,
      },
      include: {
        shift: true,
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    })
  }

  // 批量创建排班
  async batchCreateSchedules(data: BatchScheduleData) {
    const results = []

    for (const userId of data.userIds) {
      for (const date of data.dates) {
        try {
          const schedule = await this.createSchedule({
            userId,
            date,
            shiftId: data.shiftId,
            isRestDay: false,
          })
          results.push(schedule)
        } catch (error) {
          logger.error('Failed to create schedule', { userId, date, error })
        }
      }
    }

    return results
  }

  // 删除排班
  async deleteSchedule(scheduleId: string) {
    return prisma.schedule.delete({
      where: { id: scheduleId },
    })
  }

  // 获取用户排班
  async getUserSchedules(userId: string, month: Date) {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    return prisma.schedule.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        shift: true,
      },
      orderBy: {
        date: 'asc',
      },
    })
  }

  // 获取部门排班
  async getDepartmentSchedules(departmentId: string, month: Date) {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    return prisma.schedule.findMany({
      where: {
        user: {
          departmentId,
        },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        shift: true,
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } },
      ],
    })
  }

  // 获取所有人的排班（管理员用）
  async getAllSchedules(month: Date) {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    return prisma.schedule.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        shift: true,
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } },
      ],
    })
  }

  // 设置休息日
  async setRestDay(userId: string, date: Date, isRestDay: boolean) {
    const existing = await prisma.schedule.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    })

    if (existing) {
      return prisma.schedule.update({
        where: { id: existing.id },
        data: { isRestDay },
      })
    }

    // 如果没有排班，获取默认班次或第一个可用班次
    const defaultShift = await prisma.shift.findFirst({
      where: { isActive: true },
    })

    if (!defaultShift) {
      throw new Error('没有可用的班次设置')
    }

    return prisma.schedule.create({
      data: {
        userId,
        date,
        shiftId: defaultShift.id,
        isRestDay,
      },
    })
  }

  // 复制排班
  async copySchedules(sourceMonth: Date, targetMonth: Date, userIds?: string[]) {
    const startOfSource = new Date(sourceMonth.getFullYear(), sourceMonth.getMonth(), 1)
    const endOfSource = new Date(sourceMonth.getFullYear(), sourceMonth.getMonth() + 1, 0)

    const where: Record<string, unknown> = {
      date: {
        gte: startOfSource,
        lte: endOfSource,
      },
    }

    if (userIds && userIds.length > 0) {
      where.userId = { in: userIds }
    }

    const sourceSchedules = await prisma.schedule.findMany({
      where,
      include: {
        shift: true,
      },
    })

    const results = []

    for (const schedule of sourceSchedules) {
      // 计算目标月份对应的日期
      const targetDate = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        schedule.date.getDate()
      )

      try {
        const newSchedule = await this.createSchedule({
          userId: schedule.userId,
          date: targetDate,
          shiftId: schedule.shiftId,
          isRestDay: schedule.isRestDay,
        })
        results.push(newSchedule)
      } catch (error) {
        logger.error('Failed to copy schedule', { error })
      }
    }

    return results
  }

  // 获取用户某天的排班
  async getUserScheduleByDate(userId: string, date: Date) {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    return prisma.schedule.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      include: {
        shift: true,
      },
    })
  }
}

export const scheduleService = new ScheduleService()
