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
  async create(data: PartCreateInput, userId: string) {
    const status = this.calculateStockStatus(data.stock || 0, data.minStock, data.maxStock)
    const part = await prisma.part.create({
      data: { ...data, unitPrice: data.unitPrice || null, status, createdBy: userId },
      select: { id: true, code: true, name: true, status: true, createdAt: true },
    })
    return { ...part, status: part.status as PartStatus, createdAt: new Date(part.createdAt) }
  }

  async update(id: string, data: PartUpdateInput) {
    const currentPart = await prisma.part.findUnique({
      where: { id },
      select: { stock: true, minStock: true, maxStock: true },
    })

    if (!currentPart) throw new Error('配件不存在')

    const updateData: Record<string, unknown> = { ...data }
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice
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

  async getById(id: string) {
    const part = await prisma.part.findUnique({ where: { id } })
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

    const where = this.buildPartWhereClause({ status, category, keyword, lowStock })

    const [total, data] = await Promise.all([
      prisma.part.count({ where }),
      prisma.part.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    ])

    return {
      items: data.map(item => ({
        ...item,
        status: item.status as PartStatus,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async stockIn(data: PartStockCreateInput, userId: string): Promise<void> {
    await this.executeStockOperation(data, userId, 'IN', (stock, qty) => stock + qty)
  }

  async stockOut(data: PartStockCreateInput, userId: string): Promise<void> {
    await this.executeStockOperation(
      data,
      userId,
      'OUT',
      (stock, qty) => {
        if (stock < qty) throw new Error('库存不足')
        return stock - qty
      }
    )
  }

  private async executeStockOperation(
    data: PartStockCreateInput,
    userId: string,
    _operationType: 'IN' | 'OUT',
    calculateNewStock: (current: number, quantity: number) => number,
    maxRetries = 3
  ): Promise<void> {
    let retries = 0

    while (retries < maxRetries) {
      try {
        await prisma.$transaction(async (tx) => {
          const part = await tx.$queryRaw`
            SELECT id, stock, minStock, maxStock, version
            FROM "Part" WHERE id = ${data.partId} FOR UPDATE
          ` as Array<{ id: string; stock: number; minStock: number; maxStock: number; version: number }>

          if (!part || part.length === 0) throw new Error('配件不存在')

          const p = part[0]
          const beforeStock = p.stock
          const afterStock = calculateNewStock(beforeStock, data.quantity)

          await tx.partStock.create({
            data: { ...data, beforeStock, afterStock, operator: userId, date: data.date || new Date() },
          })

          const status = this.calculateStockStatus(afterStock, p.minStock, p.maxStock)
          await tx.part.update({
            where: { id: data.partId, version: p.version },
            data: { stock: afterStock, status, version: { increment: 1 } },
          })
        }, { maxWait: 5000, timeout: 10000 })

        return
      } catch (error) {
        retries++
        if (retries >= maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, 100 * retries))
      }
    }
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

    const where = this.buildStockWhereClause({ partId, type, source, startDate, endDate, keyword })

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
      items: data.map(item => ({
        ...item,
        type: item.type as StockType,
        source: item.source as StockSource,
        date: new Date(item.date),
      })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async createUsage(data: PartUsageCreateInput) {
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
    await this.approvePartRequest(id, data, approverId, 'USAGE', async (tx, usage, part) => {
      if (part.stock < usage.quantity) throw new Error('库存不足')

      const afterStock = part.stock - usage.quantity

      await tx.partStock.create({
        data: {
          partId: usage.partId,
          type: 'OUT',
          quantity: usage.quantity,
          beforeStock: part.stock,
          afterStock,
          operator: usage.applicant,
          source: 'USAGE',
          date: new Date(),
          relatedId: usage.id,
          remark: `领用申请: ${usage.code}`,
        },
      })

      const status = this.calculateStockStatus(afterStock, part.minStock, part.maxStock)
      await tx.part.update({ where: { id: usage.partId }, data: { stock: afterStock, status } })
      await tx.partUsage.update({ where: { id }, data: { status: 'COMPLETED' } })
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

    const where = this.buildUsageWhereClause({ partId, status, applicant, startDate, endDate, keyword })

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
      items: data.map(item => ({
        ...item,
        status: item.status as PartUsageStatus,
        applyDate: new Date(item.applyDate),
        approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
      })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async createScrap(data: PartScrapCreateInput) {
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
    await this.approvePartRequest(id, data, approverId, 'SCRAP', async (tx, scrap, part) => {
      if (part.stock < scrap.quantity) throw new Error('库存不足')

      const afterStock = part.stock - scrap.quantity

      await tx.partStock.create({
        data: {
          partId: scrap.partId,
          type: 'OUT',
          quantity: scrap.quantity,
          beforeStock: part.stock,
          afterStock,
          operator: scrap.applicant,
          source: 'SCRAP',
          date: new Date(),
          relatedId: scrap.id,
          remark: `报废申请: ${scrap.code}`,
        },
      })

      const status = this.calculateStockStatus(afterStock, part.minStock, part.maxStock)
      await tx.part.update({ where: { id: scrap.partId }, data: { stock: afterStock, status } })
    })
  }

  private async approvePartRequest(
    id: string,
    data: { approved: boolean },
    approverId: string,
    requestType: 'USAGE' | 'SCRAP',
    onApproved: (tx: typeof prisma, request: { id: string; partId: string; quantity: number; applicant: string; code: string }, part: { stock: number; minStock: number; maxStock: number }) => Promise<void>
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const request = requestType === 'USAGE'
        ? await tx.partUsage.update({
            where: { id },
            data: { status: data.approved ? 'APPROVED' : 'REJECTED', approvedBy: approverId, approvedAt: new Date() },
          })
        : await tx.partScrap.update({
            where: { id },
            data: { status: data.approved ? 'APPROVED' : 'REJECTED', approvedBy: approverId, approvedAt: new Date() },
          })

      if (data.approved) {
        const part = await tx.part.findUnique({
          where: { id: request.partId },
          select: { stock: true, minStock: true, maxStock: true },
        })
        if (!part) throw new Error('配件不存在')

        await onApproved(tx as typeof prisma, request, part)
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

    const where = this.buildScrapWhereClause({ partId, status, applicant, startDate, endDate, keyword })

    const [total, data] = await Promise.all([
      prisma.partScrap.count({ where }),
      prisma.partScrap.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { applyDate: 'desc' },
        include: { part: { select: { name: true, code: true, model: true, unit: true } } },
      }),
    ])

    return {
      items: data.map(item => ({
        ...item,
        status: item.status as PartScrapStatus,
        originalValue: Number(item.originalValue),
        residualValue: Number(item.residualValue),
        applyDate: new Date(item.applyDate),
        approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
      })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
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

    const totalValue = parts.reduce((sum, p) => sum + (p.unitPrice ? Number(p.unitPrice) : 0) * p.stock, 0)

    return { total, normal, low, high, totalValue }
  }

  async getUsageStatistics(): Promise<PartUsageStatistics> {
    const { startOfMonth, endOfMonth } = this.getMonthRange()

    const [thisMonth, approved, pending, usages] = await Promise.all([
      prisma.partUsage.count({ where: { applyDate: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.partUsage.count({ where: { status: 'APPROVED' } }),
      prisma.partUsage.count({ where: { status: 'PENDING' } }),
      prisma.partUsage.findMany({
        where: { status: { in: ['APPROVED', 'COMPLETED'] }, applyDate: { gte: startOfMonth, lte: endOfMonth } },
        include: { part: { select: { unitPrice: true } } },
      }),
    ])

    const thisMonthValue = usages.reduce((sum, u) => sum + (u.part.unitPrice ? Number(u.part.unitPrice) : 0) * u.quantity, 0)

    return { thisMonth, approved, pending, thisMonthValue }
  }

  async getScrapStatistics(): Promise<PartScrapStatistics> {
    const startOfMonth = this.getMonthRange().startOfMonth

    const [thisMonth, approved, pending, scrapData] = await Promise.all([
      prisma.partScrap.count({ where: { applyDate: { gte: startOfMonth } } }),
      prisma.partScrap.count({ where: { status: 'APPROVED' } }),
      prisma.partScrap.count({ where: { status: 'PENDING' } }),
      prisma.partScrap.findMany({ where: { status: 'APPROVED' }, select: { originalValue: true, residualValue: true } }),
    ])

    const totalLoss = scrapData.reduce((sum, s) => sum + (Number(s.originalValue) - Number(s.residualValue)), 0)

    return { thisMonth, approved, pending, totalLoss }
  }

  async getStockStatistics(): Promise<StockStatistics> {
    const { startOfMonth, endOfMonth } = this.getMonthRange()

    const [thisMonthIn, thisMonthOut, operationCount, inResult, outResult] = await Promise.all([
      prisma.partStock.count({ where: { type: 'IN', date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.partStock.count({ where: { type: 'OUT', date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.partStock.count({ where: { date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.partStock.aggregate({ where: { type: 'IN', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { quantity: true } }),
      prisma.partStock.aggregate({ where: { type: 'OUT', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { quantity: true } }),
    ])

    return {
      thisMonthIn,
      thisMonthOut,
      netChange: (inResult._sum.quantity || 0) - (outResult._sum.quantity || 0),
      operationCount,
    }
  }

  private calculateStockStatus(stock: number, minStock: number, maxStock: number): PartStatus {
    if (stock < minStock) return 'LOW' as PartStatus
    if (stock > maxStock * 0.9) return 'HIGH' as PartStatus
    return 'NORMAL' as PartStatus
  }

  async getCategories(): Promise<string[]> {
    const result = await prisma.part.groupBy({ by: ['category'], orderBy: { category: 'asc' } })
    return result.map(item => item.category)
  }

  async getStockAlerts(): Promise<Array<{
    id: string; code: string; name: string; model: string; category: string
    stock: number; minStock: number; unit: string; supplier: string | null
  }>> {
    return this.getLowStock()
  }

  async generateRequisition(lowStockOnly = true): Promise<{
    requisitionNo: string; generateDate: Date; items: Array<{
      partId: string; code: string; name: string; model: string; category: string
      currentStock: number; minStock: number; suggestedQuantity: number; unit: string
      supplier: string | null; unitPrice: number | null; estimatedCost: number
    }>; totalItems: number; totalEstimatedCost: number
  }> {
    const where: { status?: 'LOW' } = lowStockOnly ? { status: 'LOW' } : {}
    const parts = await prisma.part.findMany({ where, orderBy: { stock: 'asc' } })

    const items = parts.map(p => {
      const suggestedQuantity = Math.max(0, (p.minStock || 0) * 3 - p.stock)
      const unitPrice = p.unitPrice ? Number(p.unitPrice) : null
      return {
        partId: p.id, code: p.code, name: p.name, model: p.model, category: p.category,
        currentStock: p.stock, minStock: p.minStock, suggestedQuantity, unit: p.unit,
        supplier: p.supplier, unitPrice, estimatedCost: unitPrice ? suggestedQuantity * unitPrice : 0,
      }
    }).filter(item => item.suggestedQuantity > 0)

    const totalEstimatedCost = items.reduce((sum, item) => sum + item.estimatedCost, 0)

    return {
      requisitionNo: `REQ-${Date.now()}`,
      generateDate: new Date(),
      items,
      totalItems: items.length,
      totalEstimatedCost,
    }
  }

  async getInventoryLogs(params: {
    page?: number; pageSize?: number; partId?: string
    type?: 'IN' | 'OUT'; startDate?: Date; endDate?: Date
  }): Promise<PaginatedResponse<{
    id: string; type: StockType; quantity: number; beforeStock: number; afterStock: number
    operator: string; source: StockSource; date: Date; remark: string | null; documentNo: string | null
  }>> {
    const { page = 1, pageSize = 20, partId, type, startDate, endDate } = params
    const skip = (page - 1) * pageSize

    const where = this.buildInventoryWhereClause({ partId, type, startDate, endDate })

    const [total, data] = await Promise.all([
      prisma.partStock.count({ where }),
      prisma.partStock.findMany({
        where, skip, take: pageSize,
        orderBy: { date: 'desc' },
        include: { part: { select: { name: true, code: true, model: true, unit: true } } },
      }),
    ])

    return {
      items: data.map(d => ({
        id: d.id, type: d.type as StockType, quantity: d.quantity,
        beforeStock: d.beforeStock, afterStock: d.afterStock,
        operator: d.operator, source: d.source as StockSource,
        date: new Date(d.date), remark: d.remark, documentNo: d.documentNo,
      })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async getLowStock(): Promise<Array<{
    id: string; code: string; name: string; model: string; category: string
    stock: number; minStock: number; unit: string; supplier: string | null
  }>> {
    const parts = await prisma.part.findMany({ where: { status: 'LOW' }, orderBy: { stock: 'asc' } })
    return parts.map(p => ({
      id: p.id, code: p.code, name: p.name, model: p.model,
      category: p.category, stock: p.stock, minStock: p.minStock,
      unit: p.unit, supplier: p.supplier,
    }))
  }

  async getTopUsed(limit = 10): Promise<Array<{
    partId: string; partName: string; partCode: string
    totalUsed: number; totalCost: number
  }>> {
    const usageData = await prisma.partStock.groupBy({
      by: ['partId'],
      where: { type: 'OUT' },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    })

    const partIds = usageData.map(u => u.partId)
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true, name: true, code: true, unitPrice: true },
    })
    const partMap = new Map(parts.map(p => [p.id, p]))

    return usageData.map(u => {
      const part = partMap.get(u.partId)
      const totalUsed = u._sum.quantity || 0
      return {
        partId: u.partId,
        partName: part?.name || '',
        partCode: part?.code || '',
        totalUsed,
        totalCost: totalUsed * (part?.unitPrice ? Number(part.unitPrice) : 0),
      }
    })
  }

  async getMonthlyStatistics(year?: number, month?: number): Promise<{
    stockIn: number; stockOut: number; usageApproved: number; scrapApproved: number
    stockInQuantity: number; stockOutQuantity: number
  }> {
    const { start, end } = this.getSpecificMonthRange(year, month)

    const [stockIn, stockOut, usageApproved, scrapApproved, inQty, outQty] = await Promise.all([
      prisma.partStock.count({ where: { type: 'IN', date: { gte: start, lte: end } } }),
      prisma.partStock.count({ where: { type: 'OUT', date: { gte: start, lte: end } } }),
      prisma.partUsage.count({ where: { status: { in: ['APPROVED', 'COMPLETED'] }, applyDate: { gte: start, lte: end } } }),
      prisma.partScrap.count({ where: { status: 'APPROVED', applyDate: { gte: start, lte: end } } }),
      prisma.partStock.aggregate({ where: { type: 'IN', date: { gte: start, lte: end } }, _sum: { quantity: true } }),
      prisma.partStock.aggregate({ where: { type: 'OUT', date: { gte: start, lte: end } }, _sum: { quantity: true } }),
    ])

    return {
      stockIn, stockOut, usageApproved, scrapApproved,
      stockInQuantity: inQty._sum.quantity || 0,
      stockOutQuantity: outQty._sum.quantity || 0,
    }
  }

  async getByCategoryStatistics(): Promise<Array<{
    category: string; count: number; totalStock: number; totalValue: number; lowStockCount: number
  }>> {
    const parts = await prisma.part.findMany({
      select: { category: true, stock: true, unitPrice: true, status: true },
    })

    const categoryMap = new Map<string, { count: number; totalStock: number; totalValue: number; lowStockCount: number }>()
    for (const p of parts) {
      const cat = p.category || '未分类'
      const existing = categoryMap.get(cat) || { count: 0, totalStock: 0, totalValue: 0, lowStockCount: 0 }
      existing.count++
      existing.totalStock += p.stock
      existing.totalValue += p.stock * (p.unitPrice ? Number(p.unitPrice) : 0)
      if (p.status === 'LOW') existing.lowStockCount++
      categoryMap.set(cat, existing)
    }

    return Array.from(categoryMap.entries()).map(([category, data]) => ({ category, ...data }))
  }

  async getByEquipmentStatistics(): Promise<Array<{
    equipmentId: string; equipmentName: string; usageCount: number; totalQuantity: number; totalCost: number
  }>> {
    const usages = await prisma.partUsage.findMany({
      where: { status: { in: ['APPROVED', 'COMPLETED'] }, equipmentId: { not: null } },
      include: { equipment: { select: { name: true } }, part: { select: { unitPrice: true } } },
    })

    const equipmentMap = new Map<string, { name: string; count: number; quantity: number; cost: number }>()
    for (const u of usages) {
      if (!u.equipmentId) continue
      const existing = equipmentMap.get(u.equipmentId) || { name: u.equipment?.name || '', count: 0, quantity: 0, cost: 0 }
      existing.count++
      existing.quantity += u.quantity
      existing.cost += u.quantity * (u.part.unitPrice ? Number(u.part.unitPrice) : 0)
      equipmentMap.set(u.equipmentId, existing)
    }

    return Array.from(equipmentMap.entries()).map(([equipmentId, data]) => ({
      equipmentId, equipmentName: data.name,
      usageCount: data.count, totalQuantity: data.quantity, totalCost: data.cost,
    }))
  }

  async getFullStatistics(): Promise<{
    basic: PartStatistics
    monthly: { stockIn: number; stockOut: number; usageApproved: number; scrapApproved: number; stockInQuantity: number; stockOutQuantity: number }
    byCategory: Array<{ category: string; count: number; totalStock: number; totalValue: number; lowStockCount: number }>
    topUsed: Array<{ partId: string; partName: string; partCode: string; totalUsed: number; totalCost: number }>
  }> {
    const [basic, monthly, byCategory, topUsed] = await Promise.all([
      this.getStatistics(),
      this.getMonthlyStatistics(),
      this.getByCategoryStatistics(),
      this.getTopUsed(10),
    ])
    return { basic, monthly, byCategory, topUsed }
  }

  async adjustStock(partId: string, data: { type: 'IN' | 'OUT' | 'ADJUST'; quantity: number; reason?: string }, userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const part = await tx.$queryRaw`
        SELECT id, stock, "minStock", "maxStock", version
        FROM "Part" WHERE id = ${partId} FOR UPDATE
      ` as Array<{ id: string; stock: number; minStock: number; maxStock: number; version: number }>

      if (!part || part.length === 0) throw new Error('配件不存在')

      const p = part[0]
      const afterStock = this.calculateAdjustedStock(p.stock, data)

      await tx.partStock.create({
        data: {
          partId,
          type: data.type === 'ADJUST' ? 'IN' : data.type,
          quantity: data.type === 'ADJUST' ? Math.abs(afterStock - p.stock) : data.quantity,
          beforeStock: p.stock,
          afterStock,
          operator: userId,
          source: 'ADJUST',
          date: new Date(),
          remark: data.reason || `库存${data.type === 'IN' ? '入库' : data.type === 'OUT' ? '出库' : '调整'}`,
        },
      })

      const status = this.calculateStockStatus(afterStock, p.minStock, p.maxStock)
      await tx.part.update({
        where: { id: partId, version: p.version },
        data: { stock: afterStock, status, version: { increment: 1 } },
      })
    }, { maxWait: 5000, timeout: 10000 })
  }

  private calculateAdjustedStock(currentStock: number, data: { type: 'IN' | 'OUT' | 'ADJUST'; quantity: number }): number {
    if (data.type === 'IN') return currentStock + data.quantity
    if (data.type === 'OUT') {
      if (currentStock < data.quantity) throw new Error('库存不足')
      return currentStock - data.quantity
    }
    return data.quantity
  }

  async batchAdjustStock(items: Array<{ partId: string; type: 'IN' | 'OUT' | 'ADJUST'; quantity: number; reason?: string }>, userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0, failed = 0
    const errors: string[] = []

    for (const item of items) {
      try {
        await this.adjustStock(item.partId, item, userId)
        success++
      } catch (error) {
        failed++
        errors.push(`配件 ${item.partId}: ${(error as Error).message}`)
      }
    }

    return { success, failed, errors }
  }

  async getPartInventoryLogs(partId: string, params: { page?: number; pageSize?: number; type?: string }): Promise<PaginatedResponse<{
    id: string; type: StockType; quantity: number; beforeStock: number; afterStock: number
    operator: string; source: StockSource; date: Date; remark: string | null; documentNo: string | null
  }>> {
    const { page = 1, pageSize = 20, type } = params
    const skip = (page - 1) * pageSize
    const where: Record<string, unknown> = { partId }
    if (type) where.type = type

    const [total, data] = await Promise.all([
      prisma.partStock.count({ where }),
      prisma.partStock.findMany({ where, skip, take: pageSize, orderBy: { date: 'desc' } }),
    ])

    return {
      items: data.map(d => ({ ...d, type: d.type as StockType, source: d.source as StockSource, date: new Date(d.date) })),
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  }

  async getPartUsageStatistics(partId: string): Promise<{
    totalUsed: number; totalCost: number; usageCount: number; avgMonthlyUsage: number
    topEquipments: Array<{ equipmentName: string; quantity: number }>
  }> {
    const usages = await prisma.partUsage.findMany({
      where: { partId, status: { in: ['APPROVED', 'COMPLETED'] } },
      include: { equipment: { select: { name: true } } },
    })

    const part = await prisma.part.findUnique({ where: { id: partId }, select: { unitPrice: true, createdAt: true } })
    const totalUsed = usages.reduce((sum, u) => sum + u.quantity, 0)
    const monthsSinceCreation = part ? Math.max(1, Math.ceil((Date.now() - part.createdAt.getTime()) / (30 * 24 * 3600 * 1000))) : 1

    const equipmentMap = new Map<string, number>()
    for (const u of usages) {
      const name = u.equipment?.name || '未关联设备'
      equipmentMap.set(name, (equipmentMap.get(name) || 0) + u.quantity)
    }

    return {
      totalUsed,
      totalCost: totalUsed * (part?.unitPrice ? Number(part.unitPrice) : 0),
      usageCount: usages.length,
      avgMonthlyUsage: Math.round(totalUsed / monthsSinceCreation),
      topEquipments: Array.from(equipmentMap.entries())
        .map(([equipmentName, quantity]) => ({ equipmentName, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    }
  }

  private getMonthRange(): { startOfMonth: Date; endOfMonth: Date } {
    const now = new Date()
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    }
  }

  private getSpecificMonthRange(year?: number, month?: number): { start: Date; end: Date } {
    const now = new Date()
    const y = year || now.getFullYear()
    const m = month || now.getMonth() + 1
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 0, 23, 59, 59),
    }
  }

  private buildPartWhereClause(params: { status?: string; category?: string; keyword?: string; lowStock?: boolean }): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (params.status) where.status = params.status
    if (params.category) where.category = params.category
    if (params.lowStock) where.status = 'LOW'
    if (params.keyword) {
      where.OR = [
        { code: { contains: params.keyword, mode: 'insensitive' } },
        { name: { contains: params.keyword, mode: 'insensitive' } },
        { model: { contains: params.keyword, mode: 'insensitive' } },
      ]
    }
    return where
  }

  private buildStockWhereClause(params: { partId?: string; type?: string; source?: string; startDate?: Date; endDate?: Date; keyword?: string }): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (params.partId) where.partId = params.partId
    if (params.type) where.type = params.type
    if (params.source) where.source = params.source
    if (params.startDate || params.endDate) {
      where.date = {}
      if (params.startDate) (where.date as Record<string, Date>).gte = params.startDate
      if (params.endDate) (where.date as Record<string, Date>).lte = params.endDate
    }
    if (params.keyword) {
      where.OR = [
        { documentNo: { contains: params.keyword, mode: 'insensitive' } },
        { part: { name: { contains: params.keyword, mode: 'insensitive' } } },
      ]
    }
    return where
  }

  private buildUsageWhereClause(params: { partId?: string; status?: string; applicant?: string; startDate?: Date; endDate?: Date; keyword?: string }): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (params.partId) where.partId = params.partId
    if (params.status) where.status = params.status
    if (params.applicant) where.applicant = params.applicant
    if (params.startDate || params.endDate) {
      where.applyDate = {}
      if (params.startDate) (where.applyDate as Record<string, Date>).gte = params.startDate
      if (params.endDate) (where.applyDate as Record<string, Date>).lte = params.endDate
    }
    if (params.keyword) {
      where.OR = [
        { code: { contains: params.keyword, mode: 'insensitive' } },
        { applicant: { contains: params.keyword, mode: 'insensitive' } },
        { purpose: { contains: params.keyword, mode: 'insensitive' } },
        { part: { name: { contains: params.keyword, mode: 'insensitive' } } },
      ]
    }
    return where
  }

  private buildScrapWhereClause(params: { partId?: string; status?: string; applicant?: string; startDate?: Date; endDate?: Date; keyword?: string }): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (params.partId) where.partId = params.partId
    if (params.status) where.status = params.status
    if (params.applicant) where.applicant = params.applicant
    if (params.startDate || params.endDate) {
      where.applyDate = {}
      if (params.startDate) (where.applyDate as Record<string, Date>).gte = params.startDate
      if (params.endDate) (where.applyDate as Record<string, Date>).lte = params.endDate
    }
    if (params.keyword) {
      where.OR = [
        { code: { contains: params.keyword, mode: 'insensitive' } },
        { reason: { contains: params.keyword, mode: 'insensitive' } },
        { part: { name: { contains: params.keyword, mode: 'insensitive' } } },
      ]
    }
    return where
  }

  private buildInventoryWhereClause(params: { partId?: string; type?: string; startDate?: Date; endDate?: Date }): Record<string, unknown> {
    const where: Record<string, unknown> = {}
    if (params.partId) where.partId = params.partId
    if (params.type) where.type = params.type
    if (params.startDate || params.endDate) {
      where.date = {}
      if (params.startDate) (where.date as Record<string, Date>).gte = params.startDate
      if (params.endDate) (where.date as Record<string, Date>).lte = params.endDate
    }
    return where
  }
}

export const partService = new PartService()
