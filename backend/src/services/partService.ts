import { prisma } from '../lib/prisma'
import type {
  PartCreateInput,
  PartUpdateInput,
  PartQueryParams,
  PartStockCreateInput,
  PartStockQueryParams,
  PartUsageCreateInput,
  PartUsageApproveInput,
  PartUsageQueryParams,
  PartScrapCreateInput,
  PartScrapApproveInput,
  PartScrapQueryParams,
  PaginatedResponse,
  PartStatistics,
  PartUsageStatistics,
  PartScrapStatistics,
  StockStatistics,
  PartStatus,
  StockType,
  StockSource,
  PartUsageStatus,
  PartScrapStatus,
} from '../types/equipment'

export class PartService {
  async create(data: PartCreateInput, userId: string): Promise<{ id: string; code: string; name: string; status: PartStatus; createdAt: Date }> {
    const status = this.calculateStockStatus(data.stock || 0, data.minStock, data.maxStock)
    const part = await prisma.part.create({
      data: {
        ...data,
        unitPrice: data.unitPrice ? data.unitPrice : null,
        status,
        createdBy: userId,
      },
      select: { id: true, code: true, name: true, status: true, createdAt: true },
    })
    return { ...part, status: part.status as PartStatus, createdAt: new Date(part.createdAt) }
  }

