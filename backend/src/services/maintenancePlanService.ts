import { prisma } from '../lib/prisma'
import { differenceInDays } from 'date-fns'
import type {
  MaintenancePlanCreateInput,
  MaintenancePlanUpdateInput,
  MaintenancePlanQueryParams,
  PaginatedResponse,
  MaintenancePlanStatus,
  MaintenancePlanFrequency,
} from '../types/equipment'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export class MaintenancePlanService {
  async create(data: MaintenancePlanCreateInput, userId: string) {
    const plan = await prisma.maintenancePlan.create({
      data: { ...data, createdBy: userId },
      select: { id: true, code: true, status: true, createdAt: true },
    })
    return { ...plan, status: plan.status as MaintenancePlanStatus, createdAt: new Date(plan.createdAt) }
  }

  async update(id: string, data: MaintenancePlanUpdateInput) {
    const plan = await prisma.maintenancePlan.update({
      where: { id },
      data,
      select: { id: true, status: true, updatedAt: true },
    })
    return { ...plan, status: plan.status as MaintenancePlanStatus, updatedAt: new Date(plan.updatedAt) }
  }

  async delete(id: string): Promise<void> {
    await prisma.maintenancePlan.delete({ where: { id } })
  }

  async getById(id: string) {
    const plan = await prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        equipment: { select: { name: true, code: true } },
        template: { select: { name: true } },
      },
    })

    if (!plan) return null

    return {
      ...plan,
      frequency: plan.frequency as MaintenancePlanFrequency,
      status: plan.status as MaintenancePlanStatus,
      nextDate: new Date(plan.nextDate),
      createdAt: new Date(plan.createdAt),
      updatedAt: new Date(plan.updatedAt),
    }
  }

  async findMany(params: MaintenancePlanQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    equipmentId: string
    equipment: { name: string; code: string }
    planName: string
    frequency: MaintenancePlanFrequency
    nextDate: Date
    responsible: string
    reminderDays: number | null
    status: MaintenancePlanStatus
  }>> {
    const { page = 1, pageSize = 10, equipmentId, status, keyword } = params
    const skip = (page - 1) * pageSize

    const where = this.buildWhereClause({ equipmentId, status, keyword })

    const [total, data] = await Promise.all([
      prisma.maintenancePlan.count({ where }),
      prisma.maintenancePlan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nextDate: 'asc' },
        include: { equipment: { select: { name: true, code: true } } },
      }),
    ])

    return {
      items: data.map(item => ({
        ...item,
        frequency: item.frequency as MaintenancePlanFrequency,
        status: item.status as MaintenancePlanStatus,
        nextDate: new Date(item.nextDate),
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  async executePlan(id: string): Promise<void> {
    const plan = await prisma.maintenancePlan.findUnique({
      where: { id },
      select: { intervalDays: true, nextDate: true },
    })

    if (!plan) throw new Error('计划不存在')

    const nextDate = new Date(plan.nextDate)
    nextDate.setDate(nextDate.getDate() + plan.intervalDays)

    await prisma.maintenancePlan.update({
      where: { id },
      data: { nextDate, status: 'ACTIVE' },
    })
  }

  async getUpcomingPlans(days: number): Promise<Array<{
    id: string
    code: string
    planName: string
    equipment: { name: string; code: string }
    nextDate: Date
    responsible: string
    reminderDays: number | null
  }>> {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)

    const plans = await prisma.maintenancePlan.findMany({
      where: {
        status: { in: ['ACTIVE', 'WARNING'] },
        nextDate: { lte: targetDate },
      },
      include: { equipment: { select: { name: true, code: true } } },
      orderBy: { nextDate: 'asc' },
    })

    return plans.map(plan => ({ ...plan, nextDate: new Date(plan.nextDate) }))
  }

  async getStatistics(): Promise<{ total: number; active: number; warning: number; overdue: number }> {
    const [total, active, warning, overdue] = await Promise.all([
      prisma.maintenancePlan.count(),
      prisma.maintenancePlan.count({ where: { status: 'ACTIVE' } }),
      prisma.maintenancePlan.count({ where: { status: 'WARNING' } }),
      prisma.maintenancePlan.count({ where: { status: 'OVERDUE' } }),
    ])

    return { total, active, warning, overdue }
  }

  async executePlanWithRecord(id: string, userId: string): Promise<{ recordId: string }> {
    const plan = await prisma.maintenancePlan.findUnique({
      where: { id },
      include: { equipment: true },
    })

    if (!plan) throw new Error('保养计划不存在')

    const record = await prisma.maintenanceRecord.create({
      data: {
        equipmentId: plan.equipmentId,
        type: 'MAINTENANCE',
        content: `执行保养计划: ${plan.planName}`,
        status: 'PENDING',
        operator: userId,
        templateId: plan.templateId,
        startTime: new Date(),
        code: `MR${Date.now()}`,
        createdBy: userId,
      },
    })

    const nextDate = this.calculateNextDate(plan.intervalDays, plan.nextDate)
    await prisma.maintenancePlan.update({
      where: { id },
      data: { nextDate, status: 'ACTIVE' },
    })

    return { recordId: record.id }
  }

  private calculateNextDate(intervalDays: number, currentNextDate: Date): Date {
    const nextDate = new Date(currentNextDate)
    nextDate.setDate(nextDate.getDate() + intervalDays)
    return nextDate
  }

  async getCalendarData(year: number, month: number): Promise<Array<{
    id: string
    title: string
    date: string
    equipmentName: string
    equipmentId: string
    type: string
    status: string
  }>> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const plans = await prisma.maintenancePlan.findMany({
      where: {
        status: { in: ['ACTIVE', 'WARNING'] },
        nextDate: { gte: startDate, lte: endDate },
      },
      include: { equipment: true },
    })

    return plans.map(plan => ({
      id: plan.id,
      title: plan.planName,
      date: plan.nextDate.toISOString().split('T')[0],
      equipmentName: plan.equipment?.name || '',
      equipmentId: plan.equipmentId,
      type: 'maintenance',
      status: plan.status,
    }))
  }

  async checkReminders(): Promise<Array<{
    planId: string
    planName: string
    equipmentName: string
    equipmentId: string
    nextDate: Date
    daysUntil: number
    reminderType: 'urgent' | 'warning' | 'info'
  }>> {
    const now = new Date()
    const plans = await prisma.maintenancePlan.findMany({
      where: {
        status: { in: ['ACTIVE', 'WARNING'] },
        nextDate: { gte: now },
      },
      include: { equipment: true },
    })

    const reminders = []
    for (const plan of plans) {
      const daysUntil = differenceInDays(plan.nextDate, now)
      const reminderDays = plan.reminderDays ? [plan.reminderDays] : [7, 3, 1]

      if (reminderDays.includes(daysUntil)) {
        reminders.push({
          planId: plan.id,
          planName: plan.planName,
          equipmentName: plan.equipment?.name || '',
          equipmentId: plan.equipmentId,
          nextDate: plan.nextDate,
          daysUntil,
          reminderType: this.getReminderType(daysUntil),
        })
      }
    }

    return reminders
  }

  private getReminderType(daysUntil: number): 'urgent' | 'warning' | 'info' {
    if (daysUntil === 1) return 'urgent'
    if (daysUntil <= 3) return 'warning'
    return 'info'
  }

  parseCronExpression(cron: string): { nextDate: Date; description: string } {
    const parts = cron.split(' ')
    if (parts.length !== 5) {
      throw new Error('Cron表达式格式错误，应为: 分 时 日 月 周')
    }

    const [minute, hour, day, month, weekday] = parts
    const now = new Date()
    const nextDate = new Date(now)

    if (day === '*' && month === '*' && weekday === '*') {
      nextDate.setDate(nextDate.getDate() + 1)
      nextDate.setHours(parseInt(hour), parseInt(minute), 0, 0)
      return { nextDate, description: `每天 ${hour}:${minute}` }
    }

    if (day === '*' && month === '*' && weekday !== '*') {
      const targetDay = parseInt(weekday)
      const currentDay = nextDate.getDay()
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7
      nextDate.setDate(nextDate.getDate() + daysUntil)
      nextDate.setHours(parseInt(hour), parseInt(minute), 0, 0)
      return { nextDate, description: `每周${WEEKDAYS[targetDay]} ${hour}:${minute}` }
    }

    if (day !== '*' && month === '*') {
      const targetDate = parseInt(day)
      if (nextDate.getDate() >= targetDate) {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      nextDate.setDate(targetDate)
      nextDate.setHours(parseInt(hour), parseInt(minute), 0, 0)
      return { nextDate, description: `每月${day}日 ${hour}:${minute}` }
    }

    return { nextDate, description: cron }
  }

  private buildWhereClause(params: { equipmentId?: string; status?: string; keyword?: string }): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (params.equipmentId) where.equipmentId = params.equipmentId
    if (params.status) where.status = params.status
    if (params.keyword) {
      where.OR = [
        { code: { contains: params.keyword, mode: 'insensitive' } },
        { planName: { contains: params.keyword, mode: 'insensitive' } },
        { responsible: { contains: params.keyword, mode: 'insensitive' } },
        { equipment: { name: { contains: params.keyword, mode: 'insensitive' } } },
      ]
    }
    return where
  }
}

export const maintenancePlanService = new MaintenancePlanService()
