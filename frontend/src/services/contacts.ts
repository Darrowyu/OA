import apiClient from '@/lib/api';
import { DepartmentTreeNode } from '@/services/department';
import { UserRole } from '@/types';

// 通讯录用户类型
export interface ContactUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  department: string;
  departmentId?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

// 通讯录查询参数
export interface ContactsQueryParams {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  search?: string; // 搜索姓名、邮箱、电话
}

// 分页响应
export interface ContactsResponse {
  success: boolean;
  data: {
    items: ContactUser[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

// 用户详情响应
export interface ContactDetailResponse {
  success: boolean;
  data: ContactUser & {
    departmentName?: string;
    manager?: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}

// API 错误响应
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * 通讯录 API 服务
 */
export const contactsApi = {
  /**
   * 获取通讯录列表
   */
  getContacts: (params?: ContactsQueryParams): Promise<ContactsResponse> =>
    apiClient
      .get('/users/contacts', { params })
      .then((res: unknown) => res as ContactsResponse),

  /**
   * 获取员工详情
   */
  getContactDetail: (id: string): Promise<ContactDetailResponse> =>
    apiClient
      .get(`/users/${id}/contact`)
      .then((res: unknown) => res as ContactDetailResponse),

  /**
   * 获取部门树形结构
   */
  getDepartmentTree: (): Promise<{ success: boolean; data: DepartmentTreeNode[] }> =>
    apiClient
      .get('/departments/tree')
      .then((res: unknown) => res as { success: boolean; data: DepartmentTreeNode[] }),

  /**
   * 导出通讯录
   */
  exportContacts: (params?: { departmentId?: string; search?: string }): Promise<Blob> =>
    apiClient
      .get('/users/export', {
        params,
        responseType: 'blob',
      })
      .then((res: unknown) => {
        const response = res as { data: Blob };
        return response.data;
      }),
};
