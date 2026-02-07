import apiClient from '@/lib/api';
import { UserRole } from '@/types';

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  employeeId: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
}

export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  department?: string;
  search?: string;
}

import { User } from '@/types';

export interface UsersResponse {
  success: boolean;
  data: {
    items: User[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

export const usersApi = {
  getUsers: (params?: UsersQueryParams): Promise<UsersResponse> =>
    apiClient.get('/users', { params }).then((res: unknown) => res as UsersResponse),
  getUser: (id: string): Promise<{ success: boolean; data: User }> =>
    apiClient.get(`/users/${id}`).then((res: unknown) => res as { success: boolean; data: User }),
  createUser: (data: CreateUserRequest): Promise<{ success: boolean; data: User }> =>
    apiClient.post('/users', data).then((res: unknown) => res as { success: boolean; data: User }),
  updateUser: (id: string, data: UpdateUserRequest): Promise<{ success: boolean; data: User }> =>
    apiClient.put(`/users/${id}`, data).then((res: unknown) => res as { success: boolean; data: User }),
  deleteUser: (id: string): Promise<{ success: boolean; message?: string }> =>
    apiClient.delete(`/users/${id}`).then((res: unknown) => res as { success: boolean; message?: string }),
  resetPassword: (id: string, newPassword: string): Promise<{ success: boolean; message?: string }> =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }).then((res: unknown) => res as { success: boolean; message?: string }),
  getFactoryManagers: (): Promise<{ success: boolean; data: User[] }> =>
    apiClient.get('/users/factory-managers').then((res: unknown) => res as { success: boolean; data: User[] }),
  getManagers: (): Promise<{ success: boolean; data: User[] }> =>
    apiClient.get('/users/managers').then((res: unknown) => res as { success: boolean; data: User[] }),
};
