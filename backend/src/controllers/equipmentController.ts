import type { Request, Response } from 'express'
import { z } from 'zod'
import { equipmentService } from '../services/equipmentService'
import { maintenanceRecordService } from '../services/maintenanceRecordService'
import { maintenancePlanService } from '../services/maintenancePlanService'
import { maintenanceTemplateService } from '../services/maintenanceTemplateService'
import { partService } from '../services/partService'
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

export const equipmentController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createEquipmentSchema.parse(req.body)
    const userId = req.user!.id

    const equipment = await equipmentService.create({
      ...data,
      status: data.status as EquipmentStatus | undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      warrantyDate: data.warrantyDate ? new Date(data.warrantyDate) : undefined,
    }, userId)

    res.status(201).json({
      success: true,
      data: equipment,
      message: '设备创建成功',
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = updateEquipmentSchema.parse(req.body)

    const equipment = await equipmentService.update(id, {
      ...data,
      status: data.status as EquipmentStatus | undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      warrantyDate: data.warrantyDate ? new Date(data.warrantyDate) : undefined,
    })

    res.json({
      success: true,
      data: equipment,
      message: '设备更新成功',
    })
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await equipmentService.delete(id)

    res.json({
      success: true,
      message: '设备删除成功',
    })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const equipment = await equipmentService.getById(id)

    if (!equipment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '设备不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: equipment,
    })
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = paginationSchema.parse(req.query)
    const params = {
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 10,
      status: query.status as EquipmentStatus | undefined,
      category: query.category,
      location: query.location,
      keyword: query.keyword,
    }

    const result = await equipmentService.findMany(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await equipmentService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },

  async getCategories(_req: Request, res: Response): Promise<void> {
    const categories = await equipmentService.getCategories()

    res.json({
      success: true,
      data: categories,
    })
  },

  async getLocations(_req: Request, res: Response): Promise<void> {
    const locations = await equipmentService.getLocations()

    res.json({
      success: true,
      data: locations,
    })
  },
}

export const maintenanceRecordController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createMaintenanceRecordSchema.parse(req.body)
    const userId = req.user!.id

    const record = await maintenanceRecordService.create({
      ...data,
      type: data.type as MaintenanceType,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    }, userId)

    res.status(201).json({
      success: true,
      data: record,
      message: '记录创建成功',
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = createMaintenanceRecordSchema.partial().parse(req.body)

    const record = await maintenanceRecordService.update(id, {
      ...data,
      type: data.type as MaintenanceType | undefined,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    })

    res.json({
      success: true,
      data: record,
      message: '记录更新成功',
    })
  },

  async complete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = completeMaintenanceSchema.parse(req.body)

    await maintenanceRecordService.complete(id, {
      ...data,
      endTime: new Date(data.endTime),
    })

    res.json({
      success: true,
      message: '记录已完成',
    })
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await maintenanceRecordService.delete(id)

    res.json({
      success: true,
      message: '记录删除成功',
    })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const record = await maintenanceRecordService.getById(id)

    if (!record) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '记录不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: record,
    })
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      equipmentId: query.equipmentId as string,
      type: query.type as MaintenanceType | undefined,
      status: query.status as MaintenanceRecordStatus | undefined,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
      keyword: query.keyword as string,
    }

    const result = await maintenanceRecordService.findMany(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await maintenanceRecordService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },
}

export const maintenancePlanController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createMaintenancePlanSchema.parse(req.body)
    const userId = req.user!.id

    const plan = await maintenancePlanService.create({
      ...data,
      frequency: data.frequency as MaintenancePlanFrequency,
      nextDate: new Date(data.nextDate),
    }, userId)

    res.status(201).json({
      success: true,
      data: plan,
      message: '计划创建成功',
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = updateMaintenancePlanSchema.parse(req.body)

    const plan = await maintenancePlanService.update(id, {
      ...data,
      frequency: data.frequency as MaintenancePlanFrequency | undefined,
      nextDate: data.nextDate ? new Date(data.nextDate) : undefined,
    })

    res.json({
      success: true,
      data: plan,
      message: '计划更新成功',
    })
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await maintenancePlanService.delete(id)

    res.json({
      success: true,
      message: '计划删除成功',
    })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const plan = await maintenancePlanService.getById(id)

    if (!plan) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '计划不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: plan,
    })
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      equipmentId: query.equipmentId as string,
      status: query.status as MaintenancePlanStatus | undefined,
      keyword: query.keyword as string,
    }

    const result = await maintenancePlanService.findMany(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async execute(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await maintenancePlanService.executePlan(id)

    res.json({
      success: true,
      message: '计划执行成功',
    })
  },

  async getUpcoming(req: Request, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string, 10) || 7
    const plans = await maintenancePlanService.getUpcomingPlans(days)

    res.json({
      success: true,
      data: plans,
    })
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await maintenancePlanService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },
}

export const maintenanceTemplateController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createMaintenanceTemplateSchema.parse(req.body)
    const userId = req.user!.id

    const template = await maintenanceTemplateService.create(data, userId)

    res.status(201).json({
      success: true,
      data: template,
      message: '模板创建成功',
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = createMaintenanceTemplateSchema.partial().parse(req.body)

    const template = await maintenanceTemplateService.update(id, data)

    res.json({
      success: true,
      data: template,
      message: '模板更新成功',
    })
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await maintenanceTemplateService.delete(id)

    res.json({
      success: true,
      message: '模板删除成功',
    })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const template = await maintenanceTemplateService.getById(id)

    if (!template) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '模板不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: template,
    })
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      status: query.status as MaintenanceTemplateStatus | undefined,
      category: query.category as string,
      keyword: query.keyword as string,
    }

    const result = await maintenanceTemplateService.findMany(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async getCategories(_req: Request, res: Response): Promise<void> {
    const categories = await maintenanceTemplateService.getCategories()

    res.json({
      success: true,
      data: categories,
    })
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await maintenanceTemplateService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },
}

