import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';
import type { ArchiveStats, ArchiveFile } from '../types';

export function useArchive() {
  const [archiveStats, setArchiveStats] = useState<ArchiveStats>({
    activeCount: 0,
    archivedCount: 0,
    dbSize: '0 MB',
    archivableCount: 0,
  });
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
  const [showArchiveFiles, setShowArchiveFiles] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const isMountedRef = useRef(false);

  const loadArchiveStats = useCallback(async () => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    setArchiveLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ArchiveStats;
        error?: { code: string; message: string };
      }>('/admin/archive-stats');
      if (response.success) {
        setArchiveStats(response.data);
      }
    } catch (err) {
      logger.error('加载归档统计失败', { err });
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const loadArchiveFiles = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ArchiveFile[];
        error?: { code: string; message: string };
      }>('/admin/archive-files');
      if (response.success) {
        setArchiveFiles(response.data);
      }
    } catch (err) {
      logger.error('加载归档文件列表失败', { err });
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const handleArchive = useCallback(async () => {
    if (!confirm('确定要执行数据归档吗？这将把符合条件的已完成申请归档到文件中。')) {
      return;
    }
    setArchiveLoading(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: { archivedCount: number };
        error?: { code: string; message: string };
      }>('/admin/archive');
      if (response.success) {
        toast.success(`归档执行成功，共归档 ${response.data?.archivedCount || 0} 条记录`);
        loadArchiveStats();
      } else {
        toast.error(response.error?.message || '归档执行失败');
      }
    } catch (err) {
      logger.error('归档执行失败', { err });
      toast.error('归档执行失败');
    } finally {
      setArchiveLoading(false);
    }
  }, [loadArchiveStats]);

  const toggleArchiveFiles = useCallback(() => {
    if (!showArchiveFiles && archiveFiles.length === 0) {
      loadArchiveFiles();
    }
    setShowArchiveFiles((prev) => !prev);
  }, [showArchiveFiles, archiveFiles.length, loadArchiveFiles]);

  return {
    archiveStats,
    archiveFiles,
    showArchiveFiles,
    archiveLoading,
    loadArchiveStats,
    loadArchiveFiles,
    handleArchive,
    toggleArchiveFiles,
  };
}
