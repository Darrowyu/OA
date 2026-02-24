import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';
import type { BackupInfo } from '../types';

export function useBackup() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAutoBackup = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { enabled: boolean };
        error?: { code: string; message: string };
      }>('/settings/auto-backup');
      if (response.success) {
        setAutoBackup(response.data.enabled);
      }
    } catch (err) {
      logger.error('加载自动备份设置失败', { err });
    }
  }, []);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [backupsRes] = await Promise.all([
        apiClient.get<{
          success: boolean;
          data: BackupInfo[];
          error?: { code: string; message: string };
        }>('/settings/backups'),
        loadAutoBackup(),
      ]);
      if (backupsRes.success) {
        setBackups(backupsRes.data);
      }
    } catch (err) {
      logger.error('加载备份列表失败', { err });
      setError('加载备份列表失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [loadAutoBackup]);

  const createBackup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: BackupInfo;
        error?: { code: string; message: string };
      }>('/settings/backups');
      if (response.success) {
        toast.success('备份创建成功');
        loadBackups();
      } else {
        toast.error(response.error?.message || '备份创建失败');
        setError(response.error?.message || '备份创建失败');
      }
    } catch (err) {
      logger.error('创建备份失败', { err });
      toast.error('备份创建失败');
      setError('备份创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [loadBackups]);

  const restoreBackup = useCallback(async (id: string) => {
    if (!confirm('确定要从此备份恢复吗？当前数据将被覆盖。')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { code: string; message: string };
      }>(`/settings/backups/${id}/restore`);
      if (response.success) {
        toast.success('恢复成功，请重新登录');
      } else {
        toast.error(response.error?.message || '恢复失败');
        setError(response.error?.message || '恢复失败');
      }
    } catch (err) {
      logger.error('恢复备份失败', { err });
      toast.error('恢复失败');
      setError('恢复备份失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadBackup = useCallback((id: string) => {
    window.open(`/api/settings/backups/${id}/download`, '_blank');
  }, []);

  const saveAutoBackup = useCallback(async (enabled: boolean) => {
    try {
      await apiClient.post('/settings/auto-backup', { enabled });
      setAutoBackup(enabled);
      toast.success('自动备份设置已保存');
    } catch (err) {
      logger.error('保存自动备份设置失败', { err });
      toast.error('保存失败');
    }
  }, []);

  return {
    backups,
    loading,
    autoBackup,
    error,
    loadBackups,
    createBackup,
    restoreBackup,
    downloadBackup,
    saveAutoBackup,
  };
}
