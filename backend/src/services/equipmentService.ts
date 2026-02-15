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
    // 分页参数校验和限制
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10)) // 最大100条
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {
      deletedAt: null, // 软删除过滤
    }

    if (params.status) where.status = params.status
    if (params.category) where.category = params.category
    if (params.location) where.location = { contains: params.location }
    if (params.keyword) {
      where.OR = [
        { name: { contains: params.keyword, mode: 'insensitive' } },
        { code: { contains: params.keyword, mode: 'insensitive' } },
        { model: { contains: params.keyword, mode: 'insensitive' } },
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
      items: data.map(item => ({
        ...item,
        status: item.status as EquipmentStatus,
        lastMaintenanceAt: item.lastMaintenanceAt ? new Date(item.lastMaintenanceAt) : null,
        nextMaintenanceAt: item.nextMaintenanceAt ? new Date(item.nextMaintenanceAt) : null,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
}
  }

  // 获取设备统计（排除已删除）
  async getStatistics(): Promise<EquipmentStatistics> {
    const baseWhere = { deletedAt: null }

    const [
      total,
      running,
      warning,
      stopped,
      maintenance,
      scrapped,
    ] = await Promise.all([
      prisma.equipment.count({ where: baseWhere }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'RUNNING' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'WARNING' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'STOPPED' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'SCRAPPED' } }),
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

  // 获取所有分类（排除已删除）
  async getCategories(): Promise<string[]> {
    const result = await prisma.equipment.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      orderBy: { category: 'asc' },
    })
    return result.map(item => item.category)
  }

  // 获取所有位置（排除已删除）
  async getLocations(): Promise<string[]> {
    const result = await prisma.equipment.groupBy({
      by: ['location'],
      where: { deletedAt: null },
      orderBy: { location: 'asc' },
    })
    return result.map(item => item.location)
  }

  // 更新设备健康度（支持多维指标）
  async updateHealth(
    id: string,
    metrics: {
      vibration?: number      // 振动指标 0-100
      temperature?: number    // 温度指标 0-100
      power?: number          // 功率指标 0-100
      runtime?: number        // 运行时长指标 0-100
      maintenance?: number    // 维护状况 0-100
    }
  ): Promise<void> {
    // 权重配置
    const weights = {
      vibration: 0.25,   // 振动权重25%
      temperature: 0.20, // 温度权重20%
      power: 0.20,       // 功率权重20%
      runtime: 0.15,     // 运行时长权重15%
      maintenance: 0.20, // 维护状况权重20%
    }

    // 计算加权健康度
    let healthScore = 100
    let totalWeight = 0

    for (const [key, value] of Object.entries(metrics)) {
      if (value !== undefined) {
        const weight = weights[key as keyof typeof weights]
        healthScore -= (100 - value) * weight
        totalWeight += weight
      }
    }

    // 归一化（如果部分指标缺失）
    if (totalWeight > 0 && totalWeight < 1) {
      healthScore = 100 - (100 - healthScore) / totalWeight
    }

    // 确保在0-100范围内
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)))

    // 根据健康度确定状态
    let status: EquipmentStatus
    if (healthScore >= 80) {
      status = 'RUNNING' as EquipmentStatus
    } else if (healthScore >= 60) {
      status = 'WARNING' as EquipmentStatus
    } else if (healthScore >= 30) {
      status = 'STOPPED' as EquipmentStatus
    } else {
      status = 'SCRAPPED' as EquipmentStatus
    }

    await prisma.equipment.update({
      where: { id },
      data: {
        healthScore,
        status,
        healthMetrics: metrics, // 存储详细指标
      },
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
