import { prisma } from '../lib/prisma'
import logger from '../lib/logger'

// ============================================
// 类型定义
// ============================================

interface CapabilityCreateInput {
  equipmentId: string
  productName: string
  processName?: string
  capacityPerHour: number
  efficiencyFactor?: number
  setupTime?: number
  unit?: string
  remark?: string
}

interface CapabilityUpdateInput {
  productName?: string
  processName?: string
  capacityPerHour?: number
  efficiencyFactor?: number
  setupTime?: number
  unit?: string
  status?: string
  remark?: string
}

interface CapabilityQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  equipmentId?: string
  status?: string
}

interface OperatorSkillCreateInput {
  operatorName: string
  equipmentId: string
  skillLevel?: string
  efficiencyFactor?: number
  certificationDate?: string
  isPrimary?: boolean
  remark?: string
}

interface OperatorSkillUpdateInput {
  operatorName?: string
  skillLevel?: string
  efficiencyFactor?: number
  certificationDate?: string
  isPrimary?: boolean
  remark?: string
}

interface OperatorSkillQueryParams {
  page?: number
  pageSize?: number
  equipmentId?: string
  operatorName?: string
}

interface RequirementItem {
  productName: string
  quantity: number
  deadline: string // ISO 日期字符串
}

interface PaginatedResult<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

interface BatchImportItem {
  equipmentId: string
  productName: string
  processName?: string
  capacityPerHour: number
  efficiencyFactor?: number
  setupTime?: number
  unit?: string
}

// 产能数据接口
interface CapabilityData {
  id: string
  equipmentId: string
  productName: string
  processName: string | null
  capacityPerHour: number
  efficiencyFactor: number
  setupTime: number
  unit: string
  status: string
  remark: string | null
  createdAt: Date
  updatedAt: Date
  equipment: {
    id: string
    name: string
    code: string
    category?: string
    location?: string
  }
}

// 操作员技能数据接口
interface OperatorSkillData {
  id: string
  operatorName: string
  equipmentId: string
  skillLevel: string
  efficiencyFactor: number
  certificationDate: Date | null
  isPrimary: boolean
  remark: string | null
  createdAt: Date
  updatedAt: Date
  equipment: {
    id: string
    name: string
    code: string
  }
}

// 操作结果接口
interface ServiceResult<T> {
  success: boolean
  data?: T
  message: string
}

// 分页结果接口
interface PaginatedResult<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// 可用设备接口
interface AvailableEquipment {
  equipmentId: string
  equipmentName: string
  equipmentCode: string
  equipmentStatus: string
  category: string | null
  location: string | null
  capacityPerHour: number
  efficiencyFactor: number
  setupTime: number
  unit: string
}

// 产能需求计算结果接口
interface RequirementResult {
  productName: string
  requiredQuantity: number
  deadline: string
  availableHours: number
  equipmentOptions: Array<{
    equipmentId: string
    equipmentName: string
    equipmentCode: string
    equipmentStatus: string
    capacityPerHour: number
    effectiveCapacity: number
    setupTime: number
    totalHoursNeeded: number
    canComplete: boolean
  }>
  feasible: boolean
}

// 设备利用率接口
interface EquipmentUtilization {
  equipmentId: string
  equipmentName: string
  equipmentCode: string
  status: string
  category: string | null
  capabilityCount: number
  operatorCount: number
  avgEfficiency: number
  products: string[]
}

// 操作员效率接口
interface OperatorEfficiency {
  operatorName: string
  equipmentCount: number
  avgEfficiency: number
  primaryEquipment: Array<{
    equipmentId: string
    equipmentName: string
  }>
  skillDistribution: {
    beginner: number
    intermediate: number
    advanced: number
    expert: number
  }
  equipment: Array<{
    equipmentId: string
    equipmentName: string
    equipmentCode: string
    skillLevel: string
    efficiencyFactor: number
  }>
}

// 分析报告接口
interface AnalysisReport {
  summary: {
    totalCapabilities: number
    activeCapabilities: number
    totalOperatorSkills: number
    totalEquipment: number
    equipmentWithCapabilities: number
    equipmentWithoutCapabilities: number
    coverageRate: number
  }
  productDistribution: Array<{
    productName: string
    equipmentCount: number
    avgCapacityPerHour: number
    avgEfficiency: number
  }>
  skillLevelDistribution: Array<{
    level: string
    count: number
  }>
}

