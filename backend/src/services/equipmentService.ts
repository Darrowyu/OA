import { prisma } from '../lib/prisma'
import * as XLSX from 'xlsx'
import type {
  EquipmentCreateInput,
  EquipmentUpdateInput,
  EquipmentQueryParams,
  PaginatedResponse,
  EquipmentStatistics,
} from '../types/equipment'
import { EquipmentStatus } from '../types/equipment'

const HEALTH_THRESHOLDS = {
  RUNNING: 80,
  WARNING: 60,
  CRITICAL: 30,
} as const

const STATUS_LABELS: Record<string, string> = {
  RUNNING: '运行中',
  WARNING: '告警',
  STOPPED: '停机',
  MAINTENANCE: '维修中',
  SCRAPPED: '报废',
}

const STATUS_MAP: Record<string, EquipmentStatus> = {
  运行中: EquipmentStatus.RUNNING,
  正常: EquipmentStatus.RUNNING,
  告警: EquipmentStatus.WARNING,
  停机: EquipmentStatus.STOPPED,
  维修中: EquipmentStatus.MAINTENANCE,
  报废: EquipmentStatus.SCRAPPED,
  RUNNING: EquipmentStatus.RUNNING,
  WARNING: EquipmentStatus.WARNING,
  STOPPED: EquipmentStatus.STOPPED,
  MAINTENANCE: EquipmentStatus.MAINTENANCE,
  SCRAPPED: EquipmentStatus.SCRAPPED,
}

export class EquipmentService {
  async create(data: EquipmentCreateInput, userId: string) {
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

  async update(id: string, data: EquipmentUpdateInput) {
    const equipment = await prisma.equipment.update({
      where: { id },
      data,
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

  async delete(id: string): Promise<void> {
    await prisma.equipment.delete({ where: { id } })
  }

  async getById(id: string) {
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
    _count: { maintenanceRecords: number }
  }>> {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
    const skip = (page - 1) * pageSize

    const where = this.buildWhereClause(params)

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
          _count: { select: { maintenanceRecords: true } },
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

  async getStatistics(): Promise<EquipmentStatistics> {
    const baseWhere = { deletedAt: null }

    const [total, running, warning, stopped, maintenance, scrapped] = await Promise.all([
      prisma.equipment.count({ where: baseWhere }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'RUNNING' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'WARNING' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'STOPPED' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { ...baseWhere, status: 'SCRAPPED' } }),
    ])

    return { total, running, warning, stopped, maintenance, scrapped }
  }

  async getCategories(): Promise<string[]> {
    const result = await prisma.equipment.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      orderBy: { category: 'asc' },
    })
    return result.map(item => item.category)
  }

  async getLocations(): Promise<string[]> {
    const result = await prisma.equipment.groupBy({
      by: ['location'],
      where: { deletedAt: null },
      orderBy: { location: 'asc' },
    })
    return result.map(item => item.location)
  }

  async updateHealth(
    id: string,
    metrics: {
      vibration?: number
      temperature?: number
      power?: number
      runtime?: number
      maintenance?: number
    }
  ): Promise<void> {
    const weights = {
      vibration: 0.25,
      temperature: 0.20,
      power: 0.20,
      runtime: 0.15,
      maintenance: 0.20,
    }

    let healthScore = 100
    let totalWeight = 0

    for (const [key, value] of Object.entries(metrics)) {
      if (value !== undefined) {
        const weight = weights[key as keyof typeof weights]
        healthScore -= (100 - value) * weight
        totalWeight += weight
      }
    }

    if (totalWeight > 0 && totalWeight < 1) {
      healthScore = 100 - (100 - healthScore) / totalWeight
    }

    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)))

    const status = this.getStatusByHealthScore(healthScore)

