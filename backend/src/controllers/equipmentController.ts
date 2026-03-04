import type { Request, Response } from 'express'
import { z } from 'zod'
import { equipmentService } from '../services/equipmentService'
import { maintenanceRecordService } from '../services/maintenanceRecordService'
import { maintenancePlanService } from '../services/maintenancePlanService'
import { maintenanceTemplateService } from '../services/maintenanceTemplateService'
import { partService } from '../services/partService'
import { sparePartCategoryService } from '../services/sparePartCategoryService'
import { partLifecycleService } from '../services/partLifecycleService'
import type {
  StockSource,
  EquipmentStatus,
  MaintenanceType,
  MaintenancePlanStatus,
  MaintenancePlanFrequency,
  MaintenanceTemplateStatus,
  PartStatus,
  StockType,
  PartUsageStatus,
  PartScrapStatus,
  PartLifecycleStatus,
  MaintenanceRecordStatus,
} from '../types/equipment'

type AuthRequest = Request & {
  user?: {
    id: string
    role: string
    isActive: boolean
  }
}

// ============ 响应辅助函数 ============

function successResponse<T>(res: Response, data: T, message?: string, status = 200): void {
  res.status(status).json({ success: true, data, message })
}

function notFoundResponse(res: Response, resource: string): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `${resource}不存在` } })
}

function badRequestResponse(res: Response, message: string): void {
  res.status(400).json({ success: false, error: { message } })
}

function sendExcelResponse(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.send(buffer)
}

// ============ 参数解析辅助函数 ============

function parsePagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  return {
    page: query.page ? parseInt(query.page as string, 10) : 1,
    pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
  }
}

function parseDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined
}

function getUserId(req: AuthRequest): string {
  return req.user!.id
}

function getOptionalUserId(req: AuthRequest): string {
  return req.user?.id || 'system'
}

async function handleGetById<T>(
  res: Response,
  serviceCall: () => Promise<T | null>,
  resourceName: string
): Promise<void> {
  const result = await serviceCall()
  if (!result) {
    notFoundResponse(res, resourceName)
    return
  }
  successResponse(res, result)
}

async function handleImportExcel(
  req: AuthRequest,
  res: Response,
  importFn: (buffer: Buffer, userId: string) => Promise<unknown>
): Promise<void> {
  if (!req.file?.buffer) {
    badRequestResponse(res, '请上传文件')
    return
  }
  const result = await importFn(req.file.buffer, getUserId(req))
  successResponse(res, result)
}

// ============ Schema 定义 ============

const createEquipmentSchema = z.object({
  code: z.string().min(1, '设备编号不能为空'),
  name: z.string().min(1, '设备名称不能为空'),
  model: z.string().min(1, '型号不能为空'),
  category: z.string().min(1, '分类不能为空'),
  location: z.string().min(1, '存放位置不能为空'),
  manufacturer: z.string().optional(),
  status: z.enum(['RUNNING', 'WARNING', 'STOPPED', 'MAINTENANCE', 'SCRAPPED']).optional(),
  healthScore: z.number().min(0).max(100).optional(),
  purchaseDate: z.string().datetime().optional().nullable(),
  warrantyDate: z.string().datetime().optional().nullable(),
  purchasePrice: z.number().optional(),
  serialNumber: z.string().optional(),
  description: z.string().optional(),
})

const updateEquipmentSchema = createEquipmentSchema.partial()

const paginationSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['RUNNING', 'WARNING', 'STOPPED', 'MAINTENANCE', 'SCRAPPED']).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  keyword: z.string().optional(),
})

