// 设备状态枚举
export enum EquipmentStatus {
  RUNNING = 'RUNNING',
  WARNING = 'WARNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE',
  SCRAPPED = 'SCRAPPED',
}

// 维修类型枚举
export enum MaintenanceType {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
}

// 维修记录状态枚举
export enum MaintenanceRecordStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// 保养计划状态枚举
export enum MaintenancePlanStatus {
  ACTIVE = 'ACTIVE',
  WARNING = 'WARNING',
  OVERDUE = 'OVERDUE',
  PAUSED = 'PAUSED',
}

// 保养频率枚举
export enum MaintenancePlanFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  YEARLY = 'YEARLY',
}

// 保养模板状态枚举
export enum MaintenanceTemplateStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  DISABLED = 'DISABLED',
}

// 配件状态枚举
export enum PartStatus {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  HIGH = 'HIGH',
  DISCONTINUED = 'DISCONTINUED',
}

// 配件领用状态枚举
export enum PartUsageStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

// 配件报废状态枚举
export enum PartScrapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// 出入库类型枚举
export enum StockType {
  IN = 'IN',
  OUT = 'OUT',
}

// 出入库来源枚举
export enum StockSource {
  PURCHASE = 'PURCHASE',
  RETURN = 'RETURN',
  PRODUCE = 'PRODUCE',
  USAGE = 'USAGE',
  SCRAP = 'SCRAP',
  ADJUST = 'ADJUST',
  OTHER = 'OTHER',
}

// 配件生命周期状态枚举
export enum PartLifecycleStatus {
  ACTIVE = 'ACTIVE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EXPIRED = 'EXPIRED',
}

// ============================================
// 分页相关类型
// ============================================

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================
// 设备相关类型
// ============================================

export interface EquipmentCreateInput {
  code: string
  name: string
  model: string
  category: string
  manufacturer?: string
  location: string
  status?: EquipmentStatus
  healthScore?: number
  purchaseDate?: Date
  warrantyDate?: Date
  purchasePrice?: number
  serialNumber?: string
  description?: string
}

export interface EquipmentUpdateInput {
  name?: string
  model?: string
  category?: string
  manufacturer?: string
  location?: string
  status?: EquipmentStatus
  healthScore?: number
  purchaseDate?: Date
  warrantyDate?: Date
  purchasePrice?: number
  serialNumber?: string
  description?: string
  lastMaintenanceAt?: Date
  nextMaintenanceAt?: Date
  totalWorkHours?: number
}

export interface EquipmentQueryParams extends PaginationParams {
  status?: EquipmentStatus
  category?: string
  location?: string
  keyword?: string
}

export interface EquipmentWithStats {
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
  _count?: {
    maintenanceRecords: number
    maintenancePlans: number
  }
}

// ============================================
// 维修保养记录相关类型
// ============================================

export interface MaintenanceRecordCreateInput {
  code: string
  equipmentId: string
  type: MaintenanceType
  content: string
  operator: string
  startTime: Date
  endTime?: Date
  duration?: number
  estimatedDuration?: number
  cost?: number
  templateId?: string
  partsUsed?: PartUsedItem[]
  result?: string
  beforeImages?: string[]
  afterImages?: string[]
}

export interface PartUsedItem {
  partId: string
  partName: string
  quantity: number
  unit: string
  unitPrice?: number
}

export interface MaintenanceRecordUpdateInput {
  type?: MaintenanceType
  content?: string
  operator?: string
  startTime?: Date
  endTime?: Date
  duration?: number
  estimatedDuration?: number
  cost?: number
  status?: MaintenanceRecordStatus
  templateId?: string
  partsUsed?: PartUsedItem[]
  result?: string
  beforeImages?: string[]
  afterImages?: string[]
}

export interface MaintenanceRecordQueryParams extends PaginationParams {
  equipmentId?: string
  type?: MaintenanceType
  status?: MaintenanceRecordStatus
  startDate?: Date
  endDate?: Date
  keyword?: string
}

// ============================================
// 保养计划相关类型
// ============================================

export interface MaintenancePlanCreateInput {
  code: string
  equipmentId: string
  planName: string
  frequency: MaintenancePlanFrequency
  intervalDays: number
  nextDate: Date
  responsible: string
  reminderDays?: number
  templateId?: string
  description?: string
}

export interface MaintenancePlanUpdateInput {
  planName?: string
  frequency?: MaintenancePlanFrequency
  intervalDays?: number
  nextDate?: Date
  responsible?: string
  reminderDays?: number
  status?: MaintenancePlanStatus
  templateId?: string
  description?: string
}

export interface MaintenancePlanQueryParams extends PaginationParams {
  equipmentId?: string
  status?: MaintenancePlanStatus
  keyword?: string
}

// ============================================
// 保养模板相关类型
// ============================================

