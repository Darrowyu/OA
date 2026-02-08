import { Request, Response } from 'express';
import { reportService } from '@/services/reportService';
import { AuthRequest } from '@/middleware/auth';
import { ApplicationStatus } from '@prisma/client';

// 审批统计
export async function getApprovalStats(req: Request, res: Response) {
  try {
    const { startDate, endDate, departmentId, applicantId, status } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      departmentId: departmentId as string | undefined,
      applicantId: applicantId as string | undefined,
      status: status ? status as ApplicationStatus : undefined,
    };

    const stats = await reportService.getApprovalStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取审批统计失败',
    });
  }
}

// 设备统计
export async function getEquipmentStats(req: Request, res: Response) {
  try {
    const { category, location, status, departmentId } = req.query;

    const filters = {
      category: category as string | undefined,
      location: location as string | undefined,
      status: status as string | undefined,
      departmentId: departmentId as string | undefined,
    };

    const stats = await reportService.getEquipmentStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get equipment stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取设备统计失败',
    });
  }
}

// 考勤统计
export async function getAttendanceStats(req: Request, res: Response) {
  try {
    const { startDate, endDate, departmentId, userId } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      departmentId: departmentId as string | undefined,
      userId: userId as string | undefined,
    };

    const stats = await reportService.getAttendanceStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取考勤统计失败',
    });
  }
}

// 个人绩效
export async function getUserPerformance(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const performance = await reportService.getUserPerformance(userId, filters);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error('Get user performance error:', error);
    res.status(500).json({
      success: false,
      message: '获取个人绩效失败',
    });
  }
}

// 仪表板汇总
export async function getDashboardSummary(_req: Request, res: Response) {
  try {
    const summary = await reportService.getDashboardSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败',
    });
  }
}

// 生成自定义报表
export async function generateCustomReport(req: Request, res: Response) {
  try {
    const { type, filters, dimensions, metrics, groupBy, sortBy, sortOrder, page, pageSize } = req.body;

    if (!type || !dimensions || !metrics) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：type, dimensions, metrics',
      });
      return;
    }

    const config = {
      type,
      filters: filters || {},
      dimensions,
      metrics,
      groupBy,
      sortBy,
      sortOrder,
      page: page || 1,
      pageSize: pageSize || 50,
    };

    const report = await reportService.generateCustomReport(config);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Generate custom report error:', error);
    res.status(500).json({
      success: false,
      message: '生成自定义报表失败',
    });
  }
}

// 导出报表（简化版本，实际应生成Excel/PDF）
export async function exportReport(req: Request, res: Response) {
  try {
    const { type, filters, format } = req.body;

    // 根据类型获取数据
    let data;
    switch (type) {
      case 'approval':
        data = await reportService.getApprovalStats(filters || {});
        break;
      case 'equipment':
        data = await reportService.getEquipmentStats(filters || {});
        break;
      case 'attendance':
        data = await reportService.getAttendanceStats(filters || {});
        break;
      default:
        res.status(400).json({
          success: false,
          message: '不支持的报表类型',
        });
        return;
    }

    // 返回JSON格式数据（实际应生成文件）
    res.json({
      success: true,
      data: {
        type,
        format,
        exportedAt: new Date().toISOString(),
        data,
      },
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: '导出报表失败',
    });
  }
}

// 获取当前用户绩效（简化接口）
export async function getMyPerformance(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未登录',
      });
      return;
    }

    const { startDate, endDate } = req.query;
    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const performance = await reportService.getUserPerformance(userId, filters);

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error('Get my performance error:', error);
    res.status(500).json({
      success: false,
      message: '获取个人绩效失败',
    });
  }
}
