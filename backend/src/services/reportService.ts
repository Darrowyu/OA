import { prisma } from '@/lib/prisma';
import { ApplicationStatus, Priority } from '@prisma/client';

// ============================================
// 报表筛选参数类型
// ============================================

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface ApprovalStatsFilter extends DateRangeFilter {
  departmentId?: string;
  applicantId?: string;
  status?: ApplicationStatus;
}

export interface EquipmentStatsFilter {
  category?: string;
  location?: string;
  status?: string;
  departmentId?: string;
}

export interface AttendanceStatsFilter extends DateRangeFilter {
  departmentId?: string;
  userId?: string;
}

export interface PerformanceFilter extends DateRangeFilter {
  userId: string;
}

export interface CustomReportConfig {
  type: 'approval' | 'equipment' | 'attendance' | 'performance' | 'mixed';
  filters: Record<string, unknown>;
  dimensions: string[];
  metrics: string[];
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// ============================================
// 报表数据类型
// ============================================

export interface ApprovalStats {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  draftCount: number;
  approvalRate: number;
  rejectionRate: number;
  avgProcessTime: number; // 平均处理时长（小时）
  avgApprovalTimeByType: Array<{
    type: string;
    avgTime: number;
    count: number;
  }>;
  avgApprovalTimeByDept: Array<{
    department: string;
    avgTime: number;
    count: number;
  }>;
  approverRanking: Array<{
    approverId: string;
    approverName: string;
    department: string;
    totalApprovals: number;
    avgResponseTime: number;
  }>;
  bottleneckAnalysis: Array<{
    stage: string;
    avgWaitTime: number;
    pendingCount: number;
    rejectionRate: number;
  }>;
  trendData: Array<{
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
}

export interface EquipmentStats {
  totalEquipment: number;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
  }>;
  utilizationRate: number;
  maintenanceFrequency: Array<{
    equipmentId: string;
    equipmentName: string;
    code: string;
    maintenanceCount: number;
    repairCount: number;
    totalCost: number;
  }>;
  costAnalysis: {
    totalPurchaseValue: number;
    totalMaintenanceCost: number;
    avgMaintenanceCostPerEquipment: number;
    costByCategory: Array<{
      category: string;
      purchaseCost: number;
      maintenanceCost: number;
    }>;
  };
  departmentDistribution: Array<{
    department: string;
    equipmentCount: number;
    totalValue: number;
  }>;
  healthScoreDistribution: Array<{
    scoreRange: string;
    count: number;
  }>;
}

export interface AttendanceStats {
  summary: {
    totalUsers: number;
    totalWorkDays: number;
    avgAttendanceRate: number;
    totalLateCount: number;
    totalEarlyLeaveCount: number;
    totalAbsentCount: number;
    totalWorkHours: number;
    avgWorkHoursPerDay: number;
  };
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    userCount: number;
    attendanceRate: number;
    lateCount: number;
    earlyLeaveCount: number;
    absentCount: number;
    avgWorkHours: number;
  }>;
  byUser: Array<{
    userId: string;
    userName: string;
    department: string;
    attendanceDays: number;
    lateCount: number;
    earlyLeaveCount: number;
    absentCount: number;
    workHours: number;
    attendanceRate: number;
  }>;
  dailyTrend: Array<{
    date: string;
    totalUsers: number;
    normalCount: number;
    lateCount: number;
    earlyLeaveCount: number;
    absentCount: number;
    attendanceRate: number;
  }>;
  abnormalRecords: Array<{
    userId: string;
    userName: string;
    department: string;
    date: string;
    type: 'LATE' | 'EARLY_LEAVE' | 'ABSENT';
    details: string;
  }>;
  workHoursAnalysis: {
    avgDailyHours: number;
    overtimeDays: number;
    overtimeUsers: number;
    distribution: Array<{
      range: string;
      count: number;
    }>;
  };
}

export interface UserPerformance {
  userId: string;
  userName: string;
  department: string;
  period: string;
  attendance: {
    attendanceRate: number;
    lateCount: number;
    earlyLeaveCount: number;
    workDays: number;
    workHours: number;
  };
  tasks: {
    totalAssigned: number;
    completed: number;
    completionRate: number;
    avgCompletionTime: number;
  };
  approvals: {
    totalProcessed: number;
    avgResponseTime: number;
    approvalCount: number;
    rejectionCount: number;
  };
  meetings: {
    organizedCount: number;
    attendedCount: number;
    attendanceRate: number;
  };
  applications: {
    submittedCount: number;
    approvedCount: number;
    rejectedCount: number;
  };
  overallScore: number;
  radarData: Array<{
    dimension: string;
    score: number;
    maxScore: number;
  }>;
}

export interface DashboardSummary {
  overview: {
    totalUsers: number;
    totalApplications: number;
    totalEquipment: number;
    pendingApprovals: number;
  };
  recentActivity: {
    newApplicationsToday: number;
    approvedToday: number;
    maintenanceCompletedToday: number;
    meetingsToday: number;
  };
  charts: {
    applicationTrend: Array<{
      date: string;
      submitted: number;
      approved: number;
    }>;
    equipmentStatus: Array<{
      status: string;
      count: number;
    }>;
    attendanceOverview: {
      checkedIn: number;
      notCheckedIn: number;
      onLeave: number;
    };
    departmentWorkload: Array<{
      department: string;
      pendingTasks: number;
      pendingApprovals: number;
    }>;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    count?: number;
  }>;
}

