import { prisma } from '../lib/prisma'
import type {
  PartLifecycleCreateInput,
  PartLifecycleUpdateInput,
  PartLifecycleQueryParams,
  PaginatedResponse,
  PartLifecycleStatus,
} from '../types/equipment'

export class PartLifecycleService {
  async create(data: PartLifecycleCreateInput): Promise<{ id: string; status: PartLifecycleStatus; createdAt: Date }> {
    const lifecycle = await prisma.partLifecycle.create({
      data: {
        ...data,
        status: this.calculateStatus(data.remainingCycles, data.totalCycles),
      },
      select: { id: true, status: true, createdAt: true },
    })
    return { ...lifecycle, status: lifecycle.status as PartLifecycleStatus, createdAt: new Date(lifecycle.createdAt) }
  }

  async update(id: string, data: PartLifecycleUpdateInput): Promise<{ id: string; status: PartLifecycleStatus; updatedAt: Date }> {
    const current = await prisma.partLifecycle.findUnique({
      where: { id },
      select: { totalCycles: true },
    })

    if (!current) throw new Error('生命周期记录不存在')

    const updateData: Record<string, unknown> = { ...data }

    if (data.remainingCycles !== undefined) {
      updateData.status = this.calculateStatus(data.remainingCycles, current.totalCycles)
    }

    const lifecycle = await prisma.partLifecycle.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, updatedAt: true },
    })
    return { ...lifecycle, status: lifecycle.status as PartLifecycleStatus, updatedAt: new Date(lifecycle.updatedAt) }
  }

  async delete(id: string): Promise<void> {
    await prisma.partLifecycle.delete({ where: { id } })
  }

  async getById(id: string): Promise<{
    id: string
    partId: string
    part: { name: string; code: string; model: string }
    totalCycles: number
    installedCycles: number
    remainingCycles: number
    avgUsage: number
    status: PartLifecycleStatus
    installedAt: Date | null
    expectedEndDate: Date | null
    equipmentId: string | null
    createdAt: Date
    updatedAt: Date
  } | null> {
    const lifecycle = await prisma.partLifecycle.findUnique({
      where: { id },
      include: {
        part: { select: { name: true, code: true, model: true } },
      },
    })

    if (!lifecycle) return null

    return {
      ...lifecycle,
      status: lifecycle.status as PartLifecycleStatus,
      installedAt: lifecycle.installedAt ? new Date(lifecycle.installedAt) : null,
      expectedEndDate: lifecycle.expectedEndDate ? new Date(lifecycle.expectedEndDate) : null,
      createdAt: new Date(lifecycle.createdAt),
      updatedAt: new Date(lifecycle.updatedAt),
    }
  }

  async getByPartId(partId: string): Promise<{
    id: string
    partId: string
    totalCycles: number
    installedCycles: number
    remainingCycles: number
    avgUsage: number
    status: PartLifecycleStatus
    installedAt: Date | null
    expectedEndDate: Date | null
    equipmentId: string | null
  } | null> {
    const lifecycle = await prisma.partLifecycle.findUnique({
      where: { partId },
    })

    if (!lifecycle) return null

    return {
      ...lifecycle,
      status: lifecycle.status as PartLifecycleStatus,
      installedAt: lifecycle.installedAt ? new Date(lifecycle.installedAt) : null,
      expectedEndDate: lifecycle.expectedEndDate ? new Date(lifecycle.expectedEndDate) : null,
    }
  }

  async findMany(params: PartLifecycleQueryParams): Promise<PaginatedResponse<{
    id: string
    partId: string
    part: { name: string; code: string; model: string }
    totalCycles: number
    installedCycles: number
    remainingCycles: number
    avgUsage: number
    status: PartLifecycleStatus
    expectedEndDate: Date | null
  }>> {
    const { page = 1, pageSize = 10, partId, status, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (partId) where.partId = partId
    if (status) where.status = status
    if (keyword) {
      where.OR = [
        { part: { name: { contains: keyword, mode: 'insensitive' } } },
        { part: { code: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.partLifecycle.count({ where }),
      prisma.partLifecycle.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { expectedEndDate: 'asc' },
        include: {
          part: { select: { name: true, code: true, model: true } },
        },
      }),
    ])

    return {
      items: data.map(item => ({
        ...item,
        status: item.status as PartLifecycleStatus,
        expectedEndDate: item.expectedEndDate ? new Date(item.expectedEndDate) : null,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  async updateUsage(partId: string, cycles: number): Promise<void> {
    const lifecycle = await prisma.partLifecycle.findUnique({
      where: { partId },
      select: { totalCycles: true, installedCycles: true, remainingCycles: true },
    })

    if (!lifecycle) throw new Error('生命周期记录不存在')

    const newInstalledCycles = lifecycle.installedCycles + cycles
    const newRemainingCycles = Math.max(0, lifecycle.totalCycles - newInstalledCycles)
    const status = this.calculateStatus(newRemainingCycles, lifecycle.totalCycles)

    await prisma.partLifecycle.update({
      where: { partId },
      data: {
        installedCycles: newInstalledCycles,
        remainingCycles: newRemainingCycles,
        status,
      },
    })
  }

  async getStatistics(): Promise<{
    total: number
    active: number
    warning: number
    critical: number
    expired: number
  }> {
    const [total, active, warning, critical, expired] = await Promise.all([
      prisma.partLifecycle.count(),
      prisma.partLifecycle.count({ where: { status: 'ACTIVE' } }),
      prisma.partLifecycle.count({ where: { status: 'WARNING' } }),
      prisma.partLifecycle.count({ where: { status: 'CRITICAL' } }),
      prisma.partLifecycle.count({ where: { status: 'EXPIRED' } }),
    ])

    return { total, active, warning, critical, expired }
  }

  async checkExpired(): Promise<number> {
    const now = new Date()
    const result = await prisma.partLifecycle.updateMany({
      where: {
        expectedEndDate: { lt: now },
        status: { not: 'EXPIRED' },
      },
      data: { status: 'EXPIRED', remainingCycles: 0 },
    })
    return result.count
  }

  private calculateStatus(remainingCycles: number, totalCycles: number): PartLifecycleStatus {
    const usagePercent = ((totalCycles - remainingCycles) / totalCycles) * 100
    if (usagePercent >= 100) return 'EXPIRED' as PartLifecycleStatus
    if (usagePercent >= 90) return 'CRITICAL' as PartLifecycleStatus
    if (usagePercent >= 70) return 'WARNING' as PartLifecycleStatus
    return 'ACTIVE' as PartLifecycleStatus
  }
}

export const partLifecycleService = new PartLifecycleService()
