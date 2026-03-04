import apiClient from '@/lib/api';

export interface Factory {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  manager: string | null;
  contactPhone: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFactoryInput {
  name: string;
  code?: string;
  address?: string;
  manager?: string;
  contactPhone?: string;
}

export interface UpdateFactoryInput {
  name?: string;
  code?: string;
  address?: string;
  manager?: string;
  contactPhone?: string;
  status?: 'active' | 'inactive';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const factoryApi = {
  // 获取所有厂区
  getAllFactories: (): Promise<ApiResponse<Factory[]>> =>
    apiClient.get<ApiResponse<Factory[]>>('/equipment/factories'),

  // 获取单个厂区
  getFactoryById: (id: string): Promise<ApiResponse<Factory>> =>
    apiClient.get<ApiResponse<Factory>>(`/equipment/factories/${id}`),

  // 创建厂区
  createFactory: (data: CreateFactoryInput): Promise<ApiResponse<Factory>> =>
    apiClient.post<ApiResponse<Factory>>('/equipment/factories', data),

  // 更新厂区
  updateFactory: (id: string, data: UpdateFactoryInput): Promise<ApiResponse<Factory>> =>
    apiClient.put<ApiResponse<Factory>>(`/equipment/factories/${id}`, data),

  // 删除厂区
  deleteFactory: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<ApiResponse<void>>(`/equipment/factories/${id}`),
};
