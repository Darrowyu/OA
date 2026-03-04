import type { Request, Response } from 'express'
import { capacityService } from '../services/capacityService'

export const capacityController = {
  // ============================================
  // 设备产能 CRUD
  // ============================================

  /** POST /capacity/equipment - 创建设备产能 */
  async createCapability(req: Request, res: Response): Promise<void> {
    try {
      const userId = ((req as { user?: { id?: string } }).user?.id) ?? 'system'
      const { equipmentId, productName, processName, capacityPerHour, efficiencyFactor, setupTime, unit, remark } = req.body

      if (!equipmentId || !productName || !capacityPerHour) {
        res.status(400).json({ success: false, error: '缺少必要参数: equipmentId, productName, capacityPerHour' })
        return
      }

      const result = await capacityService.createCapability(
        { equipmentId, productName, processName, capacityPerHour, efficiencyFactor, setupTime, unit, remark },
        userId
      )

      if (!result.success) {
        res.status(400).json({ success: false, error: result.message })
        return
      }
      res.status(201).json({ success: true, data: result.data, message: result.message })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/equipment - 获取产能列表 */
  async getCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const pageSize = parseInt(req.query.pageSize as string) || 20
      const keyword = req.query.keyword as string | undefined
      const equipmentId = req.query.equipmentId as string | undefined
      const status = req.query.status as string | undefined

      const result = await capacityService.getCapabilities({ page, pageSize, keyword, equipmentId, status })
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/equipment/:id - 获取产能详情 */
  async getCapabilityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await capacityService.getCapabilityById(id)

      if (!result.success) {
        res.status(404).json({ success: false, error: result.message })
        return
      }
      res.json({ success: true, data: result.data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** PUT /capacity/equipment/:id - 更新产能 */
  async updateCapability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await capacityService.updateCapability(id, req.body)

      if (!result.success) {
        res.status(404).json({ success: false, error: result.message })
        return
      }
      res.json({ success: true, data: result.data, message: result.message })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** DELETE /capacity/equipment/:id - 删除产能 */
  async deleteCapability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await capacityService.deleteCapability(id)

      if (!result.success) {
        res.status(404).json({ success: false, error: result.message })
        return
      }
      res.json({ success: true, message: result.message })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // ============================================
  // 操作员技能 CRUD
  // ============================================

  /** POST /capacity/operators - 创建操作员技能 */
  async createOperatorSkill(req: Request, res: Response): Promise<void> {
    try {
      const { operatorName, equipmentId, skillLevel, efficiencyFactor, certificationDate, isPrimary, remark } = req.body

      if (!operatorName || !equipmentId) {
        res.status(400).json({ success: false, error: '缺少必要参数: operatorName, equipmentId' })
        return
      }

      const result = await capacityService.createOperatorSkill(
        { operatorName, equipmentId, skillLevel, efficiencyFactor, certificationDate, isPrimary, remark }
      )

      if (!result.success) {
        res.status(400).json({ success: false, error: result.message })
        return
      }
      res.status(201).json({ success: true, data: result.data, message: result.message })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/operators - 获取技能列表 */
  async getOperatorSkills(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const pageSize = parseInt(req.query.pageSize as string) || 20
      const equipmentId = req.query.equipmentId as string | undefined
      const operatorName = req.query.operatorName as string | undefined

      const result = await capacityService.getOperatorSkills({ page, pageSize, equipmentId, operatorName })
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** PUT /capacity/operators/:id - 更新技能 */
  async updateOperatorSkill(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await capacityService.updateOperatorSkill(id, req.body)

      if (!result.success) {
        res.status(404).json({ success: false, error: result.message })
        return
      }
      res.json({ success: true, data: result.data, message: result.message })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** DELETE /capacity/operators/:id - 删除技能 */
  async deleteOperatorSkill(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await capacityService.deleteOperatorSkill(id)

      if (!result.success) {
        res.status(404).json({ success: false, error: result.message })
        return
      }
      res.json({ success: true, message: result.message })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // ============================================
  // 产能查询与分析
  // ============================================

  /** GET /capacity/products/:productName/available-equipment - 查询可用设备 */
  async getAvailableEquipment(req: Request, res: Response): Promise<void> {
    try {
      const productName = decodeURIComponent(req.params.productName)
      const data = await capacityService.getAvailableEquipment(productName)
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** POST /capacity/calculate-requirements - 产能需求计算 */
  async calculateRequirements(req: Request, res: Response): Promise<void> {
    try {
      const { requirements } = req.body
      if (!Array.isArray(requirements) || requirements.length === 0) {
        res.status(400).json({ success: false, error: '请提供需求列表 requirements[]' })
        return
      }
      const data = await capacityService.calculateRequirements(requirements)
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/equipment-utilization - 设备利用率统计 */
  async getEquipmentUtilization(_req: Request, res: Response): Promise<void> {
    try {
      const data = await capacityService.getEquipmentUtilization()
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/operator-efficiency - 操作员效率统计 */
  async getOperatorEfficiency(_req: Request, res: Response): Promise<void> {
    try {
      const data = await capacityService.getOperatorEfficiency()
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/analysis-report - 产能分析报告 */
  async getAnalysisReport(_req: Request, res: Response): Promise<void> {
    try {
      const data = await capacityService.getAnalysisReport()
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** POST /capacity/equipment/batch-import - 批量导入 */
  async batchImport(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, error: '请提供导入数据 items[]' })
        return
      }

      const userId = ((req as { user?: { id?: string } }).user?.id) ?? 'system'
      const result = await capacityService.batchImportCapabilities(items, userId)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  /** GET /capacity/export - 导出数据 */
  async exportData(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || 'json'
      const data = await capacityService.exportData(format)
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },
}