    await prisma.equipment.update({
      where: { id },
      data: { healthScore, status, healthMetrics: metrics },
    })
  }

  private getStatusByHealthScore(score: number): EquipmentStatus {
    if (score >= HEALTH_THRESHOLDS.RUNNING) return EquipmentStatus.RUNNING
    if (score >= HEALTH_THRESHOLDS.WARNING) return EquipmentStatus.WARNING
    if (score >= HEALTH_THRESHOLDS.CRITICAL) return EquipmentStatus.STOPPED
    return EquipmentStatus.SCRAPPED
  }

  async checkOverduePlans(): Promise<number> {
    const result = await prisma.maintenancePlan.updateMany({
      where: {
        nextDate: { lt: new Date() },
        status: { in: ['ACTIVE', 'WARNING'] },
      },
      data: { status: 'OVERDUE' },
    })
    return result.count
  }

  async batchDelete(ids: string[]): Promise<number> {
    const result = await prisma.equipment.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    })
    return result.count
  }

  async exportToExcel(filter: EquipmentQueryParams): Promise<Buffer> {
    const where = this.buildWhereClause(filter)

    const equipments = await prisma.equipment.findMany({
      where,
      include: { factory: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const data = equipments.map(eq => ({
      设备编号: eq.code,
      设备名称: eq.name,
      型号: eq.model,
      分类: eq.category,
      厂区: eq.factory?.name || '',
      位置: eq.location,
      制造商: eq.manufacturer || '',
      状态: STATUS_LABELS[eq.status] || eq.status,
      健康度: eq.healthScore || '',
      购买日期: eq.purchaseDate ? eq.purchaseDate.toISOString().split('T')[0] : '',
      保修到期: eq.warrantyDate ? eq.warrantyDate.toISOString().split('T')[0] : '',
      序列号: eq.serialNumber || '',
      描述: eq.description || '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '设备清单')

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  }

  async importFromExcel(buffer: Buffer, userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws) as Array<Record<string, string | number | undefined>>

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const code = String(row['设备编号'] || '').trim()
        const name = String(row['设备名称'] || '').trim()

        if (!code) throw new Error('设备编号不能为空')
        if (!name) throw new Error('设备名称不能为空')

        const existing = await prisma.equipment.findUnique({ where: { code } })
        if (existing) throw new Error(`设备编号 ${code} 已存在`)

        const statusText = String(row['状态'] || '运行中')
        const status = STATUS_MAP[statusText] || 'RUNNING'

        await prisma.equipment.create({
          data: {
            code,
            name,
            model: String(row['型号'] || ''),
            category: String(row['分类'] || ''),
            location: String(row['位置'] || ''),
            manufacturer: String(row['制造商'] || '') || null,
            status,
            serialNumber: String(row['序列号'] || '') || null,
            description: String(row['描述'] || '') || null,
            purchaseDate: row['购买日期'] ? new Date(String(row['购买日期'])) : null,
            warrantyDate: row['保修到期'] ? new Date(String(row['保修到期'])) : null,
            createdBy: userId,
          },
        })
        success++
      } catch (error) {
        failed++
        errors.push(`第 ${i + 2} 行: ${(error as Error).message}`)
      }
    }

    return { success, failed, errors }
  }

  async getFilterOptions(): Promise<{
    categories: string[]
    locations: string[]
    factories: Array<{ id: string; name: string }>
    statuses: Array<{ value: string; label: string }>
  }> {
    const [categories, locations, factories] = await Promise.all([
      prisma.equipment.findMany({
        where: { deletedAt: null },
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.equipment.findMany({
        where: { deletedAt: null },
        select: { location: true },
        distinct: ['location'],
      }),
      prisma.factory.findMany({
        where: { status: 'active' },
        select: { id: true, name: true },
      }),
    ])

    return {
      categories: categories.map(c => c.category).filter(Boolean),
      locations: locations.map(l => l.location).filter(Boolean),
      factories,
      statuses: [
        { value: 'RUNNING', label: '运行中' },
        { value: 'WARNING', label: '告警' },
        { value: 'STOPPED', label: '停机' },
        { value: 'MAINTENANCE', label: '维修中' },
        { value: 'SCRAPPED', label: '报废' },
      ],
    }
  }

  private buildWhereClause(params: EquipmentQueryParams): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null }

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

    return where
  }
}

export const equipmentService = new EquipmentService()
