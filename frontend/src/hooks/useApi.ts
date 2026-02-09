import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// API请求状态
type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// useApi返回值
interface UseApiReturn<T, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
  status: ApiStatus;
  execute: (...args: unknown[]) => Promise<T | null>;
  refresh: () => Promise<T | null>;
  reset: () => void;
}

// useApi选项
interface UseApiOptions {
  immediate?: boolean;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * 统一API请求状态管理Hook
 *
 * 用于管理API请求的加载状态、错误处理和数据缓存
 *
 * @example
 * ```tsx
 * // 基础用法
 * const { data, loading, error, execute } = useApi(fetchUser);
 *
 * // 立即执行
 * const { data, loading } = useApi(() => fetchUser(userId), { immediate: true });
 *
 * // 带错误提示
 * const { execute } = useApi(createUser, {
 *   showSuccessToast: true,
 *   successMessage: '创建成功',
 * });
 * ```
 */
export function useApi<T, E = Error>(
  fetcher: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T, E> {
  const {
    immediate = false,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    errorMessage,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<E | null>(null);
  const [status, setStatus] = useState<ApiStatus>('idle');

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // 执行请求
  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setLoading(true);
      setError(null);
      setStatus('loading');

      try {
        const result = await fetcherRef.current(...args);
        setData(result);
        setStatus('success');

        if (showSuccessToast) {
          toast.success(successMessage || '操作成功');
        }

        return result;
      } catch (err) {
        const apiError = err as E;
        setError(apiError);
        setStatus('error');

        if (showErrorToast) {
          const message =
            errorMessage ||
            (apiError instanceof Error ? apiError.message : '操作失败，请重试');
          toast.error(message);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [showErrorToast, showSuccessToast, successMessage, errorMessage]
  );

  // 刷新数据（重新执行上一次的请求）
  const refresh = useCallback(async (): Promise<T | null> => {
    return execute();
  }, [execute]);

  // 重置状态
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setStatus('idle');
  }, []);

  // 立即执行
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    status,
    execute,
    refresh,
    reset,
  };
}

/**
 * 带缓存的API请求Hook
 *
 * 会自动缓存请求结果，相同的请求参数会返回缓存数据
 */
export function useCachedApi<T>(
  fetcher: (...args: unknown[]) => Promise<T>,
  key: string,
  options: UseApiOptions & { ttl?: number } = {}
) {
  const { ttl = 5 * 60 * 1000, ...apiOptions } = options; // 默认5分钟缓存
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const cachedFetcher = useCallback(
    async (...args: unknown[]): Promise<T> => {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cached = cacheRef.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }

      const result = await fetcher(...args);
      cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    },
    [fetcher, key, ttl]
  );

  const api = useApi(cachedFetcher, apiOptions);

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { ...api, clearCache };
}

/**
 * 轮询API请求Hook
 *
 * 会定期自动刷新数据
 */
export function usePollingApi<T>(
  fetcher: () => Promise<T>,
  interval: number = 5000,
  options: UseApiOptions = {}
) {
  const [isPolling, setIsPolling] = useState(true);
  const api = useApi(fetcher, options);

  useEffect(() => {
    if (!isPolling) return;

    // 立即执行一次
    api.execute();

    // 设置轮询
    const timer = setInterval(() => {
      api.execute();
    }, interval);

    return () => clearInterval(timer);
  }, [isPolling, interval, api]);

  const startPolling = useCallback(() => setIsPolling(true), []);
  const stopPolling = useCallback(() => setIsPolling(false), []);

  return {
    ...api,
    isPolling,
    startPolling,
    stopPolling,
  };
}

// 导出类型
export type { ApiStatus, UseApiReturn, UseApiOptions };
