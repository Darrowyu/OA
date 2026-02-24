import { useState, useCallback } from 'react';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';
import type { SystemInfo } from '../types';

export function useSystemInfo() {
  const [info, setInfo] = useState<SystemInfo>({
    version: '',
    uptime: '',
    nodeVersion: '',
    database: {
      type: 'PostgreSQL',
      version: '',
      size: '',
    },
    memory: {
      used: '',
      total: '',
      usedBytes: 0,
      totalBytes: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: SystemInfo;
        error?: { code: string; message: string };
      }>('/settings/system-info');
      if (response.success) {
        setInfo(response.data);
      }
    } catch (err) {
      logger.error('加载系统信息失败', { err });
      setError('加载系统信息失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    info,
    loading,
    error,
    loadInfo,
  };
}