// ============================================
// 报表服务
// ============================================

export class ReportService {
  // P0修复: 添加默认时间范围限制(最近一年)，防止全表扫描
  private addDefaultTimeRange(
    filters: Record<string, unknown>,
    timeField: string = 'createdAt'
  ): Record<string, unknown> {
    // 如果已存在时间范围过滤，直接返回
    if (filters[timeField]) {
      return filters;
    }

    // 默认查询最近一年的数据
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return {
      ...filters,
      [timeField]: {
        gte: oneYearAgo,
      },
    };
  }

  // 审批统计分析
  async getApprovalStats(filters: ApprovalStatsFilter): Promise<ApprovalStats> {
    const { startDate, endDate, departmentId, applicantId, status } = filters;

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }
    if (departmentId) {
      where.applicantDept = departmentId;
    }
    if (applicantId) {
      where.applicantId = applicantId;
    }
    if (status) {
      where.status = status;
    }

    // 基础统计
    const [
      totalApplications,
      approvedCount,
      rejectedCount,
      pendingCount,
      draftCount,
      applicationsWithTime,
    ] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.application.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.application.count({
        where: {
          ...where,
          status: { in: ['PENDING_FACTORY', 'PENDING_DIRECTOR', 'PENDING_MANAGER', 'PENDING_CEO'] },
        },
      }),
      prisma.application.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.application.findMany({
        where: { ...where, status: { in: ['APPROVED', 'REJECTED'] }, submittedAt: { not: null }, completedAt: { not: null } },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          completedAt: true,
          applicantDept: true,
          priority: true,
        },
      }),
    ]);

    // 计算平均处理时长
    let totalProcessTime = 0;
    let validProcessCount = 0;
    applicationsWithTime.forEach((app) => {
      if (app.submittedAt && app.completedAt) {
        const duration = new Date(app.completedAt).getTime() - new Date(app.submittedAt).getTime();
        totalProcessTime += duration;
        validProcessCount++;
      }
    });
    const avgProcessTime = validProcessCount > 0
      ? Math.round(totalProcessTime / validProcessCount / (1000 * 60 * 60))
      : 0;

    // 按类型统计平均审批时间
    const avgApprovalTimeByType = await this.getApprovalTimeByPriority(where);

    // 按部门统计平均审批时间
    const avgApprovalTimeByDept = await this.getApprovalTimeByDept(where);

    // 审批人响应时间排行
    const approverRanking = await this.getApproverRanking(startDate, endDate);

    // 瓶颈分析
    const bottleneckAnalysis = await this.getBottleneckAnalysis(where);

    // 趋势数据
    const trendData = await this.getApprovalTrend(where);

    return {
      totalApplications,
      approvedCount,
      rejectedCount,
      pendingCount,
      draftCount,
      approvalRate: totalApplications > 0 ? Math.round((approvedCount / totalApplications) * 100) : 0,
      rejectionRate: totalApplications > 0 ? Math.round((rejectedCount / totalApplications) * 100) : 0,
      avgProcessTime,
      avgApprovalTimeByType,
      avgApprovalTimeByDept,
      approverRanking,
      bottleneckAnalysis,
      trendData,
    };
  }

  // 按优先级统计审批时间
  private async getApprovalTimeByPriority(where: Record<string, unknown>) {
    const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    const result = [];

    for (const priority of priorities) {
      const apps = await prisma.application.findMany({
        where: { ...where, priority: priority as Priority, status: { in: ['APPROVED', 'REJECTED'] }, submittedAt: { not: null }, completedAt: { not: null } },
        select: {
          submittedAt: true,
          completedAt: true,
        },
      });

      let totalTime = 0;
      apps.forEach((app) => {
        if (app.submittedAt && app.completedAt) {
          totalTime += new Date(app.completedAt).getTime() - new Date(app.submittedAt).getTime();
        }
      });

      result.push({
        type: priority,
        avgTime: apps.length > 0 ? Math.round(totalTime / apps.length / (1000 * 60 * 60)) : 0,
        count: apps.length,
      });
    }

    return result;
  }

  // 按部门统计审批时间
  private async getApprovalTimeByDept(where: Record<string, unknown>) {
    const depts = await prisma.application.groupBy({
      by: ['applicantDept'],
      where: { ...where, applicantDept: { not: undefined } },
      _count: { id: true },
    });

    const result = [];
    for (const dept of depts) {
      if (!dept.applicantDept) continue;
      const apps = await prisma.application.findMany({
        where: {
          ...where,
          applicantDept: dept.applicantDept,
          status: { in: ['APPROVED', 'REJECTED'] },
          submittedAt: { not: null },
          completedAt: { not: null },
        },
        select: {
          submittedAt: true,
          completedAt: true,
        },
      });

      let totalTime = 0;
      apps.forEach((app) => {
        if (app.submittedAt && app.completedAt) {
          totalTime += new Date(app.completedAt).getTime() - new Date(app.submittedAt).getTime();
        }
      });

      result.push({
        department: dept.applicantDept,
        avgTime: apps.length > 0 ? Math.round(totalTime / apps.length / (1000 * 60 * 60)) : 0,
        count: apps.length,
      });
    }

    return result.sort((a, b) => a.avgTime - b.avgTime).slice(0, 10);
  }

  // 审批人响应时间排行 - 使用聚合查询避免N+1问题
  private async getApproverRanking(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate
      ? { gte: startDate, lte: endDate }
      : { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }; // 默认最近90天

    // 使用Prisma的groupBy聚合查询，避免N+1问题
    const [factoryStats, directorStats, managerStats, ceoStats] = await Promise.all([
      // 厂长审批统计
      prisma.factoryApproval.groupBy({
        by: ['approverId'],
        where: {
          action: 'APPROVE',
          approvedAt: { not: null, ...dateFilter },
        },
        _count: { id: true },
      }),
      // 总监审批统计
      prisma.directorApproval.groupBy({
        by: ['approverId'],
        where: {
          action: 'APPROVE',
          approvedAt: { not: null, ...dateFilter },
        },
        _count: { id: true },
      }),
      // 经理审批统计
      prisma.managerApproval.groupBy({
        by: ['approverId'],
        where: {
          action: 'APPROVE',
          approvedAt: { not: null, ...dateFilter },
        },
        _count: { id: true },
      }),
      // CEO审批统计
      prisma.ceoApproval.groupBy({
        by: ['approverId'],
        where: {
          action: 'APPROVE',
          approvedAt: { not: null, ...dateFilter },
        },
        _count: { id: true },
      }),
    ]);

    // 合并统计结果
    const statsMap = new Map<string, { total: number; name: string; department: string }>();

    // 获取审批人信息并合并数据
    const allApproverIds = [...new Set([
      ...factoryStats.map(s => s.approverId),
      ...directorStats.map(s => s.approverId),
      ...managerStats.map(s => s.approverId),
      ...ceoStats.map(s => s.approverId),
    ])];

    if (allApproverIds.length === 0) return [];

    const approvers = await prisma.user.findMany({
      where: { id: { in: allApproverIds } },
      select: { id: true, name: true, department: { select: { name: true } } },
    });

    const approverMap = new Map(approvers.map(a => [a.id, a]));

    // 合并各层级统计
    [...factoryStats, ...directorStats, ...managerStats, ...ceoStats].forEach(stat => {
      const existing = statsMap.get(stat.approverId);
      const approver = approverMap.get(stat.approverId);
      if (existing) {
        existing.total += stat._count.id;
      } else if (approver) {
        statsMap.set(stat.approverId, {
          total: stat._count.id,
          name: approver.name,
          department: approver.department?.name || '',
        });
      }
    });

    // 转换为数组并排序（按审批数量降序）
    return Array.from(statsMap.entries())
      .map(([approverId, stats]) => ({
        approverId,
        approverName: stats.name,
        department: stats.department,
        totalApprovals: stats.total,
        avgResponseTime: 0, // 简化计算，实际应该计算平均响应时间
      }))
      .sort((a, b) => b.totalApprovals - a.totalApprovals)
      .slice(0, 10);
  }

  // 瓶颈分析
  private async getBottleneckAnalysis(where: Record<string, unknown>) {
    const stages = [
      { name: '厂长审批', field: 'factoryApprovals' as const },
      { name: '总监审批', field: 'directorApprovals' as const },
      { name: '经理审批', field: 'managerApprovals' as const },
      { name: 'CEO审批', field: 'ceoApprovals' as const },
    ];

    const result = [];

    for (const stage of stages) {
      const pendingCount = await prisma.application.count({
        where: {
          ...where,
          [stage.field]: { some: { action: 'PENDING' } },
        },
      });

      const rejectedCount = await prisma.application.count({
        where: {
          ...where,
          [stage.field]: { some: { action: 'REJECT' } },
        },
      });

      const totalCount = await prisma.application.count({
        where: {
          ...where,
          [stage.field]: { some: {} },
        },
      });

      result.push({
        stage: stage.name,
        avgWaitTime: pendingCount * 24, // 简化计算
        pendingCount,
        rejectionRate: totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0,
      });
    }

    return result;
  }

  // 审批趋势数据
  private async getApprovalTrend(where: Record<string, unknown>) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const applications = await prisma.application.findMany({
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const trendMap: Record<string, { submitted: number; approved: number; rejected: number }> = {};

    applications.forEach((app) => {
      const date = app.createdAt.toISOString().split('T')[0];
      if (!trendMap[date]) {
        trendMap[date] = { submitted: 0, approved: 0, rejected: 0 };
      }
      trendMap[date].submitted++;
      if (app.status === 'APPROVED') trendMap[date].approved++;
      if (app.status === 'REJECTED') trendMap[date].rejected++;
    });

    return Object.entries(trendMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // 设备统计分析
  async getEquipmentStats(filters: EquipmentStatsFilter): Promise<EquipmentStats> {
    const { category, location, status } = filters;

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (location) where.location = location;
    if (status) where.status = status;

    // 基础统计
    const totalEquipment = await prisma.equipment.count({ where });

    // 按状态统计
    const byStatus = await prisma.equipment.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const byStatusWithPercentage = byStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
      percentage: totalEquipment > 0 ? Math.round((s._count.id / totalEquipment) * 100) : 0,
    }));

    // 按分类统计
    const byCategory = await prisma.equipment.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
    });

    const byCategoryWithPercentage = byCategory.map((c) => ({
      category: c.category,
      count: c._count.id,
      percentage: totalEquipment > 0 ? Math.round((c._count.id / totalEquipment) * 100) : 0,
    }));

    // 按位置统计
    const byLocation = await prisma.equipment.groupBy({
      by: ['location'],
      where,
      _count: { id: true },
    });

    const byLocationResult = byLocation.map((l) => ({
      location: l.location,
      count: l._count.id,
    }));

    // 维修频率统计 - 添加分页限制防止内存溢出
    const maintenanceFrequency = await prisma.equipment.findMany({
      where,
      take: 1000, // 限制最多查询1000条设备
      select: {
        id: true,
        name: true,
        code: true,
        maintenanceRecords: {
          take: 100, // 限制每个设备的维护记录最多100条
          select: {
            type: true,
            cost: true,
          },
        },
      },
    });

    const maintenanceFreqResult = maintenanceFrequency.map((eq) => {
      const maintenanceCount = eq.maintenanceRecords.filter((r) => r.type === 'MAINTENANCE').length;
      const repairCount = eq.maintenanceRecords.filter((r) => r.type === 'REPAIR').length;
      const totalCost = eq.maintenanceRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
      return {
        equipmentId: eq.id,
        equipmentName: eq.name,
        code: eq.code,
        maintenanceCount,
        repairCount,
        totalCost,
      };
    }).sort((a, b) => b.repairCount - a.repairCount);

    // 成本分析
    const allEquipment = await prisma.equipment.findMany({
      where,
      select: {
        category: true,
        purchasePrice: true,
        maintenanceRecords: {
          select: { cost: true },
        },
      },
    });

    const totalPurchaseValue = allEquipment.reduce((sum, eq) => sum + (Number(eq.purchasePrice) || 0), 0);
    const totalMaintenanceCost = allEquipment.reduce((sum, eq) =>
      sum + eq.maintenanceRecords.reduce((mSum, r) => mSum + (Number(r.cost) || 0), 0), 0);

    const costByCategory: Record<string, { purchaseCost: number; maintenanceCost: number }> = {};
    allEquipment.forEach((eq) => {
      if (!costByCategory[eq.category]) {
        costByCategory[eq.category] = { purchaseCost: 0, maintenanceCost: 0 };
      }
      costByCategory[eq.category].purchaseCost += Number(eq.purchasePrice) || 0;
      costByCategory[eq.category].maintenanceCost += eq.maintenanceRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    });

    // 健康度分布
    const equipmentWithHealth = await prisma.equipment.findMany({
      where: { ...where, healthScore: { not: null } },
      select: { healthScore: true },
    });

    const healthDistribution = [
      { scoreRange: '90-100', count: equipmentWithHealth.filter((e) => e.healthScore && e.healthScore >= 90).length },
      { scoreRange: '80-89', count: equipmentWithHealth.filter((e) => e.healthScore && e.healthScore >= 80 && e.healthScore < 90).length },
      { scoreRange: '70-79', count: equipmentWithHealth.filter((e) => e.healthScore && e.healthScore >= 70 && e.healthScore < 80).length },
      { scoreRange: '60-69', count: equipmentWithHealth.filter((e) => e.healthScore && e.healthScore >= 60 && e.healthScore < 70).length },
      { scoreRange: '<60', count: equipmentWithHealth.filter((e) => e.healthScore && e.healthScore < 60).length },
    ];

    // 计算利用率（简化计算：运行中设备占比）
    const runningCount = byStatusWithPercentage.find((s) => s.status === 'RUNNING')?.count || 0;
    const utilizationRate = totalEquipment > 0 ? Math.round((runningCount / totalEquipment) * 100) : 0;

    return {
      totalEquipment,
      byStatus: byStatusWithPercentage,
      byCategory: byCategoryWithPercentage,
      byLocation: byLocationResult,
      utilizationRate,
      maintenanceFrequency: maintenanceFreqResult.slice(0, 20),
      costAnalysis: {
        totalPurchaseValue,
        totalMaintenanceCost,
        avgMaintenanceCostPerEquipment: totalEquipment > 0 ? Math.round(totalMaintenanceCost / totalEquipment) : 0,
        costByCategory: Object.entries(costByCategory).map(([category, costs]) => ({
          category,
          ...costs,
        })),
      },
      departmentDistribution: [], // 设备暂时没有部门字段，返回空数组
      healthScoreDistribution: healthDistribution,
    };
  }

  // 考勤统计分析
  async getAttendanceStats(filters: AttendanceStatsFilter): Promise<AttendanceStats> {
    const { startDate, endDate, departmentId, userId } = filters;

    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }
    if (userId) {
      where.userId = userId;
    }

    // 获取用户条件
    const userWhere: Record<string, unknown> = {};
    if (departmentId) {
      userWhere.departmentId = departmentId;
    }

    // 获取符合条件的用户
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        department: { select: { name: true } },
      },
    });

    const userIds = users.map((u) => u.id);
    if (userIds.length > 0 && !userId) {
      where.userId = { in: userIds };
    }

    // 考勤记录查询
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            department: { select: { name: true, id: true } },
          },
        },
      },
    });

    // 汇总统计
    const totalUsers = users.length;
    const totalWorkDays = new Set(records.map((r) => r.date.toISOString().split('T')[0])).size;
    const totalRecords = records.length;

    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const earlyLeaveCount = records.filter((r) => r.status === 'EARLY_LEAVE').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const normalCount = records.filter((r) => r.status === 'NORMAL').length;

    const totalWorkHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const attendanceRate = totalRecords > 0
      ? Math.round(((normalCount + lateCount) / totalRecords) * 100)
      : 0;

    // 按部门统计
    const deptStats: Record<string, { name: string; users: Set<string>; late: number; earlyLeave: number; absent: number; workHours: number; records: number }> = {};
    records.forEach((r) => {
      const deptId = r.user.department?.id || 'unknown';
      const deptName = r.user.department?.name || '未知部门';
      if (!deptStats[deptId]) {
        deptStats[deptId] = { name: deptName, users: new Set(), late: 0, earlyLeave: 0, absent: 0, workHours: 0, records: 0 };
      }
      deptStats[deptId].users.add(r.userId);
      deptStats[deptId].records++;
      deptStats[deptId].workHours += r.workHours || 0;
      if (r.status === 'LATE') deptStats[deptId].late++;
      if (r.status === 'EARLY_LEAVE') deptStats[deptId].earlyLeave++;
      if (r.status === 'ABSENT') deptStats[deptId].absent++;
    });

    const byDepartment = Object.entries(deptStats).map(([id, stats]) => ({
      departmentId: id,
      departmentName: stats.name,
      userCount: stats.users.size,
      attendanceRate: stats.records > 0 ? Math.round(((stats.records - stats.absent) / stats.records) * 100) : 0,
      lateCount: stats.late,
      earlyLeaveCount: stats.earlyLeave,
      absentCount: stats.absent,
      avgWorkHours: stats.records > 0 ? Math.round((stats.workHours / stats.records) * 10) / 10 : 0,
    }));

    // 按用户统计
    const userStats: Record<string, { name: string; department: string; late: number; earlyLeave: number; absent: number; workHours: number; records: number }> = {};
    records.forEach((r) => {
      if (!userStats[r.userId]) {
        userStats[r.userId] = {
          name: r.user.name,
          department: r.user.department?.name || '未知部门',
          late: 0,
          earlyLeave: 0,
          absent: 0,
          workHours: 0,
          records: 0,
        };
      }
      userStats[r.userId].records++;
      userStats[r.userId].workHours += r.workHours || 0;
      if (r.status === 'LATE') userStats[r.userId].late++;
      if (r.status === 'EARLY_LEAVE') userStats[r.userId].earlyLeave++;
      if (r.status === 'ABSENT') userStats[r.userId].absent++;
    });

    const byUser = Object.entries(userStats).map(([id, stats]) => ({
      userId: id,
      userName: stats.name,
      department: stats.department,
      attendanceDays: stats.records,
      lateCount: stats.late,
      earlyLeaveCount: stats.earlyLeave,
      absentCount: stats.absent,
      workHours: Math.round(stats.workHours * 10) / 10,
      attendanceRate: stats.records > 0 ? Math.round(((stats.records - stats.absent) / stats.records) * 100) : 0,
    }));

    // 每日趋势
    const dailyMap: Record<string, { totalUsers: number; normal: number; late: number; earlyLeave: number; absent: number }> = {};
    records.forEach((r) => {
      const date = r.date.toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { totalUsers: 0, normal: 0, late: 0, earlyLeave: 0, absent: 0 };
      }
      dailyMap[date].totalUsers++;
      if (r.status === 'NORMAL') dailyMap[date].normal++;
      if (r.status === 'LATE') dailyMap[date].late++;
      if (r.status === 'EARLY_LEAVE') dailyMap[date].earlyLeave++;
      if (r.status === 'ABSENT') dailyMap[date].absent++;
    });

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, stats]) => ({
        date,
        totalUsers: stats.totalUsers,
        normalCount: stats.normal,
        lateCount: stats.late,
        earlyLeaveCount: stats.earlyLeave,
        absentCount: stats.absent,
        attendanceRate: stats.totalUsers > 0 ? Math.round(((stats.totalUsers - stats.absent) / stats.totalUsers) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 异常记录
    const abnormalRecords = records
      .filter((r) => ['LATE', 'EARLY_LEAVE', 'ABSENT'].includes(r.status))
      .map((r) => ({
        userId: r.userId,
        userName: r.user.name,
        department: r.user.department?.name || '未知部门',
        date: r.date.toISOString().split('T')[0],
        type: r.status as 'LATE' | 'EARLY_LEAVE' | 'ABSENT',
        details: r.notes || '',
      }));

    // 工时分析
    const workHoursList = records.map((r) => r.workHours || 0).filter((h) => h > 0);
    const avgDailyHours = workHoursList.length > 0
      ? Math.round((workHoursList.reduce((a, b) => a + b, 0) / workHoursList.length) * 10) / 10
      : 0;

    const distribution = [
      { range: '< 6小时', count: workHoursList.filter((h) => h < 6).length },
      { range: '6-8小时', count: workHoursList.filter((h) => h >= 6 && h <= 8).length },
      { range: '8-10小时', count: workHoursList.filter((h) => h > 8 && h <= 10).length },
      { range: '> 10小时', count: workHoursList.filter((h) => h > 10).length },
    ];

    return {
      summary: {
        totalUsers,
        totalWorkDays,
        avgAttendanceRate: attendanceRate,
        totalLateCount: lateCount,
        totalEarlyLeaveCount: earlyLeaveCount,
        totalAbsentCount: absentCount,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        avgWorkHoursPerDay: avgDailyHours,
      },
      byDepartment,
      byUser,
      dailyTrend,
      abnormalRecords,
      workHoursAnalysis: {
        avgDailyHours,
        overtimeDays: workHoursList.filter((h) => h > 8).length,
        overtimeUsers: new Set(records.filter((r) => (r.workHours || 0) > 8).map((r) => r.userId)).size,
        distribution,
      },
    };
  }

  // 个人绩效分析
  async getUserPerformance(userId: string, filters: DateRangeFilter): Promise<UserPerformance> {
    const { startDate, endDate } = filters;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, department: { select: { name: true } } },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 考勤统计
    const attendanceWhere: Record<string, unknown> = { userId };
    if (startDate && endDate) {
      attendanceWhere.date = { gte: startDate, lte: endDate };
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: attendanceWhere,
    });

    const attendanceDays = attendanceRecords.length;
    const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const earlyLeaveCount = attendanceRecords.filter((r) => r.status === 'EARLY_LEAVE').length;
    const workHours = attendanceRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const attendanceRate = attendanceDays > 0
      ? Math.round(((attendanceDays - lateCount) / attendanceDays) * 100)
      : 0;

    // 任务统计
    const taskWhere: Record<string, unknown> = { assigneeId: userId };
    if (startDate && endDate) {
      taskWhere.createdAt = { gte: startDate, lte: endDate };
    }

    const tasks = await prisma.task.findMany({
      where: taskWhere,
    });

    const completedTasks = tasks.filter((t) => t.status === 'DONE');
    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

    // 计算平均完成时间
    let avgCompletionTime = 0;
    if (completedTasks.length > 0) {
      const completionTimes = completedTasks
        .filter((t) => t.completedAt && t.startDate)
        .map((t) => new Date(t.completedAt!).getTime() - new Date(t.startDate!).getTime());
      avgCompletionTime = completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length / (1000 * 60 * 60 * 24))
        : 0;
    }

    // 审批统计
    const [factoryCount, directorCount, managerCount, ceoCount] = await Promise.all([
      prisma.factoryApproval.count({ where: { approverId: userId, action: 'APPROVE' } }),
      prisma.directorApproval.count({ where: { approverId: userId, action: 'APPROVE' } }),
      prisma.managerApproval.count({ where: { approverId: userId, action: 'APPROVE' } }),
      prisma.ceoApproval.count({ where: { approverId: userId, action: 'APPROVE' } }),
    ]);

    const totalProcessed = factoryCount + directorCount + managerCount + ceoCount;

    // 会议统计
    const meetingWhere: Record<string, unknown> = {
      attendees: { contains: userId },
    };
    if (startDate && endDate) {
      meetingWhere.startTime = { gte: startDate, lte: endDate };
    }

    const [organizedMeetings, attendedMeetings] = await Promise.all([
      prisma.meeting.count({ where: { organizerId: userId, ...meetingWhere } }),
      prisma.meeting.count({ where: meetingWhere }),
    ]);

    // 申请统计
    const applicationWhere: Record<string, unknown> = { applicantId: userId };
    if (startDate && endDate) {
      applicationWhere.createdAt = { gte: startDate, lte: endDate };
    }

    const applications = await prisma.application.findMany({
      where: applicationWhere,
    });

    const approvedApps = applications.filter((a) => a.status === 'APPROVED').length;
    const rejectedApps = applications.filter((a) => a.status === 'REJECTED').length;

    // 雷达图数据
    const radarData = [
      { dimension: '出勤率', score: attendanceRate, maxScore: 100 },
      { dimension: '任务完成率', score: completionRate, maxScore: 100 },
      { dimension: '审批处理', score: Math.min(totalProcessed * 10, 100), maxScore: 100 },
      { dimension: '会议参与', score: Math.min(attendedMeetings * 5, 100), maxScore: 100 },
      { dimension: '申请通过率', score: applications.length > 0 ? Math.round((approvedApps / applications.length) * 100) : 0, maxScore: 100 },
    ];

    // 综合评分
    const overallScore = Math.round(radarData.reduce((sum, d) => sum + d.score, 0) / radarData.length);

    return {
      userId,
      userName: user.name,
      department: user.department?.name || '未知部门',
      period: `${startDate?.toISOString().split('T')[0] || ''} - ${endDate?.toISOString().split('T')[0] || ''}`,
      attendance: {
        attendanceRate,
        lateCount,
        earlyLeaveCount,
        workDays: attendanceDays,
        workHours: Math.round(workHours * 10) / 10,
      },
      tasks: {
        totalAssigned: tasks.length,
        completed: completedTasks.length,
        completionRate,
        avgCompletionTime,
      },
      approvals: {
        totalProcessed,
        avgResponseTime: 0, // 需要更复杂的计算
        approvalCount: totalProcessed,
        rejectionCount: 0, // 简化处理
      },
      meetings: {
        organizedCount: organizedMeetings,
        attendedCount: attendedMeetings,
        attendanceRate: attendedMeetings > 0 ? 100 : 0,
      },
      applications: {
        submittedCount: applications.length,
        approvedCount: approvedApps,
        rejectedCount: rejectedApps,
      },
      overallScore,
      radarData,
    };
  }

  // 仪表板汇总数据
  async getDashboardSummary(): Promise<DashboardSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 基础统计
    const [totalUsers, totalApplications, totalEquipment, pendingApprovals] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.application.count(),
      prisma.equipment.count(),
      prisma.application.count({
        where: {
          status: { in: ['PENDING_FACTORY', 'PENDING_DIRECTOR', 'PENDING_MANAGER', 'PENDING_CEO'] },
        },
      }),
    ]);

    // 今日活动
    const [newApplicationsToday, approvedToday, maintenanceCompletedToday, meetingsToday] = await Promise.all([
      prisma.application.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.application.count({ where: { status: 'APPROVED', completedAt: { gte: today, lt: tomorrow } } }),
      prisma.maintenanceRecord.count({
        where: { status: 'COMPLETED', endTime: { gte: today, lt: tomorrow } },
      }),
      prisma.meeting.count({ where: { startTime: { gte: today, lt: tomorrow } } }),
    ]);

    // 申请趋势（最近30天）
    const applications = await prisma.application.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { status: true, createdAt: true, completedAt: true },
    });

    const trendMap: Record<string, { submitted: number; approved: number }> = {};
    applications.forEach((app) => {
      const date = app.createdAt.toISOString().split('T')[0];
      if (!trendMap[date]) {
        trendMap[date] = { submitted: 0, approved: 0 };
      }
      trendMap[date].submitted++;
      if (app.status === 'APPROVED') trendMap[date].approved++;
    });

    const applicationTrend = Object.entries(trendMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 设备状态分布
    const equipmentStatus = await prisma.equipment.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const equipmentStatusResult = equipmentStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // 考勤概览
    const todayAttendance = await prisma.attendanceRecord.count({
      where: { date: { gte: today, lt: tomorrow } },
    });

    const todayLeave = await prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    const attendanceOverview = {
      checkedIn: todayAttendance,
      notCheckedIn: Math.max(0, totalUsers - todayAttendance - todayLeave),
      onLeave: todayLeave,
    };

    // 部门工作量
    const deptWorkload = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        name: true,
        users: { select: { id: true } },
      },
    });

    const departmentWorkload = [];
    for (const dept of deptWorkload) {
      const userIds = dept.users.map((u) => u.id);
      const [pendingTasks, pendingApprovalsInDept] = await Promise.all([
        prisma.task.count({
          where: { assigneeId: { in: userIds }, status: { in: ['TODO', 'IN_PROGRESS'] } },
        }),
        prisma.application.count({
          where: { applicantId: { in: userIds }, status: { in: ['PENDING_FACTORY', 'PENDING_DIRECTOR', 'PENDING_MANAGER', 'PENDING_CEO'] } },
        }),
      ]);

      departmentWorkload.push({
        department: dept.name,
        pendingTasks,
        pendingApprovals: pendingApprovalsInDept,
      });
    }

    // 告警信息
    const alerts = [];

    // 检查逾期保养
    const overdueMaintenance = await prisma.maintenancePlan.count({
      where: { status: 'OVERDUE' },
    });
    if (overdueMaintenance > 0) {
      alerts.push({ type: 'error' as const, message: '有设备保养计划已逾期', count: overdueMaintenance });
    }

    // 检查库存不足配件
    const lowStockParts = await prisma.part.count({
      where: { status: 'LOW' },
    });
    if (lowStockParts > 0) {
      alerts.push({ type: 'warning' as const, message: '有配件库存不足', count: lowStockParts });
    }

    // 检查今日会议
    if (meetingsToday > 0) {
      alerts.push({ type: 'info' as const, message: '今日有会议安排', count: meetingsToday });
    }

    return {
      overview: {
        totalUsers,
        totalApplications,
        totalEquipment,
        pendingApprovals,
      },
      recentActivity: {
        newApplicationsToday,
        approvedToday,
        maintenanceCompletedToday,
        meetingsToday,
      },
      charts: {
        applicationTrend,
        equipmentStatus: equipmentStatusResult,
        attendanceOverview,
        departmentWorkload: departmentWorkload.slice(0, 10),
      },
      alerts,
    };
  }

  // 生成自定义报表
  async generateCustomReport(config: CustomReportConfig) {
    const { type, filters, dimensions, metrics, page = 1, pageSize = 50 } = config;

    switch (type) {
      case 'approval':
        return this.generateApprovalReport(filters, dimensions, metrics, page, pageSize);
      case 'equipment':
        return this.generateEquipmentReport(filters, dimensions, metrics, page, pageSize);
      case 'attendance':
        return this.generateAttendanceReport(filters, dimensions, metrics, page, pageSize);
      case 'performance':
        return this.generatePerformanceReport(filters, dimensions, metrics, page, pageSize);
      default:
        throw new Error('不支持的报表类型');
    }
  }

  private async generateApprovalReport(
    filters: Record<string, unknown>,
    _dimensions: string[],
    _metrics: string[],
    page: number,
    pageSize: number
  ) {
    const skip = (page - 1) * pageSize;

    // P0修复: 添加默认时间范围限制(最近一年)，防止全表扫描
    const enhancedFilters = this.addDefaultTimeRange(filters, 'createdAt');

    const data = await prisma.application.findMany({
      where: enhancedFilters as Record<string, unknown>,
      include: {
        applicant: { select: { name: true, department: { select: { name: true } } } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.application.count({ where: enhancedFilters as Record<string, unknown> });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async generateEquipmentReport(
    filters: Record<string, unknown>,
    _dimensions: string[],
    _metrics: string[],
    page: number,
    pageSize: number
  ) {
    const skip = (page - 1) * pageSize;

    // P0修复: 添加默认时间范围限制，防止全表扫描
    const enhancedFilters = this.addDefaultTimeRange(filters, 'createdAt');

    const data = await prisma.equipment.findMany({
      where: enhancedFilters as Record<string, unknown>,
      include: {
        maintenanceRecords: { take: 100, orderBy: { createdAt: 'desc' } }, // 限制关联记录数量
        maintenancePlans: { take: 50, orderBy: { createdAt: 'desc' } },
      },
      skip,
      take: pageSize,
    });

    const total = await prisma.equipment.count({ where: enhancedFilters as Record<string, unknown> });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async generateAttendanceReport(
    filters: Record<string, unknown>,
    _dimensions: string[],
    _metrics: string[],
    page: number,
    pageSize: number
  ) {
    const skip = (page - 1) * pageSize;

    // P0修复: 添加默认时间范围限制，防止全表扫描
    const enhancedFilters = this.addDefaultTimeRange(filters, 'date');

    const data = await prisma.attendanceRecord.findMany({
      where: enhancedFilters as Record<string, unknown>,
      include: {
        user: { select: { name: true, department: { select: { name: true } } } },
      },
      skip,
      take: pageSize,
      orderBy: { date: 'desc' },
    });

    const total = await prisma.attendanceRecord.count({ where: enhancedFilters as Record<string, unknown> });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async generatePerformanceReport(
    filters: Record<string, unknown>,
    _dimensions: string[],
    _metrics: string[],
    page: number,
    pageSize: number
  ) {
    const skip = (page - 1) * pageSize;

    // P0修复: 添加默认时间范围限制
    const enhancedFilters = this.addDefaultTimeRange(filters, 'createdAt');

    const users = await prisma.user.findMany({
      where: enhancedFilters as Record<string, unknown>,
      select: { id: true, name: true, department: { select: { name: true } } },
      skip,
      take: pageSize,
    });

    const total = await prisma.user.count({ where: enhancedFilters as Record<string, unknown> });

    // P0修复: 批量获取绩效数据，避免N+1查询
    const userIds = users.map(u => u.id);

    // 批量查询所有用户的绩效相关数据
    const [
      applicationsData,
      approvalsData,
      tasksData,
      meetingsOrganized,
      meetingsAttended,
      attendanceData,
    ] = await Promise.all([
      // 用户提交的申请统计
      prisma.application.groupBy({
        by: ['applicantId', 'status'],
        where: { applicantId: { in: userIds } },
        _count: { id: true },
      }),
      // 用户审批的申请统计
      prisma.factoryApproval.groupBy({
        by: ['approverId', 'action'],
        where: { approverId: { in: userIds } },
        _count: { id: true },
      }),
      // 用户任务统计
      prisma.task.groupBy({
        by: ['assigneeId', 'status'],
        where: { assigneeId: { in: userIds } },
        _count: { id: true },
      }),
      // 组织的会议数
      prisma.meeting.groupBy({
        by: ['organizerId'],
        where: { organizerId: { in: userIds } },
        _count: { id: true },
      }),
      // 参加的会议数 (通过MeetingAttendee表)
      prisma.meetingAttendee.groupBy({
        by: ['userId', 'status'],
        where: { userId: { in: userIds } },
        _count: { id: true },
      }),
      // 考勤统计
      prisma.attendanceRecord.groupBy({
        by: ['userId', 'status'],
        where: { userId: { in: userIds } },
        _count: { id: true },
      }),
    ]);

    // 构建用户绩效数据映射
    const performanceMap = new Map();
    for (const user of users) {
      performanceMap.set(user.id, {
        ...user,
        applications: { submitted: 0, approved: 0, rejected: 0 },
        approvals: { processed: 0, approved: 0, rejected: 0 },
        tasks: { total: 0, completed: 0 },
        meetings: { organized: 0, attended: 0 },
        attendance: { present: 0, absent: 0, late: 0 },
      });
    }

    // 聚合申请数据
    for (const app of applicationsData) {
      const userPerf = performanceMap.get(app.applicantId);
      if (userPerf) {
        userPerf.applications.submitted += app._count.id;
        if (app.status === 'APPROVED') userPerf.applications.approved += app._count.id;
        if (app.status === 'REJECTED') userPerf.applications.rejected += app._count.id;
      }
    }

    // 聚合审批数据
    for (const app of approvalsData) {
      const userPerf = performanceMap.get(app.approverId);
      if (userPerf) {
        userPerf.approvals.processed += app._count.id;
        if (app.action === 'APPROVE') userPerf.approvals.approved += app._count.id;
        if (app.action === 'REJECT') userPerf.approvals.rejected += app._count.id;
      }
    }

    // 聚合任务数据
    for (const task of tasksData) {
      const userPerf = performanceMap.get(task.assigneeId);
      if (userPerf) {
        userPerf.tasks.total += task._count.id;
        if (task.status === 'DONE') userPerf.tasks.completed += task._count.id;
      }
    }

    // 聚合会议数据
    for (const m of meetingsOrganized) {
      const userPerf = performanceMap.get(m.organizerId);
      if (userPerf) userPerf.meetings.organized += m._count.id;
    }

    for (const m of meetingsAttended) {
      const userPerf = performanceMap.get(m.userId);
      if (userPerf && m.status === 'ACCEPTED') userPerf.meetings.attended += m._count.id;
    }

    // 聚合考勤数据
    for (const a of attendanceData) {
      const userPerf = performanceMap.get(a.userId);
      if (userPerf) {
        if (a.status === 'NORMAL') userPerf.attendance.present += a._count.id;
        if (a.status === 'ABSENT') userPerf.attendance.absent += a._count.id;
        if (a.status === 'LATE') userPerf.attendance.late += a._count.id;
      }
    }

    const performanceData = Array.from(performanceMap.values());

    return {
      data: performanceData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const reportService = new ReportService();