export const partController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartSchema.parse(req.body)
    const userId = req.user!.id

    const part = await partService.create(data, userId)

    res.status(201).json({
      success: true,
      data: part,
      message: '配件创建成功',
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = createPartSchema.partial().parse(req.body)

    const part = await partService.update(id, data)

    res.json({
      success: true,
      data: part,
      message: '配件更新成功',
    })
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await partService.delete(id)

    res.json({
      success: true,
      message: '配件删除成功',
    })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const part = await partService.getById(id)

    if (!part) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '配件不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: part,
    })
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      status: query.status as PartStatus | undefined,
      category: query.category as string,
      keyword: query.keyword as string,
      lowStock: query.lowStock === 'true',
    }

    const result = await partService.findMany(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async stockIn(req: AuthRequest, res: Response): Promise<void> {
    const data = stockOperationSchema.parse(req.body)
    await partService.stockIn({
      ...data,
      type: 'IN' as StockType,
      source: data.source as StockSource,
    })

    res.json({
      success: true,
      message: '入库成功',
    })
  },

  async stockOut(req: AuthRequest, res: Response): Promise<void> {
    const data = stockOperationSchema.parse(req.body)
    await partService.stockOut({
      ...data,
      type: 'OUT' as StockType,
      source: data.source as StockSource,
    })

    res.json({
      success: true,
      message: '出库成功',
    })
  },

  async findStockRecords(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      partId: query.partId as string,
      type: query.type as StockType | undefined,
      source: query.source as StockSource | undefined,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
      keyword: query.keyword as string,
    }

    const result = await partService.findStockRecords(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async createUsage(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartUsageSchema.parse(req.body)

    const usage = await partService.createUsage({
      ...data,
      applyDate: new Date(data.applyDate),
    })

    res.status(201).json({
      success: true,
      data: usage,
      message: '领用申请创建成功',
    })
  },

  async approveUsage(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params
    const data = approveSchema.parse(req.body)
    const approverId = req.user!.id

    await partService.approveUsage(id, data, approverId)

    res.json({
      success: true,
      message: data.approved ? '领用已批准' : '领用已驳回',
    })
  },

  async findUsageRecords(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      partId: query.partId as string,
      status: query.status as PartUsageStatus | undefined,
      applicant: query.applicant as string,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
      keyword: query.keyword as string,
    }

    const result = await partService.findUsageRecords(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async createScrap(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartScrapSchema.parse(req.body)

    const scrap = await partService.createScrap({
      ...data,
      applyDate: new Date(data.applyDate),
    })

    res.status(201).json({
      success: true,
      data: scrap,
      message: '报废申请创建成功',
    })
  },

  async approveScrap(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params
    const data = approveSchema.parse(req.body)
    const approverId = req.user!.id

    await partService.approveScrap(id, data, approverId)

    res.json({
      success: true,
      message: data.approved ? '报废已批准' : '报废已驳回',
    })
  },

  async findScrapRecords(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      partId: query.partId as string,
      status: query.status as PartScrapStatus | undefined,
      applicant: query.applicant as string,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
      keyword: query.keyword as string,
    }

    const result = await partService.findScrapRecords(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await partService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },

  async getUsageStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await partService.getUsageStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },

  async getScrapStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await partService.getScrapStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },

  async getStockStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await partService.getStockStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },

  async getCategories(_req: Request, res: Response): Promise<void> {
    const categories = await partService.getCategories()

    res.json({
      success: true,
      data: categories,
    })
  },
}

export const partLifecycleController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createPartLifecycleSchema.parse(req.body)

    const lifecycle = await partLifecycleService.create({
      ...data,
      installedAt: data.installedAt ? new Date(data.installedAt) : undefined,
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
    })

    res.status(201).json({
      success: true,
      data: lifecycle,
      message: '生命周期记录创建成功',
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const data = createPartLifecycleSchema.partial().parse(req.body)

    const lifecycle = await partLifecycleService.update(id, {
      ...data,
      installedAt: data.installedAt ? new Date(data.installedAt) : undefined,
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
    })

    res.json({
      success: true,
      data: lifecycle,
      message: '生命周期记录更新成功',
    })
  },

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await partLifecycleService.delete(id)

    res.json({
      success: true,
      message: '生命周期记录删除成功',
    })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const lifecycle = await partLifecycleService.getById(id)

    if (!lifecycle) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '生命周期记录不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: lifecycle,
    })
  },

  async getByPartId(req: Request, res: Response): Promise<void> {
    const { partId } = req.params
    const lifecycle = await partLifecycleService.getByPartId(partId)

    if (!lifecycle) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '生命周期记录不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: lifecycle,
    })
  },

  async findMany(req: Request, res: Response): Promise<void> {
    const query = req.query
    const params = {
      page: query.page ? parseInt(query.page as string, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 10,
      partId: query.partId as string,
      status: query.status as PartLifecycleStatus | undefined,
      keyword: query.keyword as string,
    }

    const result = await partLifecycleService.findMany(params)

    res.json({
      success: true,
      data: result,
    })
  },

  async updateUsage(req: Request, res: Response): Promise<void> {
    const { partId } = req.params
    const { cycles } = z.object({ cycles: z.number().min(0) }).parse(req.body)

    await partLifecycleService.updateUsage(partId, cycles)

    res.json({
      success: true,
      message: '使用周期更新成功',
    })
  },

  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await partLifecycleService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },
}