// 导出数据接口
interface ExportDataResult {
  capabilities: Array<{
    id: string
    equipmentId: string
    equipmentName: string
    equipmentCode: string
    productName: string
    processName: string | null
    capacityPerHour: number
    efficiencyFactor: number
    setupTime: number
    unit: string
    status: string
    remark: string | null
    createdAt: Date
    updatedAt: Date
  }>
  operatorSkills: Array<{
    id: string
    operatorName: string
    equipmentId: string
    equipmentName: string
    equipmentCode: string
    skillLevel: string
    efficiencyFactor: number
    certificationDate: Date | null
    isPrimary: boolean
    remark: string | null
    createdAt: Date
    updatedAt: Date
  }>
}

// ============================================
// 设备产能 CRUD
// ============================================

/** 创建设备产能配置 */
async function createCapability(
  data: CapabilityCreateInput,
  userId: string
): Promise<ServiceResult<CapabilityData>> {
  try {
    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
      select: { id: true, name: true },
    })
    if (!equipment) {
      return { success: false, message: '设备不存在' }
    }

    // 检查是否已存在相同 设备-产品 组合
    const existing = await prisma.equipmentCapability.findFirst({
      where: {
        equipmentId: data.equipmentId,
        productName: data.productName,
        status: 'active',
      },
    })
    if (existing) {
      return { success: false, message: '该设备的产品产能配置已存在' }
    }

    const capability = await prisma.equipmentCapability.create({
      data: {
        equipmentId: data.equipmentId,
        productName: data.productName,
        processName: data.processName ?? null,
        capacityPerHour: data.capacityPerHour,
        efficiencyFactor: data.efficiencyFactor ?? 1.0,
        setupTime: data.setupTime ?? 0,
        unit: data.unit ?? '件',
        remark: data.remark ?? null,
      },
      include: { equipment: { select: { id: true, name: true, code: true } } },
    })

    logger.info('设备产能记录创建成功', { capabilityId: capability.id, createdBy: userId })
    return { success: true, data: capability as CapabilityData, message: '设备产能记录创建成功' }
  } catch (err) {
    logger.error('设备产能记录创建失败', { error: (err as Error).message })
    throw err
  }
}

/** 更新产能配置 */
async function updateCapability(
  id: string,
  data: CapabilityUpdateInput
): Promise<ServiceResult<CapabilityData>> {
  try {
    const existing = await prisma.equipmentCapability.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, message: '产能记录不存在' }
    }

    const updated = await prisma.equipmentCapability.update({
      where: { id },
      data: {
        ...(data.productName !== undefined && { productName: data.productName }),
        ...(data.processName !== undefined && { processName: data.processName }),
        ...(data.capacityPerHour !== undefined && { capacityPerHour: data.capacityPerHour }),
        ...(data.efficiencyFactor !== undefined && { efficiencyFactor: data.efficiencyFactor }),
        ...(data.setupTime !== undefined && { setupTime: data.setupTime }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.remark !== undefined && { remark: data.remark }),
      },
      include: { equipment: { select: { id: true, name: true, code: true } } },
    })

    logger.info('设备产能记录更新成功', { capabilityId: id })
    return { success: true, data: updated as CapabilityData, message: '设备产能记录更新成功' }
  } catch (err) {
    logger.error('设备产能记录更新失败', { error: (err as Error).message, capabilityId: id })
    throw err
  }
}

/** 删除产能配置 */
async function deleteCapability(id: string): Promise<ServiceResult<null>> {
  try {
    const existing = await prisma.equipmentCapability.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, message: '产能记录不存在' }
    }

    await prisma.equipmentCapability.delete({ where: { id } })
    logger.info('设备产能记录删除成功', { capabilityId: id })
    return { success: true, message: '设备产能记录删除成功' }
  } catch (err) {
    logger.error('设备产能记录删除失败', { error: (err as Error).message, capabilityId: id })
    throw err
  }
}

