import { Request, Response } from 'express';
import { getAuditLogs, getAuditStats, getAuditLogById, AuditLogQueryParams } from '../services/auditService';
import logger from '../lib/logger';
import { success, fail } from '../utils/response';

/**
 * 获取审计日志列表
 * GET /api/audit/logs
 */
export async function getAuditLogsController(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = '1',
      pageSize = '20',
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      search,
    } = req.query as Record<string, string | undefined>;

    const params: AuditLogQueryParams = {
      page: Math.max(1, parseInt(page, 10)),
      pageSize: Math.min(100, Math.max(1, parseInt(pageSize || '20', 10))),
    };

    if (userId) params.userId = userId;
    if (action) params.action = action;
    if (entityType) params.entityType = entityType;
    if (entityId) params.entityId = entityId;
    if (search) params.search = search;

    if (startDate) {
      params.startDate = new Date(startDate);
    }
    if (endDate) {
      params.endDate = new Date(endDate);
    }

    const result = await getAuditLogs(params);

    res.json(success(result.items, {
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    }));
  } catch (error) {
    logger.error('获取审计日志列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取审计日志列表时发生错误'));
  }
}

/**
 * 获取审计日志统计
 * GET /api/audit/stats
 */
export async function getAuditStatsController(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate);
    }
    if (endDate) {
      end = new Date(endDate);
    }

    const stats = await getAuditStats(start, end);
    res.json(success(stats));
  } catch (error) {
    logger.error('获取审计日志统计失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取审计日志统计时发生错误'));
  }
}

/**
 * 获取单条审计日志详情
 * GET /api/audit/logs/:id
 */
export async function getAuditLogByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const log = await getAuditLogById(id);

    if (!log) {
      res.status(404).json(fail('NOT_FOUND', '审计日志不存在'));
      return;
    }

    res.json(success(log));
  } catch (error) {
    logger.error('获取审计日志详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取审计日志详情时发生错误'));
  }
}

/**
 * 获取审计日志的操作类型列表
 * GET /api/audit/actions
 */
export async function getAuditActionsController(_req: Request, res: Response): Promise<void> {
  try {
    // 预定义常见的操作类型
    const commonActions = [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_APPLICATION',
      'UPDATE_APPLICATION',
      'DELETE_APPLICATION',
      'APPROVE_APPLICATION',
      'REJECT_APPLICATION',
      'CREATE_EQUIPMENT',
      'UPDATE_EQUIPMENT',
      'DELETE_EQUIPMENT',
      'CREATE_MAINTENANCE',
      'UPDATE_MAINTENANCE',
      'DELETE_MAINTENANCE',
      'EXPORT_DATA',
      'IMPORT_DATA',
      'SYSTEM_SETTING',
    ];

    res.json(success(commonActions));
  } catch (error) {
    logger.error('获取审计操作类型失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取审计操作类型时发生错误'));
  }
}

/**
 * 获取审计日志的实体类型列表
 * GET /api/audit/entity-types
 */
export async function getEntityTypesController(_req: Request, res: Response): Promise<void> {
  try {
    // 预定义常见的实体类型
    const commonEntityTypes = [
      'User',
      'Application',
      'Equipment',
      'MaintenanceRecord',
      'MaintenancePlan',
      'Part',
      'PartUsage',
      'PartScrap',
      'Department',
      'System',
    ];

    res.json(success(commonEntityTypes));
  } catch (error) {
    logger.error('获取审计实体类型失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取审计实体类型时发生错误'));
  }
}
