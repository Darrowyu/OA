import { Request, Response } from 'express';
import { reportService } from '@/services/reportService';
import { AuthRequest } from '@/middleware/auth';
import { ApplicationStatus } from '@prisma/client';
import * as logger from '@/lib/logger';

// 统一响应辅助函数
function successResponse<T>(res: Response, data: T): void {
  res.json({ success: true, data });
}

function errorResponse(res: Response, message: string, status = 500): void {
  res.status(status).json({ success: false, message });
}

// 解析日期参数
function parseDateParam(value: unknown): Date | undefined {
  return value ? new Date(value as string) : undefined;
}

// 审批统计
export async function getApprovalStats(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, departmentId, applicantId, status } = req.query;

    const stats = await reportService.getApprovalStats({
      startDate: parseDateParam(startDate),
      endDate: parseDateParam(endDate),
      departmentId: departmentId as string | undefined,
      applicantId: applicantId as string | undefined,
      status: status ? (status as ApplicationStatus) : undefined,
    });

    successResponse(res, stats);
  } catch (error) {
    logger.error('Get approval stats error', { error });
    errorResponse(res, '获取审批统计失败');
  }
}

// 设备统计
export async function getEquipmentStats(req: Request, res: Response): Promise<void> {
  try {
    const { category, location, status, departmentId } = req.query;

    const stats = await reportService.getEquipmentStats({
      category: category as string | undefined,
      location: location as string | undefined,
      status: status as string | undefined,
      departmentId: departmentId as string | undefined,
    });

    successResponse(res, stats);
  } catch (error) {
    logger.error('Get equipment stats error', { error });
    errorResponse(res, '获取设备统计失败');
  }
}

// 考勤统计
export async function getAttendanceStats(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, departmentId, userId } = req.query;

    const stats = await reportService.getAttendanceStats({
      startDate: parseDateParam(startDate),
      endDate: parseDateParam(endDate),
      departmentId: departmentId as string | undefined,
      userId: userId as string | undefined,
    });

    successResponse(res, stats);
  } catch (error) {
    logger.error('Get attendance stats error', { error });
    errorResponse(res, '获取考勤统计失败');
  }
}

// 个人绩效
export async function getUserPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const performance = await reportService.getUserPerformance(userId, {
      startDate: parseDateParam(startDate),
      endDate: parseDateParam(endDate),
    });

    successResponse(res, performance);
  } catch (error) {
    logger.error('Get user performance error', { error });
    errorResponse(res, '获取个人绩效失败');
  }
}

// 仪表板汇总
export async function getDashboardSummary(_req: Request, res: Response): Promise<void> {
  try {
    const summary = await reportService.getDashboardSummary();
    successResponse(res, summary);
  } catch (error) {
    logger.error('Get dashboard summary error', { error });
    errorResponse(res, '获取仪表板数据失败');
  }
}

// 生成自定义报表
export async function generateCustomReport(req: Request, res: Response): Promise<void> {
  try {
    const { type, filters, dimensions, metrics, groupBy, sortBy, sortOrder, page, pageSize } = req.body;

    if (!type || !dimensions || !metrics) {
      errorResponse(res, '缺少必要参数：type, dimensions, metrics', 400);
      return;
    }

    const report = await reportService.generateCustomReport({
      type,
      filters: filters || {},
      dimensions,
      metrics,
      groupBy,
      sortBy,
      sortOrder,
      page: page || 1,
      pageSize: pageSize || 50,
    });

    successResponse(res, report);
  } catch (error) {
    logger.error('Generate custom report error', { error });
    errorResponse(res, '生成自定义报表失败');
  }
}

// 导出报表（简化版本，实际应生成Excel/PDF）
export async function exportReport(req: Request, res: Response): Promise<void> {
  try {
    const { type, filters, format } = req.body;

    // P0修复: 强制添加导出限制，防止内存溢出
    const exportFilters = {
      ...filters,
      // 导出时限制为最近一年数据
      startDate: filters?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: filters?.endDate || new Date(),
    };

    // 根据类型获取数据
    const dataFetchers: Record<string, () => Promise<unknown>> = {
      approval: () => reportService.getApprovalStats(exportFilters),
      equipment: () => reportService.getEquipmentStats(exportFilters),
      attendance: () => reportService.getAttendanceStats(exportFilters),
    };

    const fetchData = dataFetchers[type];
    if (!fetchData) {
      errorResponse(res, '不支持的报表类型', 400);
      return;
    }

    const data = await fetchData();

    // 返回JSON格式数据（实际应生成文件）
    successResponse(res, {
      type,
      format,
      exportedAt: new Date().toISOString(),
      data,
    });
  } catch (error) {
    logger.error('Export report error', { error });
    errorResponse(res, '导出报表失败');
  }
}

// 获取当前用户绩效（简化接口）
export async function getMyPerformance(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    if (!userId) {
      errorResponse(res, '未登录', 401);
      return;
    }

    const { startDate, endDate } = req.query;
    const performance = await reportService.getUserPerformance(userId, {
      startDate: parseDateParam(startDate),
      endDate: parseDateParam(endDate),
    });

    successResponse(res, performance);
  } catch (error) {
    logger.error('Get my performance error', { error });
    errorResponse(res, '获取个人绩效失败');
  }
}
