import type { Request, Response } from 'express'
import { partInventoryService } from '../services/partInventoryService'
import { partService } from '../services/partService'
import { prisma } from '../lib/prisma'

type AuthRequest = Request & {
  user?: {
    id: string
    role: string
    isActive: boolean
  }
}

export const partInventoryController = {
  async getInventoryLogs(req: Request, res: Response): Promise<void> {
    try {
      const { partId } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await partInventoryService.getInventoryLogs(
        partId as string || null,
        page,
        pageSize
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getStockAlerts(_req: Request, res: Response): Promise<void> {
    try {
      const alerts = await partInventoryService.getStockAlerts();
      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async generateRequisition(req: Request, res: Response): Promise<void> {
    try {
      const lowStockOnly = req.query.lowStockOnly !== 'false';
      const requisition = await partInventoryService.generateRequisition(lowStockOnly);
      res.json({ success: true, data: requisition });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 配件丰富统计
  async getTopUsed(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await partService.getTopUsed(limit);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getMonthlyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const data = await partService.getMonthlyStatistics(year, month);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getByCategoryStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partService.getByCategoryStatistics();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getByEquipmentStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partService.getByEquipmentStatistics();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getFullStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partService.getFullStatistics();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 低库存专用查询
  async getLowStock(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partService.getLowStock();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 单配件库存调整
  async adjustPartStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';
      await partService.adjustStock(id, req.body, userId);
      res.json({ success: true, message: '库存调整成功' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 批量库存调整
  async batchAdjustStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, error: '请提供调整项列表' });
        return;
      }
      const userId = req.user?.id || 'system';
      const result = await partService.batchAdjustStock(items, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 单配件库存日志
  async getPartInventoryLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const type = req.query.type as string | undefined;
      const data = await partService.getPartInventoryLogs(id, { page, pageSize, type });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 单配件使用统计
  async getPartUsageStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await partService.getPartUsageStatistics(id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 库存日志导出 Excel
  async exportInventoryLogs(req: Request, res: Response): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const { partId, type, startDate, endDate } = req.query;
      const where: Record<string, unknown> = {};
      if (partId) where.partId = partId;
      if (type) where.type = type;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate as string);
        if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate as string);
      }

      const logs = await prisma.partStock.findMany({
        where,
        include: { part: { select: { name: true, code: true, model: true, unit: true } } },
        orderBy: { date: 'desc' },
        take: 5000,
      });

      const data = logs.map(log => ({
        '配件编号': log.part.code,
        '配件名称': log.part.name,
        '型号': log.part.model,
        '类型': log.type === 'IN' ? '入库' : '出库',
        '数量': log.quantity,
        '变更前库存': log.beforeStock,
        '变更后库存': log.afterStock,
        '来源': log.source,
        '操作人': log.operator,
        '凭证号': log.documentNo || '',
        '日期': log.date.toISOString().split('T')[0],
        '备注': log.remark || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '库存日志');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=inventory-logs-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 生命周期：即将过期
  async getExpiringLifecycles(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await partInventoryService.getExpiringLifecycles(days);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 生命周期：已过期
  async getExpiredLifecycles(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partInventoryService.getExpiredLifecycles();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 生命周期：活跃安装
  async getActiveLifecycles(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partInventoryService.getActiveLifecycles();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 生命周期：异常记录
  async getAbnormalLifecycles(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partInventoryService.getAbnormalLifecycles();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 生命周期仪表盘
  async getLifecycleDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partInventoryService.getLifecycleDashboard();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 批量刷新生命周期状态
  async refreshLifecycleStatuses(_req: Request, res: Response): Promise<void> {
    try {
      const data = await partInventoryService.refreshLifecycleStatuses();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 标记异常
  async markAbnormal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await partInventoryService.markAbnormal(id);
      res.json({ success: true, message: '已标记为异常' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 标记过期
  async markExpired(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await partInventoryService.markExpired(id);
      res.json({ success: true, message: '已标记为过期' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 配件替换
  async replaceLifecycle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await partInventoryService.replaceLifecycle(id, req.body);
      res.json({ success: true, message: '配件替换成功' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  // 设备适用配件列表
  async getEquipmentSpareParts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await partInventoryService.getEquipmentSpareParts(id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
};