const createMaintenanceRecordSchema = z.object({
  code: z.string().min(1, '记录编号不能为空'),
  equipmentId: z.string().min(1, '设备ID不能为空'),
  type: z.enum(['MAINTENANCE', 'REPAIR']),
  content: z.string().min(1, '内容不能为空'),
  operator: z.string().min(1, '操作人员不能为空'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional().nullable(),
  duration: z.number().optional(),
  estimatedDuration: z.number().optional(),
  cost: z.number().optional(),
  templateId: z.string().optional(),
  partsUsed: z.array(z.object({
    partId: z.string(),
    partName: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number().optional(),
  })).optional(),
  result: z.string().optional(),
  beforeImages: z.array(z.string()).optional(),
  afterImages: z.array(z.string()).optional(),
})

const completeMaintenanceSchema = z.object({
  endTime: z.string().datetime(),
  duration: z.number().min(1, '耗时必须大于0'),
  result: z.string().min(1, '结果不能为空'),
  afterImages: z.array(z.string()).optional(),
  cost: z.number().optional(),
})

const createMaintenancePlanSchema = z.object({
  code: z.string().min(1, '计划编号不能为空'),
  equipmentId: z.string().min(1, '设备ID不能为空'),
  planName: z.string().min(1, '计划名称不能为空'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
  intervalDays: z.number().min(1, '间隔天数必须大于0'),
  nextDate: z.string().datetime(),
  responsible: z.string().min(1, '负责人不能为空'),
  reminderDays: z.number().optional(),
  templateId: z.string().optional(),
  description: z.string().optional(),
})

const updateMaintenancePlanSchema = createMaintenancePlanSchema.partial().omit({ code: true, equipmentId: true })

const createMaintenanceTemplateSchema = z.object({
  code: z.string().min(1, '模板编号不能为空'),
  name: z.string().min(1, '模板名称不能为空'),
  category: z.string().min(1, '分类不能为空'),
  items: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean(),
  })),
  estimatedTime: z.number().min(1, '预计耗时必须大于0'),
})

const createPartSchema = z.object({
  code: z.string().min(1, '配件编号不能为空'),
  name: z.string().min(1, '配件名称不能为空'),
  model: z.string().min(1, '型号不能为空'),
  category: z.string().min(1, '分类不能为空'),
  unit: z.string().min(1, '单位不能为空'),
  stock: z.number().min(0).optional(),
  minStock: z.number().min(0),
  maxStock: z.number().min(0),
  location: z.string().optional(),
  supplier: z.string().optional(),
  unitPrice: z.number().min(0).optional(),
  description: z.string().optional(),
})

const stockOperationSchema = z.object({
  partId: z.string().min(1, '配件ID不能为空'),
  quantity: z.number().min(1, '数量必须大于0'),
  operator: z.string().min(1, '操作人员不能为空'),
  documentNo: z.string().optional(),
  source: z.enum(['PURCHASE', 'RETURN', 'PRODUCE', 'USAGE', 'SCRAP', 'ADJUST', 'OTHER']),
  remark: z.string().optional(),
})

const createPartUsageSchema = z.object({
  code: z.string().min(1, '申请单号不能为空'),
  partId: z.string().min(1, '配件ID不能为空'),
  quantity: z.number().min(1, '数量必须大于0'),
  applicant: z.string().min(1, '申请人不能为空'),
  department: z.string().min(1, '部门不能为空'),
  purpose: z.string().min(1, '用途不能为空'),
  equipmentId: z.string().optional(),
  applyDate: z.string().datetime(),
  remark: z.string().optional(),
})

const approveSchema = z.object({
  approved: z.boolean(),
  remark: z.string().optional(),
})

const createPartScrapSchema = z.object({
  code: z.string().min(1, '申请单号不能为空'),
  partId: z.string().min(1, '配件ID不能为空'),
  quantity: z.number().min(1, '数量必须大于0'),
  reason: z.string().min(1, '原因不能为空'),
  originalValue: z.number().min(0),
  residualValue: z.number().min(0),
  applicant: z.string().min(1, '申请人不能为空'),
  applyDate: z.string().datetime(),
  remark: z.string().optional(),
})

const createPartLifecycleSchema = z.object({
  partId: z.string().min(1, '配件ID不能为空'),
  totalCycles: z.number().min(1, '总周期必须大于0'),
  installedCycles: z.number().min(0).optional(),
  remainingCycles: z.number().min(0),
  avgUsage: z.number().min(0),
  installedAt: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  equipmentId: z.string().optional(),
})

const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  parentId: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
})

// ============ Equipment Controller ============