/** 获取产能列表（分页、搜索、筛选） */
async function getCapabilities(
  params: CapabilityQueryParams
): Promise<PaginatedResult<CapabilityData>> {
  try {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (params.equipmentId) where.equipmentId = params.equipmentId
    if (params.status) where.status = params.status
    if (params.keyword) {
      where.OR = [
        { productName: { contains: params.keyword, mode: 'insensitive' } },
        { processName: { contains: params.keyword, mode: 'insensitive' } },
        { equipment: { name: { contains: params.keyword, mode: 'insensitive' } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.equipmentCapability.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { equipment: { select: { id: true, name: true, code: true, category: true } } },
      }),
      prisma.equipmentCapability.count({ where }),
    ])

    return {
      items: items as CapabilityData[],
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  } catch (err) {
    logger.error('获取产能列表失败', { error: (err as Error).message })
    throw err
  }
}

/** 获取产能详情 */
async function getCapabilityById(
  id: string
): Promise<ServiceResult<CapabilityData>> {
  try {
    const capability = await prisma.equipmentCapability.findUnique({
      where: { id },
      include: { equipment: { select: { id: true, name: true, code: true, category: true, location: true } } },
    })

    if (!capability) {
      return { success: false, message: '产能记录不存在' }
    }
    return { success: true, data: capability as CapabilityData, message: '获取成功' }
  } catch (err) {
    logger.error('获取产能详情失败', { error: (err as Error).message, capabilityId: id })
    throw err
  }
}

// ============================================
// 操作员技能 CRUD
// ============================================

/** 创建操作员技能 */
async function createOperatorSkill(
  data: OperatorSkillCreateInput
): Promise<ServiceResult<OperatorSkillData>> {
  try {
    // 检查设备是否存在
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
      select: { id: true },
    })
    if (!equipment) {
      return { success: false, message: '设备不存在' }
    }

    // 检查是否已存在 操作员-设备 组合
    const existing = await prisma.operatorSkill.findFirst({
      where: { operatorName: data.operatorName, equipmentId: data.equipmentId },
    })
    if (existing) {
      return { success: false, message: '该操作员的设备技能记录已存在' }
    }

    const skill = await prisma.operatorSkill.create({
      data: {
        operatorName: data.operatorName,
        equipmentId: data.equipmentId,
        skillLevel: data.skillLevel ?? 'intermediate',
        efficiencyFactor: data.efficiencyFactor ?? 1.0,
        certificationDate: data.certificationDate ? new Date(data.certificationDate) : null,
        isPrimary: data.isPrimary ?? false,
        remark: data.remark ?? null,
      },
      include: { equipment: { select: { id: true, name: true, code: true } } },
    })

    logger.info('操作员技能记录创建成功', { skillId: skill.id })
    return { success: true, data: skill as OperatorSkillData, message: '操作员技能记录创建成功' }
  } catch (err) {
    logger.error('操作员技能记录创建失败', { error: (err as Error).message })
    throw err
  }
}

/** 更新操作员技能 */
async function updateOperatorSkill(
  id: string,
  data: OperatorSkillUpdateInput
): Promise<ServiceResult<OperatorSkillData>> {
  try {
    const existing = await prisma.operatorSkill.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, message: '操作员技能记录不存在' }
    }

    const updated = await prisma.operatorSkill.update({
      where: { id },
      data: {
        ...(data.operatorName !== undefined && { operatorName: data.operatorName }),
        ...(data.skillLevel !== undefined && { skillLevel: data.skillLevel }),
        ...(data.efficiencyFactor !== undefined && { efficiencyFactor: data.efficiencyFactor }),
        ...(data.certificationDate !== undefined && {
          certificationDate: data.certificationDate ? new Date(data.certificationDate) : null,
        }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.remark !== undefined && { remark: data.remark }),
      },
      include: { equipment: { select: { id: true, name: true, code: true } } },
    })

    logger.info('操作员技能记录更新成功', { skillId: id })
    return { success: true, data: updated as OperatorSkillData, message: '操作员技能记录更新成功' }
  } catch (err) {
    logger.error('操作员技能记录更新失败', { error: (err as Error).message, skillId: id })
    throw err
  }
}

