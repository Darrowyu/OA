import { prisma } from '../lib/prisma'
import * as XLSX from 'xlsx'
import type {
  MaintenanceRecordCreateInput,
  MaintenanceRecordUpdateInput,
  MaintenanceRecordQueryParams,
  PaginatedResponse,
  MaintenanceStatistics,
  MaintenanceType,
  MaintenanceRecordStatus,
  PartUsedItem,
} from '../types/equipment'

interface MaintenanceExportParams {
  equipmentId?: string
  type?: MaintenanceType
  status?: MaintenanceRecordStatus
  startDate?: Date
  endDate?: Date
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

interface MaintenanceCostResult {
  partsCost: number
  laborCost: number
  totalCost: number
}

const TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: '保养',
  REPAIR: '维修',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

const SEVERITY_LABELS: Record<string, string> = {
  low: '轻微',
  moderate: '中等',
  high: '严重',
  critical: '致命',
}

const TYPE_MAP: Record<string, 'MAINTENANCE' | 'REPAIR'> = {
  保养: 'MAINTENANCE',
  维修: 'REPAIR',
  MAINTENANCE: 'MAINTENANCE',
  REPAIR: 'REPAIR',
}

const SEVERITY_MAP: Record<string, string> = {
  轻微: 'low',
  中等: 'moderate',
  严重: 'high',
  致命: 'critical',
  low: 'low',
  moderate: 'moderate',
  high: 'high',
  critical: 'critical',
}

export class MaintenanceRecordService {
  async create(data: MaintenanceRecordCreateInput, userId: string) {
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

  async update(id: string, data: MaintenanceRecordUpdateInput) {
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

      await tx.maintenanceRecord.update({ where: { id }, data: updateData })

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

  async delete(id: string): Promise<void> {
    await prisma.maintenanceRecord.delete({ where: { id } })
  }

  async getById(id: string) {
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

    const where = this.buildWhereClause({ equipmentId, type, status, startDate, endDate, keyword })

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

  async getStatistics(): Promise<MaintenanceStatistics> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [totalRecords, thisMonthRecords, inProgress, completed, costResult] = await Promise.all([
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

  async exportToExcel(filter: MaintenanceExportParams): Promise<Buffer> {
    const where = this.buildWhereClause(filter)

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: { equipment: { select: { name: true, code: true } } },
      orderBy: { startTime: 'desc' },
    })

    const data = records.map(record => ({
      维修编号: record.code,
      设备名称: record.equipment.name,
      类型: TYPE_LABELS[record.type] || record.type,
      内容: record.content,
      操作人: record.operator,
      开始时间: record.startTime ? this.formatDateTime(record.startTime) : '',
      结束时间: record.endTime ? this.formatDateTime(record.endTime) : '',
      费用: record.cost ? Number(record.cost) / 100 : '',
      状态: STATUS_LABELS[record.status] || record.status,
      严重度: SEVERITY_LABELS[record.severity || ''] || record.severity || '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '维修记录')

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  async importFromExcel(buffer: Buffer, userId: string): Promise<ImportResult> {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws) as Array<Record<string, string | number | undefined>>

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const code = String(row['维修编号'] || '').trim()
        const equipmentName = String(row['设备名称'] || '').trim()
        const typeText = String(row['类型'] || '').trim()
        const content = String(row['内容'] || '').trim()
        const operator = String(row['操作人'] || '').trim()
        const startTimeStr = String(row['开始时间'] || '').trim()

        if (!code) throw new Error('维修编号不能为空')
        if (!equipmentName) throw new Error('设备名称不能为空')
        if (!content) throw new Error('内容不能为空')
        if (!operator) throw new Error('操作人不能为空')
        if (!startTimeStr) throw new Error('开始时间不能为空')

        const existing = await prisma.maintenanceRecord.findUnique({ where: { code } })
        if (existing) throw new Error(`维修编号 ${code} 已存在`)

        const equipment = await prisma.equipment.findFirst({
          where: { name: { equals: equipmentName, mode: 'insensitive' }, deletedAt: null },
          select: { id: true },
        })
        if (!equipment) throw new Error(`设备 "${equipmentName}" 不存在`)

        const type = TYPE_MAP[typeText] || 'MAINTENANCE'
        const costVal = row['费用'] ? Number(row['费用']) : undefined
        const severityText = String(row['严重度'] || '').trim()
        const severity = SEVERITY_MAP[severityText] || null

        await prisma.maintenanceRecord.create({
          data: {
            code,
            equipmentId: equipment.id,
            type,
            content,
            operator,
            startTime: new Date(startTimeStr),
            endTime: row['结束时间'] ? new Date(String(row['结束时间'])) : null,
            cost: costVal !== undefined ? Math.round(costVal * 100) : null,
            severity,
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

  async getMaintenanceParts(maintenanceId: string): Promise<PartUsedItem[]> {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      select: { partsUsed: true },
    })

    if (!record) throw new Error('维修记录不存在')

    return (record.partsUsed as unknown as PartUsedItem[]) || []
  }

  async addMaintenancePart(maintenanceId: string, part: PartUsedItem): Promise<PartUsedItem[]> {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      select: { partsUsed: true },
    })

    if (!record) throw new Error('维修记录不存在')

    const currentParts = (record.partsUsed as unknown as PartUsedItem[]) || []
    const existingIndex = currentParts.findIndex(p => p.partId === part.partId)

    if (existingIndex >= 0) {
      currentParts[existingIndex].quantity += part.quantity
    } else {
      currentParts.push(part)
    }

    await prisma.maintenanceRecord.update({
      where: { id: maintenanceId },
      data: { partsUsed: JSON.parse(JSON.stringify(currentParts)) },
    })

    return currentParts
  }

  async removeMaintenancePart(maintenanceId: string, partId: string): Promise<PartUsedItem[]> {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      select: { partsUsed: true },
    })

    if (!record) throw new Error('维修记录不存在')

    const currentParts = (record.partsUsed as unknown as PartUsedItem[]) || []
    const filtered = currentParts.filter(p => p.partId !== partId)

    if (filtered.length === currentParts.length) {
      throw new Error('未找到该配件')
    }

    await prisma.maintenanceRecord.update({
      where: { id: maintenanceId },
      data: { partsUsed: filtered.length > 0 ? JSON.parse(JSON.stringify(filtered)) : null },
    })

    return filtered
  }

  async getMaintenanceCost(maintenanceId: string): Promise<MaintenanceCostResult> {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      select: { cost: true, partsUsed: true },
    })

    if (!record) throw new Error('维修记录不存在')

    const parts = (record.partsUsed as unknown as PartUsedItem[]) || []
    const partsCost = parts.reduce((sum, part) => sum + (part.unitPrice || 0) * part.quantity, 0)
    const laborCost = record.cost ? Number(record.cost) / 100 : 0

    return {
      partsCost,
      laborCost,
      totalCost: partsCost + laborCost,
    }
  }

  getOptions(): {
    types: Array<{ value: string; label: string }>
    statuses: Array<{ value: string; label: string }>
    severities: Array<{ value: string; label: string }>
  } {
    return {
      types: [
        { value: 'MAINTENANCE', label: '保养' },
        { value: 'REPAIR', label: '维修' },
      ],
      statuses: [
        { value: 'PENDING', label: '待处理' },
        { value: 'IN_PROGRESS', label: '进行中' },
        { value: 'COMPLETED', label: '已完成' },
        { value: 'CANCELLED', label: '已取消' },
      ],
      severities: [
        { value: 'low', label: '轻微' },
        { value: 'moderate', label: '中等' },
        { value: 'high', label: '严重' },
        { value: 'critical', label: '致命' },
      ],
    }
  }

  private buildWhereClause(params: {
    equipmentId?: string
    type?: string
    status?: string
    startDate?: Date
    endDate?: Date
    keyword?: string
  }): Record<string, unknown> {
    const where: Record<string, unknown> = {}

    if (params.equipmentId) where.equipmentId = params.equipmentId
    if (params.type) where.type = params.type
    if (params.status) where.status = params.status
    if (params.startDate || params.endDate) {
      where.startTime = {}
      if (params.startDate) (where.startTime as Record<string, Date>).gte = params.startDate
      if (params.endDate) (where.startTime as Record<string, Date>).lte = params.endDate
    }
    if (params.keyword) {
      where.OR = [
        { code: { contains: params.keyword, mode: 'insensitive' } },
        { content: { contains: params.keyword, mode: 'insensitive' } },
        { operator: { contains: params.keyword, mode: 'insensitive' } },
        { equipment: { name: { contains: params.keyword, mode: 'insensitive' } } },
      ]
    }

    return where
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }
}

export const maintenanceRecordService = new MaintenanceRecordService()
