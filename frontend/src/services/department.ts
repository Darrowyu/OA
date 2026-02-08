import apiClient from '@/lib/api';

// 部门数据类型
export interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  managerId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  parent?: {
    id: string;
    name: string;
    code: string;
  } | null;
  children?: Department[];
  userCount?: number;
}

// 部门树节点
export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

// 创建部门请求
export interface CreateDepartmentRequest {
  name: string;
  code: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 更新部门请求
export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

// 部门成员
export interface DepartmentUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  position?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 部门 API 服务
 */
export const departmentApi = {
  /**
   * 获取部门树形结构
   */
  getDepartmentTree: (): Promise<ApiResponse<DepartmentTreeNode[]>> =>
    apiClient
      .get('/departments/tree')
      .then((res: unknown) => res as ApiResponse<DepartmentTreeNode[]>),

  /**
   * 获取所有部门列表（扁平结构）
   */
  getDepartmentList: (): Promise<ApiResponse<Department[]>> =>
    apiClient
      .get('/departments/list')
      .then((res: unknown) => res as ApiResponse<Department[]>),

  /**
   * 获取部门详情
   */
  getDepartment: (id: string): Promise<ApiResponse<Department>> =>
    apiClient
      .get(`/departments/${id}`)
      .then((res: unknown) => res as ApiResponse<Department>),

  /**
   * 创建部门
   */
  createDepartment: (
    data: CreateDepartmentRequest
  ): Promise<ApiResponse<Department>> =>
    apiClient
      .post('/departments', data)
      .then((res: unknown) => res as ApiResponse<Department>),

  /**
   * 更新部门
   */
  updateDepartment: (
    id: string,
    data: UpdateDepartmentRequest
  ): Promise<ApiResponse<Department>> =>
    apiClient
      .put(`/departments/${id}`, data)
      .then((res: unknown) => res as ApiResponse<Department>),

  /**
   * 删除部门
   */
  deleteDepartment: (
    id: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> =>
    apiClient
      .delete(`/departments/${id}`)
      .then((res: unknown) => res as ApiResponse<{ success: boolean; message: string }>),

  /**
   * 获取部门成员
   */
  getDepartmentUsers: (id: string): Promise<ApiResponse<DepartmentUser[]>> =>
    apiClient
      .get(`/departments/${id}/users`)
      .then((res: unknown) => res as ApiResponse<DepartmentUser[]>),

  /**
   * 移动部门
   */
  moveDepartment: (
    id: string,
    parentId: string | null
  ): Promise<ApiResponse<Department>> =>
    apiClient
      .post(`/departments/${id}/move`, { parentId })
      .then((res: unknown) => res as ApiResponse<Department>),
};