  async update(id: string, data: PartUpdateInput): Promise<{ id: string; status: PartStatus; updatedAt: Date }> {
    const currentPart = await prisma.part.findUnique({
      where: { id },
      select: { stock: true, minStock: true, maxStock: true },
    })

    if (!currentPart) throw new Error('配件不存在')

    const updateData: Record<string, unknown> = { ...data }

    if (data.unitPrice !== undefined) {
      updateData.unitPrice = data.unitPrice
    }

    if (data.minStock !== undefined || data.maxStock !== undefined) {
      const minStock = data.minStock ?? currentPart.minStock
      const maxStock = data.maxStock ?? currentPart.maxStock
      updateData.status = this.calculateStockStatus(currentPart.stock, minStock, maxStock)
    }

    const part = await prisma.part.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, updatedAt: true },
    })
    return { ...part, status: part.status as PartStatus, updatedAt: new Date(part.updatedAt) }
  }

  async delete(id: string): Promise<void> {
    await prisma.part.delete({ where: { id } })
  }

  async getById(id: string): Promise<{
    id: string
    code: string
    name: string
    model: string
    category: string
    unit: string
    stock: number
    minStock: number
    maxStock: number
    location: string | null
    supplier: string | null
    status: PartStatus
    unitPrice: number | null
    description: string | null
    createdAt: Date
    updatedAt: Date
  } | null> {
    const part = await prisma.part.findUnique({
      where: { id },
    })

    if (!part) return null

    return {
      ...part,
      status: part.status as PartStatus,
      unitPrice: part.unitPrice ? Number(part.unitPrice) : null,
      createdAt: new Date(part.createdAt),
      updatedAt: new Date(part.updatedAt),
    }
  }

  async findMany(params: PartQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    name: string
    model: string
    category: string
    unit: string
    stock: number
    minStock: number
    maxStock: number
    location: string | null
    supplier: string | null
    status: PartStatus
    unitPrice: number | null
  }>> {
    const { page = 1, pageSize = 10, status, category, keyword, lowStock } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category
    if (lowStock) where.status = 'LOW'
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
        { model: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.part.count({ where }),
      prisma.part.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      data: data.map(item => ({
        ...item,
        status: item.status as PartStatus,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async stockIn(data: PartStockCreateInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const part = await tx.part.findUnique({
        where: { id: data.partId },
        select: { stock: true, minStock: true, maxStock: true },
      })

      if (!part) throw new Error('配件不存在')

      const beforeStock = part.stock
      const afterStock = beforeStock + data.quantity

      await tx.partStock.create({
        data: {
          ...data,
          beforeStock,
          afterStock,
          date: data.date || new Date(),
        },
      })

      const status = this.calculateStockStatus(afterStock, part.minStock, part.maxStock)
      await tx.part.update({
        where: { id: data.partId },
        data: { stock: afterStock, status },
      })
    })
  }

  async stockOut(data: PartStockCreateInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const part = await tx.part.findUnique({
        where: { id: data.partId },
        select: { stock: true, minStock: true, maxStock: true },
      })

      if (!part) throw new Error('配件不存在')
      if (part.stock < data.quantity) throw new Error('库存不足')

      const beforeStock = part.stock
      const afterStock = beforeStock - data.quantity

      await tx.partStock.create({
        data: {
          ...data,
          beforeStock,
          afterStock,
          date: data.date || new Date(),
        },
      })

      const status = this.calculateStockStatus(afterStock, part.minStock, part.maxStock)
      await tx.part.update({
        where: { id: data.partId },
        data: { stock: afterStock, status },
      })
    })
  }

  async findStockRecords(params: PartStockQueryParams): Promise<PaginatedResponse<{
    id: string
    partId: string
    part: { name: string; code: string; model: string; unit: string }
    type: StockType
    quantity: number
    beforeStock: number
    afterStock: number
    operator: string
    documentNo: string | null
    source: StockSource
    date: Date
    remark: string | null
  }>> {
    const { page = 1, pageSize = 10, partId, type, source, startDate, endDate, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (partId) where.partId = partId
    if (type) where.type = type
    if (source) where.source = source
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, Date>).gte = startDate
      if (endDate) (where.date as Record<string, Date>).lte = endDate
    }
    if (keyword) {
      where.OR = [
        { documentNo: { contains: keyword, mode: 'insensitive' } },
        { part: { name: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.partStock.count({ where }),
      prisma.partStock.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: { part: { select: { name: true, code: true, model: true, unit: true } } },
      }),
    ])

    return {
      data: data.map(item => ({
        ...item,
        type: item.type as StockType,
        source: item.source as StockSource,
        date: new Date(item.date),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async createUsage(data: PartUsageCreateInput): Promise<{ id: string; code: string; status: PartUsageStatus; createdAt: Date }> {
    const part = await prisma.part.findUnique({
      where: { id: data.partId },
      select: { stock: true },
    })

    if (!part) throw new Error('配件不存在')
    if (part.stock < data.quantity) throw new Error('库存不足')

    const usage = await prisma.partUsage.create({
      data,
      select: { id: true, code: true, status: true, createdAt: true },
    })
    return { ...usage, status: usage.status as PartUsageStatus, createdAt: new Date(usage.createdAt) }
  }

  async approveUsage(id: string, data: PartUsageApproveInput, approverId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const usage = await tx.partUsage.update({
        where: { id },
        data: {
          status: data.approved ? 'APPROVED' : 'REJECTED',
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      })

      if (data.approved) {
        const part = await tx.part.findUnique({
          where: { id: usage.partId },
          select: { stock: true, minStock: true, maxStock: true },
        })

        if (!part) throw new Error('配件不存在')
        if (part.stock < usage.quantity) throw new Error('库存不足')

        const beforeStock = part.stock
        const afterStock = beforeStock - usage.quantity

        await tx.partStock.create({
          data: {
            partId: usage.partId,
            type: 'OUT',
            quantity: usage.quantity,
            beforeStock,
            afterStock,
            operator: usage.applicant,
            source: 'USAGE',
            date: new Date(),
            relatedId: usage.id,
            remark: `领用申请: ${usage.code}`,
          },
        })

        const status = this.calculateStockStatus(afterStock, part.minStock, part.maxStock)
        await tx.part.update({
          where: { id: usage.partId },
          data: { stock: afterStock, status },
        })

        await tx.partUsage.update({
          where: { id },
          data: { status: 'COMPLETED' },
        })
      }
    })
  }

  async findUsageRecords(params: PartUsageQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    partId: string
    part: { name: string; code: string; model: string; unit: string }
    quantity: number
    applicant: string
    department: string
    purpose: string
    equipmentId: string | null
    equipment: { name: string } | null
    applyDate: Date
    status: PartUsageStatus
    approvedBy: string | null
    approvedAt: Date | null
  }>> {
    const { page = 1, pageSize = 10, partId, status, applicant, startDate, endDate, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (partId) where.partId = partId
    if (status) where.status = status
    if (applicant) where.applicant = applicant
    if (startDate || endDate) {
      where.applyDate = {}
      if (startDate) (where.applyDate as Record<string, Date>).gte = startDate
      if (endDate) (where.applyDate as Record<string, Date>).lte = endDate
    }
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { applicant: { contains: keyword, mode: 'insensitive' } },
        { purpose: { contains: keyword, mode: 'insensitive' } },
        { part: { name: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.partUsage.count({ where }),
      prisma.partUsage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { applyDate: 'desc' },
        include: {
          part: { select: { name: true, code: true, model: true, unit: true } },
          equipment: { select: { name: true } },
        },
      }),
    ])

    return {
      data: data.map(item => ({
        ...item,
        status: item.status as PartUsageStatus,
        applyDate: new Date(item.applyDate),
        approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async createScrap(data: PartScrapCreateInput): Promise<{ id: string; code: string; status: PartScrapStatus; createdAt: Date }> {
    const part = await prisma.part.findUnique({
      where: { id: data.partId },
      select: { stock: true },
    })

    if (!part) throw new Error('配件不存在')
    if (part.stock < data.quantity) throw new Error('库存不足')

    const scrap = await prisma.partScrap.create({
      data,
      select: { id: true, code: true, status: true, createdAt: true },
    })
    return { ...scrap, status: scrap.status as PartScrapStatus, createdAt: new Date(scrap.createdAt) }
  }

  async approveScrap(id: string, data: PartScrapApproveInput, approverId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const scrap = await tx.partScrap.update({
        where: { id },
        data: {
          status: data.approved ? 'APPROVED' : 'REJECTED',
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      })

      if (data.approved) {
        const part = await tx.part.findUnique({
          where: { id: scrap.partId },
          select: { stock: true, minStock: true, maxStock: true },
        })

        if (!part) throw new Error('配件不存在')
        if (part.stock < scrap.quantity) throw new Error('库存不足')

        const beforeStock = part.stock
        const afterStock = beforeStock - scrap.quantity

        await tx.partStock.create({
          data: {
            partId: scrap.partId,
            type: 'OUT',
            quantity: scrap.quantity,
            beforeStock,
            afterStock,
            operator: scrap.applicant,
            source: 'SCRAP',
            date: new Date(),
            relatedId: scrap.id,
            remark: `报废申请: ${scrap.code}`,
          },
        })

        const status = this.calculateStockStatus(afterStock, part.minStock, part.maxStock)
        await tx.part.update({
          where: { id: scrap.partId },
          data: { stock: afterStock, status },
        })
      }
    })
  }

  async findScrapRecords(params: PartScrapQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    partId: string
    part: { name: string; code: string; model: string; unit: string }
    quantity: number
    reason: string
    originalValue: number
    residualValue: number
    applicant: string
    applyDate: Date
    status: PartScrapStatus
    approvedBy: string | null
    approvedAt: Date | null
  }>> {
    const { page = 1, pageSize = 10, partId, status, applicant, startDate, endDate, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (partId) where.partId = partId
    if (status) where.status = status
    if (applicant) where.applicant = applicant
    if (startDate || endDate) {
      where.applyDate = {}
      if (startDate) (where.applyDate as Record<string, Date>).gte = startDate
      if (endDate) (where.applyDate as Record<string, Date>).lte = endDate
    }
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { reason: { contains: keyword, mode: 'insensitive' } },
        { part: { name: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.partScrap.count({ where }),
      prisma.partScrap.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { applyDate: 'desc' },
        include: {
          part: { select: { name: true, code: true, model: true, unit: true } },
        },
      }),
    ])

    return {
      data: data.map(item => ({
        ...item,
        status: item.status as PartScrapStatus,
        originalValue: Number(item.originalValue),
        residualValue: Number(item.residualValue),
        applyDate: new Date(item.applyDate),
        approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getStatistics(): Promise<PartStatistics> {
    const [total, normal, low, high] = await Promise.all([
      prisma.part.count(),
      prisma.part.count({ where: { status: 'NORMAL' } }),
      prisma.part.count({ where: { status: 'LOW' } }),
      prisma.part.count({ where: { status: 'HIGH' } }),
    ])

    const parts = await prisma.part.findMany({
      where: { unitPrice: { not: null } },
      select: { unitPrice: true, stock: true },
    })

    const totalValue = parts.reduce((sum, p) => {
      return sum + (p.unitPrice ? Number(p.unitPrice) : 0) * p.stock
    }, 0)

    return { total, normal, low, high, totalValue }
  }

  async getUsageStatistics(): Promise<PartUsageStatistics> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [thisMonth, approved, pending] = await Promise.all([
      prisma.partUsage.count({
        where: { applyDate: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.partUsage.count({ where: { status: 'APPROVED' } }),
      prisma.partUsage.count({ where: { status: 'PENDING' } }),
    ])

    const usages = await prisma.partUsage.findMany({
      where: {
        status: { in: ['APPROVED', 'COMPLETED'] },
        applyDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { part: { select: { unitPrice: true } } },
    })

    const thisMonthValue = usages.reduce((sum, u) => {
      return sum + (u.part.unitPrice ? Number(u.part.unitPrice) : 0) * u.quantity
    }, 0)

    return { thisMonth, approved, pending, thisMonthValue }
  }

  async getScrapStatistics(): Promise<PartScrapStatistics> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [thisMonth, approved, pending, scrapData] = await Promise.all([
      prisma.partScrap.count({
        where: { applyDate: { gte: startOfMonth } },
      }),
      prisma.partScrap.count({ where: { status: 'APPROVED' } }),
      prisma.partScrap.count({ where: { status: 'PENDING' } }),
      prisma.partScrap.findMany({
        where: { status: 'APPROVED' },
        select: { originalValue: true, residualValue: true },
      }),
    ])

    const totalLoss = scrapData.reduce((sum, s) => {
      return sum + (Number(s.originalValue) - Number(s.residualValue))
    }, 0)

    return { thisMonth, approved, pending, totalLoss }
  }

  async getStockStatistics(): Promise<StockStatistics> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [thisMonthIn, thisMonthOut, operationCount] = await Promise.all([
      prisma.partStock.count({
        where: { type: 'IN', date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.partStock.count({
        where: { type: 'OUT', date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.partStock.count({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ])

    const inResult = await prisma.partStock.aggregate({
      where: { type: 'IN', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { quantity: true },
    })

    const outResult = await prisma.partStock.aggregate({
      where: { type: 'OUT', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { quantity: true },
    })

    const inTotal = inResult._sum.quantity || 0
    const outTotal = outResult._sum.quantity || 0

    return {
      thisMonthIn,
      thisMonthOut,
      netChange: inTotal - outTotal,
      operationCount,
    }
  }

  private calculateStockStatus(stock: number, minStock: number, maxStock: number): PartStatus {
    if (stock < minStock) return 'LOW' as PartStatus
    if (stock > maxStock * 0.9) return 'HIGH' as PartStatus
    return 'NORMAL' as PartStatus
  }

  async getCategories(): Promise<string[]> {
    const result = await prisma.part.groupBy({
      by: ['category'],
      orderBy: { category: 'asc' },
    })
    return result.map(item => item.category)
  }
}

export const partService = new PartService()
