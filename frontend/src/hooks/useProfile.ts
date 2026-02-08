import { useState, useCallback, useEffect } from 'react';
import { profileApi } from '@/services/profile';
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
} from '@/types/profile';

interface UseProfileState {
  profile: UserProfile | null;
  preference: UserPreference | null;
  devices: UserDevice[];
  twoFactorSetup: TwoFactorSetupResponse | null;
  loading: boolean;
  error: string | null;
}

export function useProfile() {
  const [state, setState] = useState<UseProfileState>({
    profile: null,
    preference: null,
    devices: [],
    twoFactorSetup: null,
    loading: false,
    error: null,
  });

  // 加载个人资料
  const loadProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.getProfile();
      if (response.success) {
        setState((prev) => ({
          ...prev,
          profile: response.data,
          preference: response.data.preference || null,
          loading: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '加载失败',
      }));
    }
  }, []);

  // 更新基础信息
  const updateBasicInfo = useCallback(async (data: UpdateBasicInfoRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.updateBasicInfo(data);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          profile: response.data,
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '更新失败',
      }));
      throw err;
    }
  }, []);

  // 上传头像
  const updateAvatar = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.updateAvatar(file);
      if (response.success && state.profile) {
        setState((prev) => ({
          ...prev,
          profile: { ...prev.profile!, avatar: response.data.avatar },
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '上传失败',
      }));
      throw err;
    }
  }, [state.profile]);

  // 修改密码
  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.changePassword(data);
      setState((prev) => ({ ...prev, loading: false }));
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '修改失败',
      }));
      throw err;
    }
  }, []);

  // 加载偏好设置
  const loadPreferences = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.getPreferences();
      if (response.success) {
        setState((prev) => ({
          ...prev,
          preference: response.data,
          loading: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '加载失败',
      }));
    }
  }, []);

  // 更新偏好设置
  const updatePreferences = useCallback(async (data: UpdatePreferencesRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.updatePreferences(data);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          preference: response.data,
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '更新失败',
      }));
      throw err;
    }
  }, []);

  // 加载设备列表
  const loadDevices = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.getDevices();
      if (response.success) {
        setState((prev) => ({
          ...prev,
          devices: response.data,
          loading: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '加载失败',
      }));
    }
  }, []);

  // 踢出设备
  const revokeDevice = useCallback(async (deviceId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.revokeDevice(deviceId);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          devices: prev.devices.filter((d) => d.deviceId !== deviceId),
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '操作失败',
      }));
      throw err;
    }
  }, []);

  // 踢出所有其他设备
  const revokeAllDevices = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.revokeAllDevices();
      if (response.success) {
        // 只保留当前设备
        setState((prev) => ({
          ...prev,
          devices: prev.devices.filter((d) => d.isCurrent),
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '操作失败',
      }));
      throw err;
    }
  }, []);

  // 设置 2FA
  const setupTwoFactor = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.setupTwoFactor();
      if (response.success) {
        setState((prev) => ({
          ...prev,
          twoFactorSetup: response.data,
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '设置失败',
      }));
      throw err;
    }
  }, []);

  // 验证并启用 2FA
  const verifyTwoFactor = useCallback(async (data: TwoFactorVerifyRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.verifyTwoFactor(data);
      if (response.success && state.preference) {
        setState((prev) => ({
          ...prev,
          preference: { ...prev.preference!, twoFactorEnabled: true },
          twoFactorSetup: null,
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '验证失败',
      }));
      throw err;
    }
  }, [state.preference]);

  // 禁用 2FA
  const disableTwoFactor = useCallback(async (data: TwoFactorDisableRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.disableTwoFactor(data);
      if (response.success && state.preference) {
        setState((prev) => ({
          ...prev,
          preference: { ...prev.preference!, twoFactorEnabled: false },
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '禁用失败',
      }));
      throw err;
    }
  }, [state.preference]);

  // 更新签名
  const updateSignature = useCallback(async (data: UpdateSignatureRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await profileApi.updateSignature(data);
      if (response.success && state.profile) {
        setState((prev) => ({
          ...prev,
          profile: { ...prev.profile!, signature: data.signature },
          loading: false,
        }));
      }
      return response;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '更新失败',
      }));
      throw err;
    }
  }, [state.profile]);

  // 清除错误
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 初始加载
  useEffect(() => {
    loadProfile();
    loadPreferences();
    loadDevices();
  }, [loadProfile, loadPreferences, loadDevices]);

  return {
    ...state,
    loadProfile,
    updateBasicInfo,
    updateAvatar,
    changePassword,
    loadPreferences,
    updatePreferences,
    loadDevices,
    revokeDevice,
    revokeAllDevices,
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    updateSignature,
    clearError,
  };
}