export interface MaintenanceTemplateItem {
  name: string
  description?: string
  required: boolean
}

export interface MaintenanceTemplateCreateInput {
  code: string
  name: string
  category: string
  items: MaintenanceTemplateItem[]
  estimatedTime: number
}

export interface MaintenanceTemplateUpdateInput {
  name?: string
  category?: string
  items?: MaintenanceTemplateItem[]
  estimatedTime?: number
  status?: MaintenanceTemplateStatus
}

export interface MaintenanceTemplateQueryParams extends PaginationParams {
  status?: MaintenanceTemplateStatus
  category?: string
  keyword?: string
}

// ============================================
// 配件相关类型
// ============================================

export interface PartCreateInput {
  code: string
  name: string
  model: string
  category: string
  unit: string
  stock?: number
  minStock: number
  maxStock: number
  location?: string
  supplier?: string
  unitPrice?: number
  description?: string
}

export interface PartUpdateInput {
  name?: string
  model?: string
  category?: string
  unit?: string
  minStock?: number
  maxStock?: number
  location?: string
  supplier?: string
  unitPrice?: number
  status?: PartStatus
  description?: string
}

export interface PartQueryParams extends PaginationParams {
  status?: PartStatus
  category?: string
  keyword?: string
  lowStock?: boolean
}

export interface PartWithStockStatus {
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
}

// ============================================
// 配件领用相关类型
// ============================================

export interface PartUsageCreateInput {
  code: string
  partId: string
  quantity: number
  applicant: string
  department: string
  purpose: string
  equipmentId?: string
  applyDate: Date
  remark?: string
}

export interface PartUsageApproveInput {
  approved: boolean
  remark?: string
}

export interface PartUsageUpdateInput {
  quantity?: number
  purpose?: string
  equipmentId?: string
  remark?: string
}

export interface PartUsageQueryParams extends PaginationParams {
  partId?: string
  status?: PartUsageStatus
  applicant?: string
  startDate?: Date
  endDate?: Date
  keyword?: string
}

// ============================================
// 配件报废相关类型
// ============================================

export interface PartScrapCreateInput {
  code: string
  partId: string
  quantity: number
  reason: string
  originalValue: number
  residualValue: number
  applicant: string
  applyDate: Date
  remark?: string
}

export interface PartScrapApproveInput {
  approved: boolean
  remark?: string
}

export interface PartScrapQueryParams extends PaginationParams {
  partId?: string
  status?: PartScrapStatus
  applicant?: string
  startDate?: Date
  endDate?: Date
  keyword?: string
}

// ============================================
// 出入库流水相关类型
// ============================================

export interface PartStockCreateInput {
  partId: string
  type: StockType
  quantity: number
  operator: string
  documentNo?: string
  source: StockSource
  date?: Date
  remark?: string
  relatedId?: string
}

export interface PartStockQueryParams extends PaginationParams {
  partId?: string
  type?: StockType
  source?: StockSource
  startDate?: Date
  endDate?: Date
  keyword?: string
}

// ============================================
// 配件生命周期相关类型
// ============================================

export interface PartLifecycleCreateInput {
  partId: string
  totalCycles: number
  installedCycles?: number
  remainingCycles: number
  avgUsage: number
  installedAt?: Date
  expectedEndDate?: Date
  equipmentId?: string
}

export interface PartLifecycleUpdateInput {
  totalCycles?: number
  installedCycles?: number
  remainingCycles?: number
  avgUsage?: number
  status?: PartLifecycleStatus
  installedAt?: Date
  expectedEndDate?: Date
  equipmentId?: string
}

export interface PartLifecycleQueryParams extends PaginationParams {
  partId?: string
  status?: PartLifecycleStatus
  keyword?: string
}

// ============================================
// 统计相关类型
// ============================================

export interface EquipmentStatistics {
  total: number
  running: number
  warning: number
  stopped: number
  maintenance: number
  scrapped: number
}

export interface MaintenanceStatistics {
  totalRecords: number
  thisMonthRecords: number
  inProgress: number
  completed: number
  thisMonthCost: number
}

export interface PartStatistics {
  total: number
  normal: number
  low: number
  high: number
  totalValue: number
}

export interface PartUsageStatistics {
  thisMonth: number
  approved: number
  pending: number
  thisMonthValue: number
}

export interface PartScrapStatistics {
  thisMonth: number
  approved: number
  pending: number
  totalLoss: number
}

export interface StockStatistics {
  thisMonthIn: number
  thisMonthOut: number
  netChange: number
  operationCount: number
}

export interface DashboardStatistics {
  equipment: EquipmentStatistics
  maintenance: MaintenanceStatistics
  parts: PartStatistics
  partUsage: PartUsageStatistics
  partScrap: PartScrapStatistics
  stock: StockStatistics
}
