import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';

interface EmailSettingsState {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  taskReminder: boolean;
  meetingReminder: boolean;
  approvalReminder: boolean;
}

const defaultSettings: EmailSettingsState = {
  enabled: true,
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  taskReminder: true,
  meetingReminder: true,
  approvalReminder: true,
};

export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettingsState>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: EmailSettingsState;
        error?: { code: string; message: string };
      }>('/settings/email');
      if (response.success) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      logger.error('加载邮件设置失败', { err });
      setError('加载邮件设置失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { code: string; message: string };
      }>('/settings/email', settings);
      if (response.success) {
        toast.success('邮件设置保存成功');
      } else {
        const msg = response.error?.message || '保存失败';
        toast.error(msg);
        setError(msg);
      }
    } catch (err) {
      logger.error('保存邮件设置失败', { err });
      toast.error('保存失败');
      setError('保存邮件设置失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof EmailSettingsState>(
    key: K,
    value: EmailSettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    settings,
    loading,
    error,
    loadSettings,
    saveSettings,
    updateSetting,
  };
}