export const equipmentController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createEquipmentSchema.parse(req.body)

    const equipment = await equipmentService.create({
      ...data,
      status: data.status as EquipmentStatus | undefined,
      purchaseDate: parseDate(data.purchaseDate ?? undefined),
      warrantyDate: parseDate(data.warrantyDate ?? undefined),
    }, getUserId(req))

    successResponse(res, equipment, '设备创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = updateEquipmentSchema.parse(req.body)

    const equipment = await equipmentService.update(req.params.id, {
      ...data,
      status: data.status as EquipmentStatus | undefined,
      purchaseDate: parseDate(data.purchaseDate ?? undefined),
      warrantyDate: parseDate(data.warrantyDate ?? undefined),
    })

    successResponse(res, equipment, '设备更新成功')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await equipmentService.delete(req.params.id)
    successResponse(res, null, '设备删除成功')
  },

  async getById(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => equipmentService.getById(req.params.id), '设备')
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = paginationSchema.parse(req.query)
    const { page, pageSize } = parsePagination(query)

    const result = await equipmentService.findMany({
      page,
      pageSize,
      status: query.status as EquipmentStatus | undefined,
      category: query.category,
      location: query.location,
      keyword: query.keyword,
    })

    successResponse(res, result)
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await equipmentService.getStatistics())
  },

  async getCategories(_req: Request, res: Response): Promise<void> {
    successResponse(res, await equipmentService.getCategories())
  },

  async getLocations(_req: Request, res: Response): Promise<void> {
    successResponse(res, await equipmentService.getLocations())
  },

  async batchDelete(req: Request, res: Response): Promise<void> {
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body)
    const count = await equipmentService.batchDelete(ids)
    successResponse(res, { count }, `成功删除 ${count} 台设备`)
  },

  async exportExcel(req: Request, res: Response): Promise<void> {
    const query = paginationSchema.parse(req.query)
    const buffer = await equipmentService.exportToExcel({
      status: query.status as EquipmentStatus | undefined,
      category: query.category,
      location: query.location,
      keyword: query.keyword,
    })
    sendExcelResponse(res, buffer, 'equipments.xlsx')
  },

  async importExcel(req: AuthRequest, res: Response): Promise<void> {
    await handleImportExcel(req, res, equipmentService.importFromExcel.bind(equipmentService))
  },

  async getFilterOptions(_req: Request, res: Response): Promise<void> {
    successResponse(res, await equipmentService.getFilterOptions())
  },
}

// ============ Maintenance Record Controller ============

export const maintenanceRecordController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createMaintenanceRecordSchema.parse(req.body)

    const record = await maintenanceRecordService.create({
      ...data,
      type: data.type as MaintenanceType,
      startTime: new Date(data.startTime),
      endTime: parseDate(data.endTime ?? undefined),
    }, getUserId(req))

    successResponse(res, record, '记录创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = createMaintenanceRecordSchema.partial().parse(req.body)

    const record = await maintenanceRecordService.update(req.params.id, {
      ...data,
      type: data.type as MaintenanceType | undefined,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: parseDate(data.endTime ?? undefined),
    })

    successResponse(res, record, '记录更新成功')
  },

  async complete(req: Request, res: Response): Promise<void> {
    const data = completeMaintenanceSchema.parse(req.body)

    await maintenanceRecordService.complete(req.params.id, {
      ...data,
      endTime: new Date(data.endTime),
    })

    successResponse(res, null, '记录已完成')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await maintenanceRecordService.delete(req.params.id)
    successResponse(res, null, '记录删除成功')
  },

  async getById(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => maintenanceRecordService.getById(req.params.id), '记录')
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await maintenanceRecordService.findMany({
      page,
      pageSize,
      equipmentId: query.equipmentId as string,
      type: query.type as MaintenanceType | undefined,
      status: query.status as MaintenanceRecordStatus | undefined,
      startDate: parseDate(query.startDate as string),
      endDate: parseDate(query.endDate as string),
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await maintenanceRecordService.getStatistics())
  },

  async exportExcel(req: Request, res: Response): Promise<void> {
    const query = req.query
    const buffer = await maintenanceRecordService.exportToExcel({
      equipmentId: query.equipmentId as string | undefined,
      type: query.type as MaintenanceType | undefined,
      status: query.status as MaintenanceRecordStatus | undefined,
      startDate: parseDate(query.startDate as string),
      endDate: parseDate(query.endDate as string),
    })
    sendExcelResponse(res, buffer, 'maintenance_records.xlsx')
  },

  async importExcel(req: AuthRequest, res: Response): Promise<void> {
    await handleImportExcel(req, res, maintenanceRecordService.importFromExcel.bind(maintenanceRecordService))
  },

  async getOptions(_req: Request, res: Response): Promise<void> {
    successResponse(res, maintenanceRecordService.getOptions())
  },

  async getMaintenanceParts(req: Request, res: Response): Promise<void> {
    const parts = await maintenanceRecordService.getMaintenanceParts(req.params.maintenanceId)
    successResponse(res, parts)
  },

  async addMaintenancePart(req: Request, res: Response): Promise<void> {
    const partData = z.object({
      partId: z.string().min(1, '配件ID不能为空'),
      partName: z.string().min(1, '配件名称不能为空'),
      quantity: z.number().min(1, '数量必须大于0'),
      unit: z.string().min(1, '单位不能为空'),
      unitPrice: z.number().optional(),
    }).parse(req.body)

    const parts = await maintenanceRecordService.addMaintenancePart(req.params.maintenanceId, partData)
    successResponse(res, parts, '配件添加成功')
  },

  async removeMaintenancePart(req: Request, res: Response): Promise<void> {
    const parts = await maintenanceRecordService.removeMaintenancePart(req.params.maintenanceId, req.params.partId)
    successResponse(res, parts, '配件移除成功')
  },

  async getMaintenanceCost(req: Request, res: Response): Promise<void> {
    const cost = await maintenanceRecordService.getMaintenanceCost(req.params.maintenanceId)
    successResponse(res, cost)
  },
}

