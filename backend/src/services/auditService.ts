import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import logger from '../lib/logger';

// 创建审计日志数据类型
export interface CreateAuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

// 查询参数类型
export interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// 审计日志响应类型
export interface AuditLogResponse {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  description: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    username: string;
    departmentId: string | null;
  };
}

// 统计数据类型
export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  actionStats: Array<{
    action: string;
    count: number;
  }>;
  entityTypeStats: Array<{
    entityType: string;
    count: number;
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
  }>;
}

// 敏感字段列表
const SENSITIVE_FIELDS = ['password', 'twoFactorSecret', 'token', 'refreshToken', 'secret', 'apiKey', 'privateKey'];

/**
 * 过滤敏感数据字段
 * 在记录审计日志前移除敏感信息
 */
function filterSensitiveData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (!data || typeof data !== 'object') {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => {
      const isSensitive = SENSITIVE_FIELDS.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      );
      if (isSensitive) {
        logger.debug(`审计日志过滤敏感字段: ${key}`);
      }
      return !isSensitive;
    })
  );
}

/**
 * 创建审计日志
 * 失败不应影响主业务流程
 */
export async function createAuditLog(data: CreateAuditLogData): Promise<void> {
  try {
    // 过滤敏感字段
    const filteredOldValues = filterSensitiveData(data.oldValues);
    const filteredNewValues = filterSensitiveData(data.newValues);

    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: filteredOldValues ? (filteredOldValues as Prisma.InputJsonValue) : undefined,
        newValues: filteredNewValues ? (filteredNewValues as Prisma.InputJsonValue) : undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        description: data.description,
      },
    });
  } catch (error) {
    // 审计日志失败不应影响主业务流程，仅记录错误
    logger.error('创建审计日志失败', {
      error: error instanceof Error ? error.message : '未知错误',
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
      }, // 不记录完整的oldValues/newValues避免敏感信息泄露
    });
  }
}

/**
 * 批量创建审计日志
 */
export async function createAuditLogs(dataList: CreateAuditLogData[]): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: dataList.map((data) => ({
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: filterSensitiveData(data.oldValues) as Prisma.InputJsonValue | undefined,
        newValues: filterSensitiveData(data.newValues) as Prisma.InputJsonValue | undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        description: data.description,
      })),
    });
  } catch (error) {
    logger.error('批量创建审计日志失败', {
      error: error instanceof Error ? error.message : '未知错误',
      count: dataList.length,
    });
  }
}

/**
 * 查询审计日志列表
 */
export async function getAuditLogs(
  params: AuditLogQueryParams
): Promise<{ items: AuditLogResponse[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const {
    page = 1,
    pageSize = 20,
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    search,
  } = params;

  const skip = (page - 1) * pageSize;
  const take = Math.min(100, Math.max(1, pageSize));

  // 构建查询条件
  const where: Prisma.AuditLogWhereInput = {};

  if (userId) {
    where.userId = userId;
  }

  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }

  if (entityType) {
    where.entityType = { contains: entityType, mode: 'insensitive' };
  }

  if (entityId) {
    where.entityId = entityId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entityType: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      {
        user: {
          name: { contains: search, mode: 'insensitive' },
        },
      },
    ];
  }

  // 并行查询总数和数据
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            departmentId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  return {
    items: items as AuditLogResponse[],
    total,
    page,
    pageSize: take,
    totalPages,
  };
}

/**
 * 获取审计日志统计信息
 */
export async function getAuditStats(startDate?: Date, endDate?: Date): Promise<AuditStats> {
  const where: Prisma.AuditLogWhereInput = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  // 获取总数
  const totalLogs = await prisma.auditLog.count({ where });

  // 获取今日日志数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = await prisma.auditLog.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  // 获取操作类型统计
  const actionStats = await prisma.auditLog.groupBy({
    by: ['action'],
    where,
    _count: {
      action: true,
    },
  });

  // 获取实体类型统计
  const entityTypeStats = await prisma.auditLog.groupBy({
    by: ['entityType'],
    where,
    _count: {
      entityType: true,
    },
  });

  // 获取每日统计（最近30天）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const dailyStatsRaw = await prisma.auditLog.groupBy({
    by: ['createdAt'],
    where: {
      ...where,
      createdAt: {
        gte: thirtyDaysAgo,
        ...(endDate && { lte: endDate }),
      },
    },
    _count: {
      id: true,
    },
  });

  // 格式化每日统计
  const dailyStatsMap = new Map<string, number>();
  dailyStatsRaw.forEach((stat) => {
    const dateStr = stat.createdAt.toISOString().split('T')[0];
    dailyStatsMap.set(dateStr, (dailyStatsMap.get(dateStr) || 0) + stat._count.id);
  });

  // 填充没有数据的日期
  const dailyStats: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyStats.push({
      date: dateStr,
      count: dailyStatsMap.get(dateStr) || 0,
    });
  }

  return {
    totalLogs,
    todayLogs,
    actionStats: actionStats.map((stat) => ({
      action: stat.action,
      count: stat._count.action,
    })),
    entityTypeStats: entityTypeStats.map((stat) => ({
      entityType: stat.entityType,
      count: stat._count.entityType,
    })),
    dailyStats,
  };
}

/**
 * 获取单条审计日志详情
 */
export async function getAuditLogById(id: string): Promise<AuditLogResponse | null> {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          departmentId: true,
        },
      },
    },
  });

  return log as AuditLogResponse | null;
}

/**
 * 清理过期审计日志
 */
export async function cleanupAuditLogs(beforeDate: Date): Promise<number> {
  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: beforeDate,
      },
    },
  });

  return result.count;
}