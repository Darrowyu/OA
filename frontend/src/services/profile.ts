import apiClient from '@/lib/api';
import type {
  UserProfile,
  UserPreference,
  UserDevice,
  UpdateBasicInfoRequest,
  ChangePasswordRequest,
  UpdatePreferencesRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorDisableRequest,
  UpdateSignatureRequest,
  PersonalDataExport,
} from '@/types/profile';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const profileApi = {
  // 获取完整个人资料
  getProfile: (): Promise<ApiResponse<UserProfile>> =>
    apiClient.get('/profile').then((res: unknown) => res as ApiResponse<UserProfile>),

  // 更新基础信息
  updateBasicInfo: (data: UpdateBasicInfoRequest): Promise<ApiResponse<UserProfile>> =>
    apiClient.put('/profile/basic', data).then((res: unknown) => res as ApiResponse<UserProfile>),

  // 上传头像
  updateAvatar: (file: File): Promise<ApiResponse<{ avatar: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient
      .post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res: unknown) => res as ApiResponse<{ avatar: string }>);
  },

  // 修改密码
  changePassword: (data: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/profile/change-password', data).then((res: unknown) => res as ApiResponse<{ message: string }>),

  // 获取偏好设置
  getPreferences: (): Promise<ApiResponse<UserPreference>> =>
    apiClient.get('/profile/preferences').then((res: unknown) => res as ApiResponse<UserPreference>),

  // 更新偏好设置
  updatePreferences: (data: UpdatePreferencesRequest): Promise<ApiResponse<UserPreference>> =>
    apiClient.put('/profile/preferences', data).then((res: unknown) => res as ApiResponse<UserPreference>),

  // 获取设备列表
  getDevices: (): Promise<ApiResponse<UserDevice[]>> =>
    apiClient.get('/profile/devices').then((res: unknown) => res as ApiResponse<UserDevice[]>),

  // 踢出指定设备
  revokeDevice: (deviceId: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/profile/devices/${deviceId}`).then((res: unknown) => res as ApiResponse<{ message: string }>),

  // 踢出所有其他设备
  revokeAllDevices: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete('/profile/devices').then((res: unknown) => res as ApiResponse<{ message: string }>),

  // 设置双因素认证
  setupTwoFactor: (): Promise<ApiResponse<TwoFactorSetupResponse>> =>
    apiClient.post('/profile/2fa/setup').then((res: unknown) => res as ApiResponse<TwoFactorSetupResponse>),

  // 验证并启用双因素认证
  verifyTwoFactor: (data: TwoFactorVerifyRequest): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/profile/2fa/verify', data).then((res: unknown) => res as ApiResponse<{ message: string }>),

  // 禁用双因素认证
  disableTwoFactor: (data: TwoFactorDisableRequest): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/profile/2fa/disable', data).then((res: unknown) => res as ApiResponse<{ message: string }>),

  // 获取签名
  getSignature: (): Promise<ApiResponse<{ signature: string | null }>> =>
    apiClient.get('/profile/signature').then((res: unknown) => res as ApiResponse<{ signature: string | null }>),

  // 更新签名
  updateSignature: (data: UpdateSignatureRequest): Promise<ApiResponse<{ message: string }>> =>
    apiClient.put('/profile/signature', data).then((res: unknown) => res as ApiResponse<{ message: string }>),

  // 导出个人数据
  exportPersonalData: (): Promise<PersonalDataExport> =>
    apiClient.get('/profile/export').then((res: unknown) => res as PersonalDataExport),
};