/** 删除操作员技能 */
async function deleteOperatorSkill(id: string): Promise<ServiceResult<null>> {
  try {
    const existing = await prisma.operatorSkill.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, message: '操作员技能记录不存在' }
    }

    await prisma.operatorSkill.delete({ where: { id } })
    logger.info('操作员技能记录删除成功', { skillId: id })
    return { success: true, message: '操作员技能记录删除成功' }
  } catch (err) {
    logger.error('操作员技能记录删除失败', { error: (err as Error).message, skillId: id })
    throw err
  }
}

/** 获取操作员技能列表（分页） */
async function getOperatorSkills(
  params: OperatorSkillQueryParams
): Promise<PaginatedResult<OperatorSkillData>> {
  try {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (params.equipmentId) where.equipmentId = params.equipmentId
    if (params.operatorName) {
      where.operatorName = { contains: params.operatorName, mode: 'insensitive' }
    }

    const [items, total] = await Promise.all([
      prisma.operatorSkill.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { equipment: { select: { id: true, name: true, code: true } } },
      }),
      prisma.operatorSkill.count({ where }),
    ])

    return {
      items: items as OperatorSkillData[],
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    }
  } catch (err) {
    logger.error('获取操作员技能列表失败', { error: (err as Error).message })
    throw err
  }
}

// ============================================
// 产能查询与分析
// ============================================

/** 查询某产品可用设备 */
async function getAvailableEquipment(productName: string): Promise<AvailableEquipment[]> {
  try {
    const capabilities = await prisma.equipmentCapability.findMany({
      where: { productName, status: 'active' },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            category: true,
            location: true,
          },
        },
      },
      orderBy: { capacityPerHour: 'desc' },
    })

    return capabilities.map((cap) => ({
      equipmentId: cap.equipment.id,
      equipmentName: cap.equipment.name,
      equipmentCode: cap.equipment.code,
      equipmentStatus: cap.equipment.status,
      category: cap.equipment.category,
      location: cap.equipment.location,
      capacityPerHour: cap.capacityPerHour,
      efficiencyFactor: cap.efficiencyFactor,
      setupTime: cap.setupTime,
      unit: cap.unit,
    }))
  } catch (err) {
    logger.error('查询可用设备失败', { error: (err as Error).message, productName })
    throw err
  }
}

/** 产能需求计算 */
async function calculateRequirements(
  requirements: RequirementItem[]
): Promise<RequirementResult[]> {
  try {
    const results: RequirementResult[] = []

    for (const req of requirements) {
      const capabilities = await prisma.equipmentCapability.findMany({
        where: { productName: req.productName, status: 'active' },
        include: { equipment: { select: { id: true, name: true, code: true, status: true } } },
      })

      const now = new Date()
      const deadline = new Date(req.deadline)
      const availableHours = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)) // 剩余工时

      // 计算每台设备的产能情况
      const equipmentOptions = capabilities.map((cap) => {
        const effectiveCapacity = cap.capacityPerHour * cap.efficiencyFactor // 有效产能/小时
        const setupHours = cap.setupTime / 60 // 准备时间(小时)
        const productionHours = req.quantity / effectiveCapacity // 纯生产时间
        const totalHours = setupHours + productionHours // 总需时间

        return {
          equipmentId: cap.equipment.id,
          equipmentName: cap.equipment.name,
          equipmentCode: cap.equipment.code,
          equipmentStatus: cap.equipment.status,
          capacityPerHour: cap.capacityPerHour,
          effectiveCapacity,
          setupTime: cap.setupTime,
          totalHoursNeeded: Math.round(totalHours * 100) / 100,
          canComplete: totalHours <= availableHours,
        }
      })

      results.push({
        productName: req.productName,
        requiredQuantity: req.quantity,
        deadline: req.deadline,
        availableHours: Math.round(availableHours * 100) / 100,
        equipmentOptions,
        feasible: equipmentOptions.some((opt) => opt.canComplete),
      })
    }

    return results
  } catch (err) {
    logger.error('产能需求计算失败', { error: (err as Error).message })
    throw err
  }
}

