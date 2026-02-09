import { useState, useEffect, useCallback, useRef } from 'react';

// Debounce选项
interface DebounceOptions {
  delay?: number;
  immediate?: boolean;
}

/**
 * 防抖Hook
 *
 * 用于延迟处理频繁变化的值，常用于搜索输入
 *
 * @example
 * ```tsx
 * const [searchValue, setSearchValue] = useState('');
 * const debouncedSearch = useDebounce(searchValue, 500);
 *
 * // 使用防抖后的值进行搜索
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     performSearch(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖回调Hook
 *
 * 用于防抖函数调用，常用于搜索按钮点击
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => {
 *     searchApi(query);
 *   },
 *   500
 * );
 *
 * // 在输入时调用
 * <Input
 *   onChange={(e) => debouncedSearch(e.target.value)}
 * />
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  const { immediate = false } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // 更新回调引用
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 立即执行选项
      if (immediate && !timeoutRef.current) {
        callbackRef.current(...args);
      }

      // 设置新的定时器
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (!immediate) {
          callbackRef.current(...args);
        }
      }, delay);
    },
    [delay, immediate]
  );
}

/**
 * 防抖状态Hook
 *
 * 结合了useState和防抖功能，常用于搜索输入框
 *
 * @example
 * ```tsx
 * const [searchValue, setSearchValue, debouncedSearchValue] = useDebouncedState('', 500);
 *
 * return (
 *   <div>
 *     <Input
 *       value={searchValue}
 *       onChange={(e) => setSearchValue(e.target.value)}
 *     />
 *     <p>搜索中: {searchValue}</p>
 *     <p>防抖后: {debouncedSearchValue}</p>
 *   </div>
 * );
 * ```
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T | ((prev: T) => T)) => void, T] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, setValue, debouncedValue];
}

/**
 * 防抖异步函数Hook
 *
 * 用于防抖异步操作，支持取消和loading状态
 *
 * @example
 * ```tsx
 * const { execute, loading, cancel } = useDebouncedAsync(
 *   async (query: string) => {
 *     const results = await searchApi(query);
 *     setResults(results);
 *   },
 *   500
 * );
 *
 * <Input onChange={(e) => execute(e.target.value)} />
 * {loading && <Spinner />}
 * ```
 */
export function useDebouncedAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  asyncFunction: T,
  delay: number = 300
) {
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const functionRef = useRef(asyncFunction);

  functionRef.current = asyncFunction;

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<unknown | null> => {
      // 取消之前的请求
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setLoading(true);

      return new Promise((resolve) => {
        timeoutRef.current = setTimeout(async () => {
          abortControllerRef.current = new AbortController();

          try {
            const result = await functionRef.current(...args);
            resolve(result);
          } catch (error) {
            if ((error as Error).name !== 'AbortError') {
              console.error('Debounced async error:', error);
            }
            resolve(null);
          } finally {
            setLoading(false);
          }
        }, delay);
      });
    },
    [delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    execute,
    loading,
    cancel,
  };
}

// 为了保持向后兼容，导出默认的useDebounce
export default useDebounce;

// 导出类型
export type { DebounceOptions };
