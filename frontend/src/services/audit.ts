import apiClient from '@/lib/api';

// 审计日志类型
export interface AuditLog {
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
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    department: string | null;
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

// 查询参数类型
export interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// API 响应类型
interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  meta: {
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

interface AuditStatsResponse {
  success: boolean;
  data: AuditStats;
}

interface AuditLogDetailResponse {
  success: boolean;
  data: AuditLog;
}

interface AuditActionsResponse {
  success: boolean;
  data: string[];
}

interface EntityTypesResponse {
  success: boolean;
  data: string[];
}

export const auditApi = {
  /**
   * 获取审计日志列表
   */
  getAuditLogs: (params?: AuditLogQueryParams): Promise<AuditLogsResponse> =>
    apiClient.get('/audit/logs', { params }).then((res: unknown) => res as AuditLogsResponse),

  /**
   * 获取审计日志统计
   */
  getAuditStats: (startDate?: string, endDate?: string): Promise<AuditStatsResponse> =>
    apiClient
      .get('/audit/stats', { params: { startDate, endDate } })
      .then((res: unknown) => res as AuditStatsResponse),

  /**
   * 获取单条审计日志详情
   */
  getAuditLogById: (id: string): Promise<AuditLogDetailResponse> =>
    apiClient.get(`/audit/logs/${id}`).then((res: unknown) => res as AuditLogDetailResponse),

  /**
   * 获取操作类型列表
   */
  getAuditActions: (): Promise<AuditActionsResponse> =>
    apiClient.get('/audit/actions').then((res: unknown) => res as AuditActionsResponse),

  /**
   * 获取实体类型列表
   */
  getEntityTypes: (): Promise<EntityTypesResponse> =>
    apiClient.get('/audit/entity-types').then((res: unknown) => res as EntityTypesResponse),
};
