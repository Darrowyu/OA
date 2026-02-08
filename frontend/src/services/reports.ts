import apiClient from '@/lib/api';
import {
  ApprovalStats,
  EquipmentStats,
  AttendanceStats,
  UserPerformance,
  DashboardSummary,
  ApprovalStatsFilter,
  EquipmentStatsFilter,
  AttendanceStatsFilter,
  CustomReportConfig,
  PaginatedReportData,
} from '@/types/reports';

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 报表API服务
export const reportsApi = {
  // 获取仪表板汇总数据
  getDashboardSummary: (): Promise<ApiResponse<DashboardSummary>> =>
    apiClient.get<ApiResponse<DashboardSummary>>('/reports/dashboard/summary'),

  // 获取审批统计
  getApprovalStats: (filters?: ApprovalStatsFilter): Promise<ApiResponse<ApprovalStats>> =>
    apiClient.get<ApiResponse<ApprovalStats>>('/reports/approvals', { params: filters }),

  // 获取设备统计
  getEquipmentStats: (filters?: EquipmentStatsFilter): Promise<ApiResponse<EquipmentStats>> =>
    apiClient.get<ApiResponse<EquipmentStats>>('/reports/equipment', { params: filters }),

  // 获取考勤统计
  getAttendanceStats: (filters?: AttendanceStatsFilter): Promise<ApiResponse<AttendanceStats>> =>
    apiClient.get<ApiResponse<AttendanceStats>>('/reports/attendance', { params: filters }),

  // 获取个人绩效（当前用户）
  getMyPerformance: (filters?: { startDate?: string; endDate?: string }): Promise<ApiResponse<UserPerformance>> =>
    apiClient.get<ApiResponse<UserPerformance>>('/reports/performance/me', { params: filters }),

  // 获取指定用户绩效
  getUserPerformance: (userId: string, filters?: { startDate?: string; endDate?: string }): Promise<ApiResponse<UserPerformance>> =>
    apiClient.get<ApiResponse<UserPerformance>>(`/reports/performance/${userId}`, { params: filters }),

  // 生成自定义报表
  generateCustomReport: <T = unknown>(config: CustomReportConfig): Promise<ApiResponse<PaginatedReportData<T>>> =>
    apiClient.post<ApiResponse<PaginatedReportData<T>>>('/reports/custom', config),

  // 导出报表
  exportReport: (params: { type: string; filters?: Record<string, unknown>; format: 'excel' | 'pdf' | 'csv' }): Promise<ApiResponse<{
    type: string;
    format: string;
    exportedAt: string;
    data: unknown;
  }>> =>
    apiClient.post('/reports/export', params),
};
