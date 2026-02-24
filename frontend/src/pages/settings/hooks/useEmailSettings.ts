import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';
import type { EmailSettings, ReminderInterval } from '../types';

const defaultEmailSettings: EmailSettings = {
  urgent: {
    initialDelay: 2,
    normalInterval: 4,
    mediumInterval: 2,
    urgentInterval: 1,
  },
  medium: {
    initialDelay: 4,
    normalInterval: 8,
    mediumInterval: 4,
    urgentInterval: 2,
  },
  normal: {
    initialDelay: 8,
    normalInterval: 24,
    mediumInterval: 12,
    urgentInterval: 4,
  },
  workdayOnly: true,
  workdays: [1, 2, 3, 4, 5],
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  skipDates: [],
};

export function useEmailSettings() {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [newSkipDate, setNewSkipDate] = useState('');
  const [skipDateRangeStart, setSkipDateRangeStart] = useState('');
  const [skipDateRangeEnd, setSkipDateRangeEnd] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isMountedRef = useRef(false);

  const loadSettings = useCallback(async () => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    setIsLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: EmailSettings;
        error?: { code: string; message: string };
      }>('/settings/reminders');
      if (response.success) {
        setEmailSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      logger.error('加载邮件设置失败', { err });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { code: string; message: string };
      }>('/settings/reminders', emailSettings);
      if (response.success) {
        toast.success('邮件设置保存成功');
      } else {
        toast.error(response.error?.message || '保存邮件设置失败');
      }
    } catch (err) {
      logger.error('保存邮件设置失败', { err });
      toast.error('保存邮件设置失败');
    } finally {
      setIsSaving(false);
    }
  }, [emailSettings]);

  const updateInterval = useCallback(
    (priority: 'urgent' | 'medium' | 'normal', field: keyof ReminderInterval, value: number) => {
      setEmailSettings((prev) => ({
        ...prev,
        [priority]: {
          ...prev[priority],
          [field]: value,
        },
      }));
    },
    []
  );

  const toggleWorkday = useCallback((day: number) => {
    setEmailSettings((prev) => ({
      ...prev,
      workdays: prev.workdays.includes(day)
        ? prev.workdays.filter((d) => d !== day)
        : [...prev.workdays, day].sort(),
    }));
  }, []);

  const addSkipDate = useCallback(() => {
    if (!newSkipDate) return;
    if (emailSettings.skipDates.includes(newSkipDate)) {
      toast.error('该日期已存在');
      return;
    }
    setEmailSettings((prev) => ({
      ...prev,
      skipDates: [...prev.skipDates, newSkipDate].sort(),
    }));
    setNewSkipDate('');
  }, [newSkipDate, emailSettings.skipDates]);

  const addSkipDateRange = useCallback(() => {
    if (!skipDateRangeStart || !skipDateRangeEnd) {
      toast.error('请选择开始和结束日期');
      return;
    }
    if (skipDateRangeStart > skipDateRangeEnd) {
      toast.error('开始日期不能晚于结束日期');
      return;
    }

    const start = new Date(skipDateRangeStart);
    const end = new Date(skipDateRangeEnd);
    const newDates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!emailSettings.skipDates.includes(dateStr)) {
        newDates.push(dateStr);
      }
    }

    setEmailSettings((prev) => ({
      ...prev,
      skipDates: [...prev.skipDates, ...newDates].sort(),
    }));
    setSkipDateRangeStart('');
    setSkipDateRangeEnd('');
  }, [skipDateRangeStart, skipDateRangeEnd, emailSettings.skipDates]);

  const removeSkipDate = useCallback((date: string) => {
    setEmailSettings((prev) => ({
      ...prev,
      skipDates: prev.skipDates.filter((d) => d !== date),
    }));
  }, []);

  const setWorkdayOnly = useCallback((value: boolean) => {
    setEmailSettings((prev) => ({ ...prev, workdayOnly: value }));
  }, []);

  const setWorkHours = useCallback((field: 'workHoursStart' | 'workHoursEnd', value: string) => {
    setEmailSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    emailSettings,
    newSkipDate,
    skipDateRangeStart,
    skipDateRangeEnd,
    isSaving,
    isLoading,
    setNewSkipDate,
    setSkipDateRangeStart,
    setSkipDateRangeEnd,
    loadSettings,
    saveSettings,
    updateInterval,
    toggleWorkday,
    addSkipDate,
    addSkipDateRange,
    removeSkipDate,
    setWorkdayOnly,
    setWorkHours,
  };
}
