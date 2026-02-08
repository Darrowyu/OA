// ============================================
// 报表模块类型定义
// ============================================

// 日期范围筛选
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// 审批统计筛选
export interface ApprovalStatsFilter extends DateRangeFilter {
  departmentId?: string;
  applicantId?: string;
  status?: string;
}

// 设备统计筛选
export interface EquipmentStatsFilter {
  category?: string;
  location?: string;
  status?: string;
  departmentId?: string;
}

// 考勤统计筛选
export interface AttendanceStatsFilter extends DateRangeFilter {
  departmentId?: string;
  userId?: string;
}

// 绩效筛选
export interface PerformanceFilter extends DateRangeFilter {
  userId: string;
}

// 自定义报表配置
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

// 审批统计数据
export interface ApprovalStats {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  draftCount: number;
  approvalRate: number;
  rejectionRate: number;
  avgProcessTime: number;
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

// 设备统计数据
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

// 考勤统计数据
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

// 个人绩效
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

// 仪表板汇总
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

// 分页响应
export interface PaginatedReportData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 报表类型枚举
export enum ReportType {
  APPROVAL = 'approval',
  EQUIPMENT = 'equipment',
  ATTENDANCE = 'attendance',
  PERFORMANCE = 'performance',
}

// 图表类型枚举
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  RADAR = 'radar',
  AREA = 'area',
}

// 报表模板
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  chartType: ChartType;
  dimensions: string[];
  metrics: string[];
  defaultFilters: Record<string, unknown>;
}

// 仪表板小部件配置
export interface DashboardWidgetConfig {
  id: string;
  type: 'stat' | 'chart' | 'table' | 'list';
  title: string;
  reportType?: ReportType;
  chartType?: ChartType;
  dataSource: string;
  refreshInterval?: number;
  size: 'small' | 'medium' | 'large';
}