// ============ Maintenance Plan Controller ============

const PLAN_FREQUENCIES = [
  { value: 'DAILY', label: '每日' },
  { value: 'WEEKLY', label: '每周' },
  { value: 'MONTHLY', label: '每月' },
  { value: 'QUARTERLY', label: '每季度' },
  { value: 'HALF_YEARLY', label: '每半年' },
  { value: 'YEARLY', label: '每年' },
] as const

const PLAN_STATUSES = [
  { value: 'ACTIVE', label: '进行中' },
  { value: 'WARNING', label: '即将到期' },
  { value: 'OVERDUE', label: '已逾期' },
  { value: 'PAUSED', label: '已暂停' },
] as const

export const maintenancePlanController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createMaintenancePlanSchema.parse(req.body)

    const plan = await maintenancePlanService.create({
      ...data,
      frequency: data.frequency as MaintenancePlanFrequency,
      nextDate: new Date(data.nextDate),
    }, getUserId(req))

    successResponse(res, plan, '计划创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = updateMaintenancePlanSchema.parse(req.body)

    const plan = await maintenancePlanService.update(req.params.id, {
      ...data,
      frequency: data.frequency as MaintenancePlanFrequency | undefined,
      nextDate: parseDate(data.nextDate ?? undefined),
    })

    successResponse(res, plan, '计划更新成功')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await maintenancePlanService.delete(req.params.id)
    successResponse(res, null, '计划删除成功')
  },

  async getById(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => maintenancePlanService.getById(req.params.id), '计划')
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await maintenancePlanService.findMany({
      page,
      pageSize,
      equipmentId: query.equipmentId as string,
      status: query.status as MaintenancePlanStatus | undefined,
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async execute(req: AuthRequest, res: Response): Promise<void> {
    const result = await maintenancePlanService.executePlanWithRecord(req.params.id, getUserId(req))
    successResponse(res, result, '计划执行成功，已创建保养记录')
  },

  async getUpcoming(req: Request, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string, 10) || 7
    successResponse(res, await maintenancePlanService.getUpcomingPlans(days))
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await maintenancePlanService.getStatistics())
  },

  async getCalendar(req: Request, res: Response): Promise<void> {
    const year = parseInt(req.query.year as string) || new Date().getFullYear()
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1
    successResponse(res, await maintenancePlanService.getCalendarData(year, month))
  },

  async checkReminders(_req: Request, res: Response): Promise<void> {
    successResponse(res, await maintenancePlanService.checkReminders())
  },

  async getOptions(_req: Request, res: Response): Promise<void> {
    successResponse(res, { frequencies: PLAN_FREQUENCIES, statuses: PLAN_STATUSES })
  },

  async markReminderRead(req: Request, res: Response): Promise<void> {
    const plan = await maintenancePlanService.getById(req.params.id)
    if (!plan) {
      notFoundResponse(res, '保养计划')
      return
    }
    successResponse(res, { id: req.params.id, readAt: new Date() }, '提醒已标记为已读')
  },
}