/** 设备利用率统计 */
async function getEquipmentUtilization(): Promise<EquipmentUtilization[]> {
  try {
    const equipmentList = await prisma.equipment.findMany({
      where: { status: { not: 'SCRAPPED' } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        category: true,
        capabilities: {
          where: { status: 'active' },
          select: { id: true, productName: true, capacityPerHour: true, efficiencyFactor: true },
        },
        operatorSkills: {
          select: { id: true, operatorName: true, skillLevel: true },
        },
      },
    })

    return equipmentList.map((eq) => ({
      equipmentId: eq.id,
      equipmentName: eq.name,
      equipmentCode: eq.code,
      status: eq.status,
      category: eq.category,
      capabilityCount: eq.capabilities.length,
      operatorCount: eq.operatorSkills.length,
      avgEfficiency: eq.capabilities.length > 0
        ? Math.round(
            (eq.capabilities.reduce((sum, cap) => sum + cap.efficiencyFactor, 0) / eq.capabilities.length) * 100
          ) / 100
        : 0,
      products: eq.capabilities.map((cap) => cap.productName),
    }))
  } catch (err) {
    logger.error('获取设备利用率统计失败', { error: (err as Error).message })
    throw err
  }
}

/** 操作员效率统计 */
async function getOperatorEfficiency(): Promise<OperatorEfficiency[]> {
  try {
    const skills = await prisma.operatorSkill.findMany({
      include: { equipment: { select: { id: true, name: true, code: true } } },
      orderBy: { operatorName: 'asc' },
    })

    // 按操作员分组
    const operatorMap = new Map<string, typeof skills>()
    for (const skill of skills) {
      const list = operatorMap.get(skill.operatorName) ?? []
      list.push(skill)
      operatorMap.set(skill.operatorName, list)
    }

    return Array.from(operatorMap.entries()).map(([operatorName, operatorSkills]) => ({
      operatorName,
      equipmentCount: operatorSkills.length,
      avgEfficiency: Math.round(
        (operatorSkills.reduce((sum, s) => sum + s.efficiencyFactor, 0) / operatorSkills.length) * 100
      ) / 100,
      primaryEquipment: operatorSkills.filter((s) => s.isPrimary).map((s) => ({
        equipmentId: s.equipment.id,
        equipmentName: s.equipment.name,
      })),
      skillDistribution: {
        beginner: operatorSkills.filter((s) => s.skillLevel === 'beginner').length,
        intermediate: operatorSkills.filter((s) => s.skillLevel === 'intermediate').length,
        advanced: operatorSkills.filter((s) => s.skillLevel === 'advanced').length,
        expert: operatorSkills.filter((s) => s.skillLevel === 'expert').length,
      },
      equipment: operatorSkills.map((s) => ({
        equipmentId: s.equipment.id,
        equipmentName: s.equipment.name,
        equipmentCode: s.equipment.code,
        skillLevel: s.skillLevel,
        efficiencyFactor: s.efficiencyFactor,
      })),
    }))
  } catch (err) {
    logger.error('获取操作员效率统计失败', { error: (err as Error).message })
    throw err
  }
}

/** 产能分析报告 */
async function getAnalysisReport(): Promise<AnalysisReport> {
  try {
    const [capTotal, capActive, skillTotal, equipTotal] = await Promise.all([
      prisma.equipmentCapability.count(),
    prisma.equipmentCapability.count({ where: { status: 'active' } }),
    prisma.operatorSkill.count(),
    prisma.equipment.count({ where: { status: { not: 'SCRAPPED' } } }),
  ])

  // 产品分布
  const productGroups = await prisma.equipmentCapability.groupBy({
    by: ['productName'],
    where: { status: 'active' },
    _count: { id: true },
    _avg: { capacityPerHour: true, efficiencyFactor: true },
  })

  // 技能等级分布
  const skillLevelGroups = await prisma.operatorSkill.groupBy({
    by: ['skillLevel'],
    _count: { id: true },
  })

  // 无产能配置的设备
  const equipmentWithoutCapabilities = await prisma.equipment.count({
    where: {
      status: { not: 'SCRAPPED' },
      capabilities: { none: {} },
    },
  })

  return {
    summary: {
      totalCapabilities: capTotal,
      activeCapabilities: capActive,
      totalOperatorSkills: skillTotal,
      totalEquipment: equipTotal,
      equipmentWithCapabilities: equipTotal - equipmentWithoutCapabilities,
      equipmentWithoutCapabilities,
      coverageRate: equipTotal > 0
        ? Math.round(((equipTotal - equipmentWithoutCapabilities) / equipTotal) * 10000) / 100
        : 0,
    },
    productDistribution: productGroups.map((g) => ({
      productName: g.productName,
      equipmentCount: g._count.id,
      avgCapacityPerHour: Math.round((g._avg.capacityPerHour ?? 0) * 100) / 100,
      avgEfficiency: Math.round((g._avg.efficiencyFactor ?? 0) * 100) / 100,
    })),
    skillLevelDistribution: skillLevelGroups.map((g) => ({
      level: g.skillLevel,
      count: g._count.id,
    })),
    }
  } catch (err) {
    logger.error('获取产能分析报告失败', { error: (err as Error).message })
    throw err
  }
}

