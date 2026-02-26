import apiClient from '@/lib/api';
import { UserRole, Application } from '@/types';
import { User } from '@/types';

// 审批记录类型
export interface UserApproval {
  id: string;
  action: 'APPROVE' | 'REJECT';
  comment: string | null;
  createdAt: string;
  level: 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO';
  application: Application;
}

// 用户统计数据类型
export interface UserStats {
  applicationCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalCount: number;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  employeeId: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  departmentId?: string;
  isActive?: boolean;
}

export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  departmentId?: string;
  search?: string;
  isActive?: boolean;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// 后端 API 响应格式
interface BackendPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BackendUserResponse {
  success: boolean;
  data: User[];
  meta?: {
    pagination: BackendPagination;
  };
}

interface BackendSingleUserResponse {
  success: boolean;
  data: User;
}

interface BackendMessageResponse {
  success: boolean;
  message?: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    items: User[];
    pagination: BackendPagination;
  };
}

interface ImportError {
  index: number;
  field: string;
  message: string;
}

interface ImportSummary {
  total: number;
  success: number;
  failed: number;
}

export interface ImportResult {
  success: boolean;
  data: {
    imported: User[];
    summary: ImportSummary;
    errors: ImportError[];
  };
}

// 类型守卫函数
function isBackendUserResponse(value: unknown): value is BackendUserResponse {
  if (typeof value !== 'object' || value === null) return false;
  const resp = value as Record<string, unknown>;
  return (
    typeof resp.success === 'boolean' &&
    Array.isArray(resp.data) &&
    (resp.meta === undefined || typeof resp.meta === 'object')
  );
}

function isBackendSingleUserResponse(value: unknown): value is BackendSingleUserResponse {
  if (typeof value !== 'object' || value === null) return false;
  const resp = value as Record<string, unknown>;
  return (
    typeof resp.success === 'boolean' &&
    typeof resp.data === 'object' &&
    resp.data !== null
  );
}

function isBackendMessageResponse(value: unknown): value is BackendMessageResponse {
  if (typeof value !== 'object' || value === null) return false;
  const resp = value as Record<string, unknown>;
  return (
    typeof resp.success === 'boolean' &&
    (resp.message === undefined || typeof resp.message === 'string')
  );
}

function isBackendUserArrayResponse(value: unknown): value is { success: boolean; data: User[] } {
  if (typeof value !== 'object' || value === null) return false;
  const resp = value as Record<string, unknown>;
  return (
    typeof resp.success === 'boolean' &&
    Array.isArray(resp.data)
  );
}

function isImportResult(value: unknown): value is ImportResult {
  if (typeof value !== 'object' || value === null) return false;
  const resp = value as Record<string, unknown>;
  if (!resp.success || typeof resp.data !== 'object' || resp.data === null) return false;
  const data = resp.data as Record<string, unknown>;
  return (
    Array.isArray(data.imported) &&
    typeof data.summary === 'object' &&
    Array.isArray(data.errors)
  );
}

// 转换后端响应为前端期望格式
function transformUsersResponse(backendResp: unknown): UsersResponse {
  if (!isBackendUserResponse(backendResp)) {
    throw new Error('Invalid API response format');
  }

  return {
    success: backendResp.success,
    data: {
      items: backendResp.data,
      pagination: backendResp.meta?.pagination || {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      },
    },
  };
}

export const usersApi = {
  getUsers: (params?: UsersQueryParams): Promise<UsersResponse> =>
    apiClient.get('/users', { params }).then(transformUsersResponse),

  getUser: (id: string): Promise<BackendSingleUserResponse> =>
    apiClient.get(`/users/${id}`).then((res: unknown) => {
      if (!isBackendSingleUserResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  createUser: (data: CreateUserRequest): Promise<BackendSingleUserResponse> =>
    apiClient.post('/users', data).then((res: unknown) => {
      if (!isBackendSingleUserResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  updateUser: (id: string, data: UpdateUserRequest): Promise<BackendSingleUserResponse> =>
    apiClient.put(`/users/${id}`, data).then((res: unknown) => {
      if (!isBackendSingleUserResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  deleteUser: (id: string): Promise<BackendMessageResponse> =>
    apiClient.delete(`/users/${id}`).then((res: unknown) => {
      if (!isBackendMessageResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  resetPassword: (id: string, newPassword: string): Promise<BackendMessageResponse> =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }).then((res: unknown) => {
      if (!isBackendMessageResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  importUsers: (users: CreateUserRequest[]): Promise<ImportResult> =>
    apiClient.post('/users/import', { users }).then((res: unknown) => {
      if (!isImportResult(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  getFactoryManagers: (): Promise<{ success: boolean; data: User[] }> =>
    apiClient.get('/users/factory-managers').then((res: unknown) => {
      if (!isBackendUserArrayResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  getManagers: (): Promise<{ success: boolean; data: User[] }> =>
    apiClient.get('/users/managers').then((res: unknown) => {
      if (!isBackendUserArrayResponse(res)) {
        throw new Error('Invalid API response format');
      }
      return res;
    }),

  // 获取用户申请记录
  getUserApplications: (userId: string, page?: number, limit?: number): Promise<PaginatedResponse<Application>> =>
    apiClient.get(`/users/${userId}/applications`, { params: { page, limit } }),

  // 获取用户审批记录
  getUserApprovals: (userId: string, page?: number, limit?: number): Promise<PaginatedResponse<UserApproval>> =>
    apiClient.get(`/users/${userId}/approvals`, { params: { page, limit } }),

  // 获取用户统计数据
  getUserStats: (userId: string): Promise<{ success: boolean; data: UserStats }> =>
    apiClient.get(`/users/${userId}/stats`),
};
