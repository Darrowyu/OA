import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  sidebarCollapsed: boolean;
  denseMode: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

const defaultSettings: AppearanceSettings = {
  theme: 'system',
  primaryColor: 'blue',
  sidebarCollapsed: false,
  denseMode: false,
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
};

const themeColors = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'emerald', label: '绿色', class: 'bg-emerald-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'rose', label: '红色', class: 'bg-rose-500' },
];

export function useAppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: AppearanceSettings;
        error?: { message: string };
      }>('/settings/appearance');
      if (response.success) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      setError('加载界面设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { message: string };
      }>('/settings/appearance', settings);
      if (response.success) {
        toast.success('界面设置保存成功');
        applyThemeSettings(settings);
      } else {
        setError(response.error?.message || '保存失败');
      }
    } catch (err) {
      setError('保存界面设置失败');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyThemeSettings = useCallback((s: AppearanceSettings) => {
    if (s.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (s.theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('appearanceSettings', JSON.stringify(s));
  }, []);

  useEffect(() => {
    loadSettings();
    const saved = localStorage.getItem('appearanceSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
        applyThemeSettings({ ...defaultSettings, ...parsed });
      } catch {
        // 忽略解析错误
      }
    }
  }, [loadSettings, applyThemeSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    themeColors,
    loadSettings,
    saveSettings,
    updateSetting,
  };
}
