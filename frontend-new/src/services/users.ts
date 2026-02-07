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

export const usersApi = {
  getUsers: (params?: UsersQueryParams) =>
    apiClient.get('/users', { params }),
  getUser: (id: string) => apiClient.get(`/users/${id}`),
  createUser: (data: CreateUserRequest) => apiClient.post('/users', data),
  updateUser: (id: string, data: UpdateUserRequest) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }),
  getFactoryManagers: () => apiClient.get('/users/factory-managers'),
  getManagers: () => apiClient.get('/users/managers'),
};
