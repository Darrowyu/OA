import type { Request, Response } from 'express'
import { equipmentHealthService } from '../services/equipmentHealthService'

export const equipmentHealthController = {
  async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const assessor = (req as { user?: { username?: string } }).user?.username || 'system'
      const result = await equipmentHealthService.calculateHealth(id, assessor)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // 获取设备当前健康度（不重新计算）
  async getCurrentHealth(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await equipmentHealthService.getCurrentHealth(id)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const limit = parseInt(req.query.limit as string) || 12
      const history = await equipmentHealthService.getHealthHistory(id, limit)
      res.json({ success: true, data: history })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const prediction = await equipmentHealthService.getFaultPrediction(id)
      res.json({ success: true, data: prediction })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // 趋势预警
  async getTrendAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await equipmentHealthService.getTrendAlerts(id)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async batchCalculate(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentIds } = req.body
      if (!Array.isArray(equipmentIds) || equipmentIds.length === 0) {
        res.status(400).json({ success: false, error: '请提供设备ID列表' })
        return
      }
      const assessor = (req as { user?: { username?: string } }).user?.username || 'system'
      const result = await equipmentHealthService.batchCalculate(equipmentIds, assessor)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // 健康度统计（真实数据）
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const factoryId = _req.query.factoryId as string | undefined
      const data = await equipmentHealthService.getStatistics(factoryId)
      res.json({ success: true, data })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // 缓存统计
  async getCacheStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = equipmentHealthService.getCacheStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // 清除缓存
  async clearCache(_req: Request, res: Response): Promise<void> {
    try {
      const result = equipmentHealthService.clearCache()
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
