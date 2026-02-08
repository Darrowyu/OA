import { prisma } from '../lib/prisma'
import type {
  MaintenancePlanCreateInput,
  MaintenancePlanUpdateInput,
  MaintenancePlanQueryParams,
  PaginatedResponse,
  MaintenancePlanStatus,
  MaintenancePlanFrequency,
} from '../types/equipment'

export class MaintenancePlanService {
  async create(data: MaintenancePlanCreateInput, userId: string): Promise<{ id: string; code: string; status: MaintenancePlanStatus; createdAt: Date }> {
    const plan = await prisma.maintenancePlan.create({
      data: { ...data, createdBy: userId },
      select: { id: true, code: true, status: true, createdAt: true },
    })
    return { ...plan, status: plan.status as MaintenancePlanStatus, createdAt: new Date(plan.createdAt) }
  }

  async update(id: string, data: MaintenancePlanUpdateInput): Promise<{ id: string; status: MaintenancePlanStatus; updatedAt: Date }> {
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

  async getById(id: string): Promise<{
    id: string
    code: string
    equipmentId: string
    equipment: { name: string; code: string }
    planName: string
    frequency: MaintenancePlanFrequency
    intervalDays: number
    nextDate: Date
    responsible: string
    reminderDays: number | null
    status: MaintenancePlanStatus
    templateId: string | null
    template: { name: string } | null
    description: string | null
    createdAt: Date
    updatedAt: Date
  } | null> {
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

    const where: Record<string, unknown> = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (status) where.status = status
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { planName: { contains: keyword, mode: 'insensitive' } },
        { responsible: { contains: keyword, mode: 'insensitive' } },
        { equipment: { name: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

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
      data: data.map(item => ({
        ...item,
        frequency: item.frequency as MaintenancePlanFrequency,
        status: item.status as MaintenancePlanStatus,
        nextDate: new Date(item.nextDate),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
    const now = new Date()
    const targetDate = new Date(now)
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

  async getStatistics(): Promise<{
    total: number
    active: number
    warning: number
    overdue: number
  }> {
    const [total, active, warning, overdue] = await Promise.all([
      prisma.maintenancePlan.count(),
      prisma.maintenancePlan.count({ where: { status: 'ACTIVE' } }),
      prisma.maintenancePlan.count({ where: { status: 'WARNING' } }),
      prisma.maintenancePlan.count({ where: { status: 'OVERDUE' } }),
    ])

    return { total, active, warning, overdue }
  }
}

export const maintenancePlanService = new MaintenancePlanService()