// ============================================
// 批量操作与导出
// ============================================

/** 批量导入产能配置 */
async function batchImportCapabilities(
  items: BatchImportItem[],
  userId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let successCount = 0
  const errors: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      // 校验设备是否存在
      const equipment = await prisma.equipment.findUnique({
        where: { id: item.equipmentId },
        select: { id: true },
      })
      if (!equipment) {
        errors.push(`第${i + 1}行: 设备ID "${item.equipmentId}" 不存在`)
        continue
      }

      // 检查重复
      const existing = await prisma.equipmentCapability.findFirst({
        where: { equipmentId: item.equipmentId, productName: item.productName, status: 'active' },
      })
      if (existing) {
        errors.push(`第${i + 1}行: 设备 "${item.equipmentId}" 的产品 "${item.productName}" 配置已存在`)
        continue
      }

      await prisma.equipmentCapability.create({
        data: {
          equipmentId: item.equipmentId,
          productName: item.productName,
          processName: item.processName ?? null,
          capacityPerHour: item.capacityPerHour,
          efficiencyFactor: item.efficiencyFactor ?? 1.0,
          setupTime: item.setupTime ?? 0,
          unit: item.unit ?? '件',
        },
      })
      successCount++
    } catch (err) {
      errors.push(`第${i + 1}行: ${(err as Error).message}`)
    }
  }

  logger.info('批量导入产能配置完成', { success: successCount, failed: errors.length, userId })
  return { success: successCount, failed: errors.length, errors }
}

/** 导出数据 */
async function exportData(format: string): Promise<ExportDataResult> {
  try {
    const capabilities = await prisma.equipmentCapability.findMany({
      include: { equipment: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const operatorSkills = await prisma.operatorSkill.findMany({
      include: { equipment: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    })

    logger.info('导出产能数据', { format, capCount: capabilities.length, skillCount: operatorSkills.length })

    return {
      capabilities: capabilities.map((cap) => ({
        id: cap.id,
        equipmentId: cap.equipmentId,
        equipmentName: cap.equipment.name,
        equipmentCode: cap.equipment.code,
        productName: cap.productName,
        processName: cap.processName,
        capacityPerHour: cap.capacityPerHour,
        efficiencyFactor: cap.efficiencyFactor,
        setupTime: cap.setupTime,
        unit: cap.unit,
        status: cap.status,
        remark: cap.remark,
        createdAt: cap.createdAt,
        updatedAt: cap.updatedAt,
      })),
      operatorSkills: operatorSkills.map((skill) => ({
        id: skill.id,
        operatorName: skill.operatorName,
        equipmentId: skill.equipmentId,
        equipmentName: skill.equipment.name,
        equipmentCode: skill.equipment.code,
        skillLevel: skill.skillLevel,
        efficiencyFactor: skill.efficiencyFactor,
        certificationDate: skill.certificationDate,
        isPrimary: skill.isPrimary,
        remark: skill.remark,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      })),
    }
  } catch (err) {
    logger.error('导出产能数据失败', { error: (err as Error).message })
    throw err
  }
}

// ============================================
// 导出服务对象
// ============================================

export const capacityService = {
  createCapability,
  updateCapability,
  deleteCapability,
  getCapabilities,
  getCapabilityById,
  createOperatorSkill,
  updateOperatorSkill,
  deleteOperatorSkill,
  getOperatorSkills,
  getAvailableEquipment,
  calculateRequirements,
  getEquipmentUtilization,
  getOperatorEfficiency,
  getAnalysisReport,
  batchImportCapabilities,
  exportData,
}
