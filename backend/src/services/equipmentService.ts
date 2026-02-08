import { prisma } from '../lib/prisma'
import type {
  EquipmentCreateInput,
  EquipmentUpdateInput,
  EquipmentQueryParams,
  PaginatedResponse,
  EquipmentStatistics,
  EquipmentStatus,
} from '../types/equipment'

export class EquipmentService {
  // 创建设备
  async create(data: EquipmentCreateInput, userId: string): Promise<{
    id: string
    code: string
    name: string
    model: string
    category: string
    location: string
    status: EquipmentStatus
    createdAt: Date
  }> {
    const equipment = await prisma.equipment.create({
      data: {
        ...data,
        createdBy: userId,
        purchasePrice: data.purchasePrice ?? null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        model: true,
        category: true,
        location: true,
        status: true,
        createdAt: true,
      },
    })

    return {
      ...equipment,
      createdAt: new Date(equipment.createdAt),
      status: equipment.status as EquipmentStatus,
    }
  }

  // 更新设备
  async update(id: string, data: EquipmentUpdateInput): Promise<{
    id: string
    code: string
    name: string
    status: EquipmentStatus
    updatedAt: Date
  }> {
    const updateData: Record<string, unknown> = { ...data }

    if (data.purchasePrice !== undefined) {
      updateData.purchasePrice = data.purchasePrice
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    })

    return {
      ...equipment,
      updatedAt: new Date(equipment.updatedAt),
      status: equipment.status as EquipmentStatus,
    }
  }

  // 删除设备
  async delete(id: string): Promise<void> {
    await prisma.equipment.delete({
      where: { id },
    })
  }

  // 获取设备详情
  async getById(id: string): Promise<{
    id: string
    code: string
    name: string
    model: string
    category: string
    manufacturer: string | null
    location: string
    status: EquipmentStatus
    healthScore: number | null
    purchaseDate: Date | null
    warrantyDate: Date | null
    purchasePrice: number | null
    serialNumber: string | null
    description: string | null
    lastMaintenanceAt: Date | null
    nextMaintenanceAt: Date | null
    totalWorkHours: number | null
    createdAt: Date
    updatedAt: Date
    _count: {
      maintenanceRecords: number
      maintenancePlans: number
    }
  } | null> {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            maintenanceRecords: true,
            maintenancePlans: true,
          },
        },
      },
    })

    if (!equipment) return null

    return {
      ...equipment,
      purchasePrice: equipment.purchasePrice ? Number(equipment.purchasePrice) / 100 : null,
      purchaseDate: equipment.purchaseDate ? new Date(equipment.purchaseDate) : null,
      warrantyDate: equipment.warrantyDate ? new Date(equipment.warrantyDate) : null,
      lastMaintenanceAt: equipment.lastMaintenanceAt ? new Date(equipment.lastMaintenanceAt) : null,
      nextMaintenanceAt: equipment.nextMaintenanceAt ? new Date(equipment.nextMaintenanceAt) : null,
      createdAt: new Date(equipment.createdAt),
      updatedAt: new Date(equipment.updatedAt),
      status: equipment.status as EquipmentStatus,
    }
  }

  // 分页查询设备
  async findMany(params: EquipmentQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    name: string
    model: string
    category: string
    location: string
    status: EquipmentStatus
    healthScore: number | null
    lastMaintenanceAt: Date | null
    nextMaintenanceAt: Date | null
    _count: {
      maintenanceRecords: number
    }
  }>> {
    const { page = 1, pageSize = 10, status, category, location, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (category) where.category = category
    if (location) where.location = { contains: location }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { model: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          model: true,
          category: true,
          location: true,
          status: true,
          healthScore: true,
          lastMaintenanceAt: true,
          nextMaintenanceAt: true,
          _count: {
            select: {
              maintenanceRecords: true,
            },
          },
        },
      }),
    ])

    return {
      data: data.map(item => ({
        ...item,
        status: item.status as EquipmentStatus,
        lastMaintenanceAt: item.lastMaintenanceAt ? new Date(item.lastMaintenanceAt) : null,
        nextMaintenanceAt: item.nextMaintenanceAt ? new Date(item.nextMaintenanceAt) : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // 获取设备统计
  async getStatistics(): Promise<EquipmentStatistics> {
    const [
      total,
      running,
      warning,
      stopped,
      maintenance,
      scrapped,
    ] = await Promise.all([
      prisma.equipment.count(),
      prisma.equipment.count({ where: { status: 'RUNNING' } }),
      prisma.equipment.count({ where: { status: 'WARNING' } }),
      prisma.equipment.count({ where: { status: 'STOPPED' } }),
      prisma.equipment.count({ where: { status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { status: 'SCRAPPED' } }),
    ])

    return {
      total,
      running,
      warning,
      stopped,
      maintenance,
      scrapped,
    }
  }

  // 获取所有分类
  async getCategories(): Promise<string[]> {
    const result = await prisma.equipment.groupBy({
      by: ['category'],
      orderBy: { category: 'asc' },
    })
    return result.map(item => item.category)
  }

  // 获取所有位置
  async getLocations(): Promise<string[]> {
    const result = await prisma.equipment.groupBy({
      by: ['location'],
      orderBy: { location: 'asc' },
    })
    return result.map(item => item.location)
  }

  // 更新设备健康度
  async updateHealth(id: string, healthScore: number): Promise<void> {
    let status: EquipmentStatus = 'RUNNING' as EquipmentStatus
    if (healthScore < 30) status = 'STOPPED' as EquipmentStatus
    else if (healthScore < 60) status = 'WARNING' as EquipmentStatus

    await prisma.equipment.update({
      where: { id },
      data: { healthScore, status },
    })
  }

  // 检查并更新逾期保养计划
  async checkOverduePlans(): Promise<number> {
    const now = new Date()
    const result = await prisma.maintenancePlan.updateMany({
      where: {
        nextDate: { lt: now },
        status: { in: ['ACTIVE', 'WARNING'] },
      },
      data: { status: 'OVERDUE' },
    })
    return result.count
  }
}

export const equipmentService = new EquipmentService()