// ============ Maintenance Template Controller ============

export const maintenanceTemplateController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createMaintenanceTemplateSchema.parse(req.body)
    const template = await maintenanceTemplateService.create(data, getUserId(req))
    successResponse(res, template, '模板创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = createMaintenanceTemplateSchema.partial().parse(req.body)
    const template = await maintenanceTemplateService.update(req.params.id, data)
    successResponse(res, template, '模板更新成功')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await maintenanceTemplateService.delete(req.params.id)
    successResponse(res, null, '模板删除成功')
  },

  async getById(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => maintenanceTemplateService.getById(req.params.id), '模板')
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await maintenanceTemplateService.findMany({
      page,
      pageSize,
      status: query.status as MaintenanceTemplateStatus | undefined,
      category: query.category as string,
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async getCategories(_req: Request, res: Response): Promise<void> {
    successResponse(res, await maintenanceTemplateService.getCategories())
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await maintenanceTemplateService.getStatistics())
  },

  async getEquipmentTypes(_req: Request, res: Response): Promise<void> {
    successResponse(res, await equipmentService.getCategories())
  },
}

// ============ Part Controller ============

const PART_STATUSES = [
  { value: 'NORMAL', label: '正常' },
  { value: 'LOW', label: '库存不足' },
  { value: 'HIGH', label: '库存过高' },
  { value: 'DISCONTINUED', label: '已停用' },
] as const

export const partController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartSchema.parse(req.body)
    const part = await partService.create(data, getUserId(req))
    successResponse(res, part, '配件创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = createPartSchema.partial().parse(req.body)
    const part = await partService.update(req.params.id, data)
    successResponse(res, part, '配件更新成功')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await partService.delete(req.params.id)
    successResponse(res, null, '配件删除成功')
  },

  async getById(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => partService.getById(req.params.id), '配件')
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await partService.findMany({
      page,
      pageSize,
      status: query.status as PartStatus | undefined,
      category: query.category as string,
      keyword: query.keyword as string,
      lowStock: query.lowStock === 'true',
    })

    successResponse(res, result)
  },

  async stockIn(req: AuthRequest, res: Response): Promise<void> {
    const data = stockOperationSchema.parse(req.body)
    await partService.stockIn({
      ...data,
      type: 'IN' as StockType,
      source: data.source as StockSource,
    }, getOptionalUserId(req))

    successResponse(res, null, '入库成功')
  },

  async stockOut(req: AuthRequest, res: Response): Promise<void> {
    const data = stockOperationSchema.parse(req.body)
    await partService.stockOut({
      ...data,
      type: 'OUT' as StockType,
      source: data.source as StockSource,
    }, getOptionalUserId(req))

    successResponse(res, null, '出库成功')
  },

  async findStockRecords(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await partService.findStockRecords({
      page,
      pageSize,
      partId: query.partId as string,
      type: query.type as StockType | undefined,
      source: query.source as StockSource | undefined,
      startDate: parseDate(query.startDate as string),
      endDate: parseDate(query.endDate as string),
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async createUsage(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartUsageSchema.parse(req.body)

    const usage = await partService.createUsage({
      ...data,
      applyDate: new Date(data.applyDate),
    })

    successResponse(res, usage, '领用申请创建成功', 201)
  },

  async approveUsage(req: AuthRequest, res: Response): Promise<void> {
    const data = approveSchema.parse(req.body)
    await partService.approveUsage(req.params.id, data, getUserId(req))
    successResponse(res, null, data.approved ? '领用已批准' : '领用已驳回')
  },

  async findUsageRecords(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await partService.findUsageRecords({
      page,
      pageSize,
      partId: query.partId as string,
      status: query.status as PartUsageStatus | undefined,
      applicant: query.applicant as string,
      startDate: parseDate(query.startDate as string),
      endDate: parseDate(query.endDate as string),
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async createScrap(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartScrapSchema.parse(req.body)

    const scrap = await partService.createScrap({
      ...data,
      applyDate: new Date(data.applyDate),
    })

    successResponse(res, scrap, '报废申请创建成功', 201)
  },

  async approveScrap(req: AuthRequest, res: Response): Promise<void> {
    const data = approveSchema.parse(req.body)
    await partService.approveScrap(req.params.id, data, getUserId(req))
    successResponse(res, null, data.approved ? '报废已批准' : '报废已驳回')
  },

  async findScrapRecords(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await partService.findScrapRecords({
      page,
      pageSize,
      partId: query.partId as string,
      status: query.status as PartScrapStatus | undefined,
      applicant: query.applicant as string,
      startDate: parseDate(query.startDate as string),
      endDate: parseDate(query.endDate as string),
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partService.getStatistics())
  },

  async getUsageStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partService.getUsageStatistics())
  },

  async getScrapStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partService.getScrapStatistics())
  },

  async getStockStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partService.getStockStatistics())
  },

  async getCategories(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partService.getCategories())
  },

  async getStockAlerts(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partService.getStockAlerts())
  },

  async generateRequisition(req: Request, res: Response): Promise<void> {
    const lowStockOnly = req.query.lowStockOnly !== 'false'
    successResponse(res, await partService.generateRequisition(lowStockOnly))
  },

  async getInventoryLogs(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await partService.getInventoryLogs({
      page,
      pageSize,
      partId: query.partId as string,
      type: query.type as 'IN' | 'OUT' | undefined,
      startDate: parseDate(query.startDate as string),
      endDate: parseDate(query.endDate as string),
    })

    successResponse(res, result)
  },

  async getOptions(_req: Request, res: Response): Promise<void> {
    const categories = await partService.getCategories()
    successResponse(res, { categories, statuses: PART_STATUSES })
  },
}

