import apiClient from '@/lib/api';

// 部门类型
export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: Department[];
  manager?: {
    id: string;
    name: string;
  } | null;
}

// 部门树节点
export interface DepartmentTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  children: DepartmentTreeNode[];
}

// 创建部门请求
export interface CreateDepartmentRequest {
  name: string;
  code: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
}

// 更新部门请求
export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
  sortOrder?: number;
}

// 更新部门排序请求
export interface UpdateDepartmentSortRequest {
  items: {
    id: string;
    parentId: string | null;
    sortOrder: number;
  }[];
}

// 部门成员
export interface DepartmentMember {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  position: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 部门API
export const departmentApi = {
  // 获取部门列表
  getDepartments: (): Promise<ApiResponse<Department[]>> =>
    apiClient.get<ApiResponse<Department[]>>('/departments/list'),

  // 获取部门树
  getDepartmentTree: (): Promise<ApiResponse<DepartmentTreeNode[]>> =>
    apiClient.get<ApiResponse<DepartmentTreeNode[]>>('/departments/tree'),

  // 获取部门详情
  getDepartment: (id: string): Promise<ApiResponse<Department>> =>
    apiClient.get<ApiResponse<Department>>(`/departments/${id}`),

  // 获取部门成员
  getDepartmentUsers: (id: string): Promise<ApiResponse<DepartmentMember[]>> =>
    apiClient.get<ApiResponse<DepartmentMember[]>>(`/departments/${id}/users`),

  // 创建部门
  createDepartment: (data: CreateDepartmentRequest): Promise<ApiResponse<Department>> =>
    apiClient.post<ApiResponse<Department>>('/departments', data),

  // 更新部门
  updateDepartment: (id: string, data: UpdateDepartmentRequest): Promise<ApiResponse<Department>> =>
    apiClient.put<ApiResponse<Department>>(`/departments/${id}`, data),

  // 删除部门
  deleteDepartment: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<ApiResponse<void>>(`/departments/${id}`),

  // 批量更新部门排序
  updateDepartmentSort: (data: UpdateDepartmentSortRequest): Promise<ApiResponse<void>> =>
    apiClient.put<ApiResponse<void>>('/departments/sort', data),
};
