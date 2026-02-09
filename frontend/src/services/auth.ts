import apiClient from '@/lib/api';
import { User } from '@/types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface LogoutResponse {
  success: boolean;
  message?: string;
}

interface CurrentUserResponse {
  success: boolean;
  data: User;
}

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiClient.post<LoginResponse>('/auth/login', data),
  logout: (): Promise<LogoutResponse> =>
    apiClient.post('/auth/logout'),
  getCurrentUser: (): Promise<CurrentUserResponse> =>
    apiClient.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string): Promise<ChangePasswordResponse> =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),
};
