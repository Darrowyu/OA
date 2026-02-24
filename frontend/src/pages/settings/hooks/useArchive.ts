import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { logger } from '@/lib/logger';
import type { ArchiveStats, ArchiveFile } from '../types';

interface ArchiveApiItem {
  fileName: string;
  archivedAt: string;
  archivedBy: string;
  count: number;
  size: number;
}

interface ArchiveStatsResponse {
  totalFiles: number;
  totalArchived: number;
  archives: ArchiveApiItem[];
}

export function useArchive() {
  const [archives, setArchives] = useState<ArchiveFile[]>([]);
  const [stats, setStats] = useState<ArchiveStats>({
    totalArchives: 0,
    totalSize: 0,
    lastArchiveDate: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArchives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ArchiveStatsResponse;
        error?: { code: string; message: string };
      }>('/admin/archive-stats');
      if (response.success) {
        const { totalArchived, archives: apiArchives } = response.data;

        // 转换API数据为前端格式
        const formattedArchives: ArchiveFile[] = apiArchives.map((item, index) => ({
          id: `${item.fileName}-${index}`,
          name: item.fileName,
          createdAt: new Date(item.archivedAt).toLocaleString('zh-CN'),
          size: item.size,
          startDate: '-',
          endDate: '-',
        }));

        setArchives(formattedArchives);
        setStats({
          totalArchives: totalArchived,
          totalSize: apiArchives.reduce((sum, item) => sum + item.size, 0),
          lastArchiveDate: apiArchives.length > 0 ? apiArchives[0].archivedAt : null,
        });
      }
    } catch (err) {
      logger.error('加载归档统计失败', { err });
      setError('加载归档数据失败，请重试');
      toast.error('加载归档数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const createArchive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: { archivedCount: number };
        error?: { code: string; message: string };
      }>('/admin/archive');
      if (response.success) {
        toast.success(`归档创建成功，共归档 ${response.data?.archivedCount || 0} 条记录`);
        loadArchives();
      } else {
        const msg = response.error?.message || '归档创建失败';
        toast.error(msg);
        setError(msg);
      }
    } catch (err) {
      logger.error('创建归档失败', { err });
      toast.error('归档创建失败');
      setError('归档创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [loadArchives]);

  const deleteArchive = useCallback(async (_id: string) => {
    toast.info('归档删除功能开发中');
  }, []);

  return {
    archives,
    stats,
    loading,
    error,
    loadArchives,
    createArchive,
    deleteArchive,
  };
}
