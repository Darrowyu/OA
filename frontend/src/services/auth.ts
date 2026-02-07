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

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiClient.post<LoginResponse>('/auth/login', data).then((res: unknown) => res as LoginResponse),
  logout: (): Promise<{ success: boolean; message?: string }> =>
    apiClient.post('/auth/logout').then((res: unknown) => res as { success: boolean; message?: string }),
  getCurrentUser: (): Promise<{ success: boolean; data: User }> =>
    apiClient.get('/auth/me').then((res: unknown) => res as { success: boolean; data: User }),
  changePassword: (oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }).then((res: unknown) => res as { success: boolean; message?: string }),
};
