import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { reportsApi } from '@/services/reports';
import type {
  DateRangeFilter,
  ApprovalStats,
  EquipmentStats,
  AttendanceStats,
  UserPerformance,
} from '@/types/reports';

interface UseApprovalStatsReturn {
  stats: ApprovalStats | null;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

/**
 * 审批统计数据Hook
 */
export function useApprovalStats(filters: DateRangeFilter): UseApprovalStatsReturn {
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getApprovalStats(filters);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取审批统计失败:', error);
      toast.error('获取审批统计失败');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, isLoading, fetchData };
}

interface UseEquipmentStatsReturn {
  stats: EquipmentStats | null;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

/**
 * 设备统计数据Hook
 */
export function useEquipmentStats(): UseEquipmentStatsReturn {
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getEquipmentStats({});
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取设备统计失败:', error);
      toast.error('获取设备统计失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, isLoading, fetchData };
}

interface UseAttendanceStatsReturn {
  stats: AttendanceStats | null;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

/**
 * 考勤统计数据Hook
 */
export function useAttendanceStats(filters: DateRangeFilter): UseAttendanceStatsReturn {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getAttendanceStats(filters);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取考勤统计失败:', error);
      toast.error('获取考勤统计失败');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, isLoading, fetchData };
}

interface UsePerformanceReturn {
  performance: UserPerformance | null;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

/**
 * 个人绩效数据Hook
 */
export function usePerformance(): UsePerformanceReturn {
  const [performance, setPerformance] = useState<UserPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getMyPerformance();
      if (response.success) {
        setPerformance(response.data);
      }
    } catch (error) {
      console.error('获取绩效数据失败:', error);
      toast.error('获取绩效数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { performance, isLoading, fetchData };
}

export default {
  useApprovalStats,
  useEquipmentStats,
  useAttendanceStats,
  usePerformance,
};
