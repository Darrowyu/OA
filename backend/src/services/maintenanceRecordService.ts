import { prisma } from '../lib/prisma'
import type {
  MaintenanceRecordCreateInput,
  MaintenanceRecordUpdateInput,
  MaintenanceRecordQueryParams,
  PaginatedResponse,
  MaintenanceStatistics,
  MaintenanceType,
  MaintenanceRecordStatus,
} from '../types/equipment'

export class MaintenanceRecordService {
  // 创建记录
  async create(data: MaintenanceRecordCreateInput, userId: string): Promise<{ id: string; code: string; status: MaintenanceRecordStatus; createdAt: Date }> {
    const record = await prisma.maintenanceRecord.create({
      data: {
        ...data,
        createdBy: userId,
        cost: data.cost ?? null,
        partsUsed: data.partsUsed ? JSON.parse(JSON.stringify(data.partsUsed)) : null,
      },
      select: { id: true, code: true, status: true, createdAt: true },
    })

    return { ...record, status: record.status as MaintenanceRecordStatus, createdAt: new Date(record.createdAt) }
  }

  // 更新记录
  async update(id: string, data: MaintenanceRecordUpdateInput): Promise<{ id: string; status: MaintenanceRecordStatus; updatedAt: Date }> {
    const updateData: Record<string, unknown> = { ...data }
    if (data.cost !== undefined) updateData.cost = data.cost
    if (data.partsUsed !== undefined) updateData.partsUsed = JSON.parse(JSON.stringify(data.partsUsed))

    const record = await prisma.maintenanceRecord.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, updatedAt: true },
    })

    return { ...record, status: record.status as MaintenanceRecordStatus, updatedAt: new Date(record.updatedAt) }
  }

  // 完成记录
  async complete(id: string, data: { endTime: Date; duration: number; result: string; afterImages?: string[]; cost?: number }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: 'COMPLETED',
        endTime: data.endTime,
        duration: data.duration,
        result: data.result,
      }
      if (data.afterImages) updateData.afterImages = data.afterImages
      if (data.cost !== undefined) updateData.cost = data.cost

      await tx.maintenanceRecord.update({
        where: { id },
        data: updateData,
      })

      // 更新设备上次保养时间
      const record = await tx.maintenanceRecord.findUnique({
        where: { id },
        select: { equipmentId: true },
      })

      if (record) {
        await tx.equipment.update({
          where: { id: record.equipmentId },
          data: { lastMaintenanceAt: data.endTime },
        })
      }
    })
  }

  // 删除记录
  async delete(id: string): Promise<void> {
    await prisma.maintenanceRecord.delete({ where: { id } })
  }

  // 获取详情
  async getById(id: string): Promise<{
    id: string
    code: string
    equipmentId: string
    equipment: { name: string; code: string; location: string }
    type: MaintenanceType
    content: string
    operator: string
    startTime: Date
    endTime: Date | null
    duration: number | null
    estimatedDuration: number | null
    cost: number | null
    status: MaintenanceRecordStatus
    templateId: string | null
    template: { name: string } | null
    partsUsed: unknown
    result: string | null
    beforeImages: string[]
    afterImages: string[]
    createdAt: Date
    updatedAt: Date
  } | null> {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        equipment: { select: { name: true, code: true, location: true } },
        template: { select: { name: true } },
      },
    })

    if (!record) return null

    return {
      ...record,
      type: record.type as MaintenanceType,
      status: record.status as MaintenanceRecordStatus,
      cost: record.cost ? Number(record.cost) / 100 : null,
      startTime: new Date(record.startTime),
      endTime: record.endTime ? new Date(record.endTime) : null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    }
  }

  // 分页查询
  async findMany(params: MaintenanceRecordQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    equipmentId: string
    equipment: { name: string; code: string }
    type: MaintenanceType
    content: string
    operator: string
    startTime: Date
    endTime: Date | null
    cost: number | null
    status: MaintenanceRecordStatus
  }>> {
    const { page = 1, pageSize = 10, equipmentId, type, status, startDate, endDate, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (type) where.type = type
    if (status) where.status = status
    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) (where.startTime as Record<string, Date>).gte = startDate
      if (endDate) (where.startTime as Record<string, Date>).lte = endDate
    }
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
        { operator: { contains: keyword, mode: 'insensitive' } },
        { equipment: { name: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.maintenanceRecord.count({ where }),
      prisma.maintenanceRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: { equipment: { select: { name: true, code: true } } },
      }),
    ])

    return {
      items: data.map(item => ({
        ...item,
        type: item.type as MaintenanceType,
        status: item.status as MaintenanceRecordStatus,
        cost: item.cost ? Number(item.cost) / 100 : null,
        startTime: new Date(item.startTime),
        endTime: item.endTime ? new Date(item.endTime) : null,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  // 获取统计
  async getStatistics(): Promise<MaintenanceStatistics> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [
      totalRecords,
      thisMonthRecords,
      inProgress,
      completed,
      costResult,
    ] = await Promise.all([
      prisma.maintenanceRecord.count(),
      prisma.maintenanceRecord.count({
        where: { startTime: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.maintenanceRecord.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.maintenanceRecord.count({ where: { status: 'COMPLETED' } }),
      prisma.maintenanceRecord.aggregate({
        where: {
          status: 'COMPLETED',
          startTime: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { cost: true },
      }),
    ])

    return {
      totalRecords,
      thisMonthRecords,
      inProgress,
      completed,
      thisMonthCost: costResult._sum.cost ? Number(costResult._sum.cost) / 100 : 0,
    }
  }
}

export const maintenanceRecordService = new MaintenanceRecordService()
