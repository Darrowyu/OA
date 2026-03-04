import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const partInventoryService = {
  // 库存日志查询
  async getInventoryLogs(partId: string | null, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const where = partId ? { partId } : {};

    const [logs, total] = await Promise.all([
      prisma.partInventoryLog.findMany({
        where,
        include: {
          part: {
            select: { code: true, name: true, unit: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.partInventoryLog.count({ where })
    ]);

    return { logs, total, page, pageSize };
  },

  // 库存预警
  async getStockAlerts() {
    const parts = await prisma.part.findMany({
      where: {
        OR: [
          { stock: { lte: prisma.part.fields.minStock } },
          { AND: [
            { maxStock: { gt: 0 } },
            { stock: { gte: prisma.part.fields.maxStock } }
          ]}
        ]
      },
      include: {
        sparePartCategory: {
          select: { name: true }
        }
      }
    });

    return parts.map(part => ({
      ...part,
      alertType: part.stock <= (part.minStock || 0) ? 'low' : 'high',
      alertMessage: part.stock <= (part.minStock || 0)
        ? `库存不足：当前 ${part.stock}，最低要求 ${part.minStock}`
        : `库存过高：当前 ${part.stock}，最高限制 ${part.maxStock}`
    }));
  },

  // 生成请购单
  async generateRequisition(lowStockOnly: boolean = true) {
    const where = lowStockOnly
      ? { stock: { lte: prisma.part.fields.minStock } }
      : {};

    const parts = await prisma.part.findMany({
      where,
      include: {
        sparePartCategory: {
          select: { name: true }
        }
      }
    });

    return {
      requisitionNo: `RQ${Date.now()}`,
      createdAt: new Date(),
      totalItems: parts.length,
      items: parts.map(part => ({
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        specification: part.model,
        currentStock: part.stock,
        minStock: part.minStock,
        suggestedQuantity: Math.max((part.minStock || 0) * 2 - part.stock, 10),
        unit: part.unit,
        category: part.sparePartCategory?.name,
        unitPrice: part.unitPrice
      }))
    };
  },

  // 记录库存变动
  async recordInventoryLog(
    partId: string,
    type: 'in' | 'out' | 'adjust',
    quantity: number,
    beforeQuantity: number,
    afterQuantity: number,
    operator?: string,
    notes?: string,
    referenceType?: string,
    referenceId?: string
  ) {
    return prisma.partInventoryLog.create({
      data: {
        partId,
        type,
        quantity,
        beforeQuantity,
        afterQuantity,
        operator,
        notes,
        referenceType,
        referenceId
      }
    });
  },

  // 生命周期：即将过期的配件
  async getExpiringLifecycles(days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return prisma.partLifecycle.findMany({
      where: {
        status: { in: ['ACTIVE', 'WARNING'] },
        expectedEndDate: { lte: futureDate, gte: new Date() }
      },
      include: { part: { select: { code: true, name: true, model: true, unit: true } } },
      orderBy: { expectedEndDate: 'asc' }
    });
  },

  // 生命周期：已过期的配件
  async getExpiredLifecycles() {
    return prisma.partLifecycle.findMany({
      where: {
        OR: [
          { status: 'EXPIRED' },
          { expectedEndDate: { lt: new Date() }, status: { not: 'EXPIRED' } }
        ]
      },
      include: { part: { select: { code: true, name: true, model: true, unit: true } } },
      orderBy: { expectedEndDate: 'asc' }
    });
  },

  // 生命周期：活跃安装
  async getActiveLifecycles() {
    return prisma.partLifecycle.findMany({
      where: { status: 'ACTIVE' },
      include: { part: { select: { code: true, name: true, model: true, unit: true } } },
      orderBy: { installedAt: 'desc' }
    });
  },

  // 生命周期：异常记录
  async getAbnormalLifecycles() {
    return prisma.partLifecycle.findMany({
      where: { status: 'CRITICAL' },
      include: { part: { select: { code: true, name: true, model: true, unit: true } } },
      orderBy: { updatedAt: 'desc' }
    });
  },

  // 生命周期仪表盘
  async getLifecycleDashboard() {
    const [total, active, warning, critical, expired] = await Promise.all([
      prisma.partLifecycle.count(),
      prisma.partLifecycle.count({ where: { status: 'ACTIVE' } }),
      prisma.partLifecycle.count({ where: { status: 'WARNING' } }),
      prisma.partLifecycle.count({ where: { status: 'CRITICAL' } }),
      prisma.partLifecycle.count({ where: { status: 'EXPIRED' } }),
    ]);

    // 即将过期（30天内）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const expiringSoon = await prisma.partLifecycle.count({
      where: {
        status: { in: ['ACTIVE', 'WARNING'] },
        expectedEndDate: { lte: futureDate, gte: new Date() }
      }
    });

    return { total, active, warning, critical, expired, expiringSoon };
  },

  // 批量刷新生命周期状态
  async refreshLifecycleStatuses(): Promise<{ updated: number }> {
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 15); // 15天内预警

    // 更新过期的
    const expiredResult = await prisma.partLifecycle.updateMany({
      where: {
        status: { not: 'EXPIRED' },
        expectedEndDate: { lt: now }
      },
      data: { status: 'EXPIRED' }
    });

    // 更新即将过期的（WARNING）
    const warningResult = await prisma.partLifecycle.updateMany({
      where: {
        status: 'ACTIVE',
        expectedEndDate: { lte: warningDate, gte: now }
      },
      data: { status: 'WARNING' }
    });

    // 更新剩余周期为0的（CRITICAL）
    const criticalResult = await prisma.partLifecycle.updateMany({
      where: {
        status: { in: ['ACTIVE', 'WARNING'] },
        remainingCycles: { lte: 0 }
      },
      data: { status: 'CRITICAL' }
    });

    return { updated: expiredResult.count + warningResult.count + criticalResult.count };
  },

  // 标记异常
  async markAbnormal(id: string): Promise<void> {
    await prisma.partLifecycle.update({
      where: { id },
      data: { status: 'CRITICAL' }
    });
  },

  // 标记过期
  async markExpired(id: string): Promise<void> {
    await prisma.partLifecycle.update({
      where: { id },
      data: { status: 'EXPIRED' }
    });
  },

  // 配件替换
  async replaceLifecycle(id: string, data: { newPartId?: string; resetCycles?: boolean }): Promise<void> {
    const lifecycle = await prisma.partLifecycle.findUnique({ where: { id } });
    if (!lifecycle) throw new Error('生命周期记录不存在');

    // 标记旧的为过期
    await prisma.partLifecycle.update({
      where: { id },
      data: { status: 'EXPIRED' }
    });

    // 如果提供了新配件，创建新的生命周期记录
    if (data.newPartId) {
      await prisma.partLifecycle.create({
        data: {
          partId: data.newPartId,
          totalCycles: lifecycle.totalCycles,
          installedCycles: 0,
          remainingCycles: lifecycle.totalCycles,
          avgUsage: lifecycle.avgUsage,
          status: 'ACTIVE',
          installedAt: new Date(),
          expectedEndDate: lifecycle.avgUsage > 0
            ? new Date(Date.now() + (lifecycle.totalCycles / lifecycle.avgUsage) * 24 * 3600 * 1000)
            : null,
          equipmentId: lifecycle.equipmentId,
        }
      });
    }
  },

  // 设备适用配件列表
  async getEquipmentSpareParts(equipmentId: string) {
    // 从配件领用记录中找到该设备使用过的配件
    const usages = await prisma.partUsage.findMany({
      where: { equipmentId, status: { in: ['APPROVED', 'COMPLETED'] } },
      include: {
        part: {
          select: {
            id: true, code: true, name: true, model: true,
            category: true, stock: true, minStock: true, unit: true,
            unitPrice: true, status: true
          }
        }
      },
      distinct: ['partId']
    });

    // 从维修记录的 partsUsed 字段中提取配件
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: { equipmentId, partsUsed: { not: { equals: [] } } },
      select: { partsUsed: true }
    });

    const partIds = new Set(usages.map(u => u.partId));
    for (const record of maintenanceRecords) {
      if (record.partsUsed && Array.isArray(record.partsUsed)) {
        for (const p of record.partsUsed as Array<{ partId?: string }>) {
          if (p.partId) partIds.add(p.partId);
        }
      }
    }

    // 获取所有关联配件的完整信息
    const parts = await prisma.part.findMany({
      where: { id: { in: Array.from(partIds) } },
      select: {
        id: true, code: true, name: true, model: true,
        category: true, stock: true, minStock: true, unit: true,
        unitPrice: true, status: true
      }
    });

    return parts;
  }
};
