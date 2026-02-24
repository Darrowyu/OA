import { useState, useCallback } from 'react';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';
import type { SystemLog } from '../types';

interface LogFilters {
  level: string;
  startDate: string;
  endDate: string;
}

export function useSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    level: 'all',
    startDate: '',
    endDate: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.level !== 'all') params.append('level', filters.level);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get<{
        success: boolean;
        data: SystemLog[];
        error?: { code: string; message: string };
      }>(`/settings/logs?${params.toString()}`);

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      logger.error('加载系统日志失败', { err });
      setError('加载系统日志失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const exportLogs = useCallback(async () => {
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: { downloadUrl: string };
        error?: { code: string; message: string };
      }>('/settings/logs/export', {
        level: filters.level,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      if (response.success && response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      } else {
        setError(response.error?.message || '导出日志失败');
      }
    } catch (err) {
      logger.error('导出日志失败', { err });
      setError('导出日志失败，请重试');
    }
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({
      level: 'all',
      startDate: '',
      endDate: '',
    });
    setError(null);
  }, []);

  return {
    logs,
    loading,
    error,
    filters,
    setFilters,
    clearFilters,
    loadLogs,
    exportLogs,
  };
}