// ============ Spare Part Category Controller ============

export const sparePartCategoryController = {
  async getAll(_req: Request, res: Response): Promise<void> {
    successResponse(res, await sparePartCategoryService.findAll())
  },

  async getTree(_req: Request, res: Response): Promise<void> {
    successResponse(res, await sparePartCategoryService.findTree())
  },

  async create(req: Request, res: Response): Promise<void> {
    const data = createCategorySchema.parse(req.body)
    const category = await sparePartCategoryService.create(data)
    successResponse(res, category, '分类创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = createCategorySchema.partial().parse(req.body)
    const category = await sparePartCategoryService.update(req.params.id, data)
    successResponse(res, category, '分类更新成功')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await sparePartCategoryService.delete(req.params.id)
    successResponse(res, null, '分类已删除')
  },
}

// ============ Part Lifecycle Controller ============

export const partLifecycleController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartLifecycleSchema.parse(req.body)

    const lifecycle = await partLifecycleService.create({
      ...data,
      installedAt: parseDate(data.installedAt ?? undefined),
      expectedEndDate: parseDate(data.expectedEndDate ?? undefined),
    })

    successResponse(res, lifecycle, '生命周期记录创建成功', 201)
  },

  async update(req: Request, res: Response): Promise<void> {
    const data = createPartLifecycleSchema.partial().parse(req.body)

    const lifecycle = await partLifecycleService.update(req.params.id, {
      ...data,
      installedAt: parseDate(data.installedAt ?? undefined),
      expectedEndDate: parseDate(data.expectedEndDate ?? undefined),
    })

    successResponse(res, lifecycle, '生命周期记录更新成功')
  },

  async delete(req: Request, res: Response): Promise<void> {
    await partLifecycleService.delete(req.params.id)
    successResponse(res, null, '生命周期记录删除成功')
  },

  async getById(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => partLifecycleService.getById(req.params.id), '生命周期记录')
  },

  async getByPartId(req: Request, res: Response): Promise<void> {
    await handleGetById(res, () => partLifecycleService.getByPartId(req.params.partId), '生命周期记录')
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const { page, pageSize } = parsePagination(query as Record<string, unknown>)

    const result = await partLifecycleService.findMany({
      page,
      pageSize,
      partId: query.partId as string,
      status: query.status as PartLifecycleStatus | undefined,
      keyword: query.keyword as string,
    })

    successResponse(res, result)
  },

  async updateUsage(req: Request, res: Response): Promise<void> {
    const { cycles } = z.object({ cycles: z.number().min(0) }).parse(req.body)
    await partLifecycleService.updateUsage(req.params.partId, cycles)
    successResponse(res, null, '使用周期更新成功')
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    successResponse(res, await partLifecycleService.getStatistics())
  },
}
