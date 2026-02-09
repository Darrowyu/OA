import { useState, useEffect, useCallback, useRef } from 'react';

// Debounce选项
interface DebounceOptions {
  delay?: number;
  immediate?: boolean;
}

/**
 * 防抖Hook - 用于延迟处理频繁变化的值
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖回调Hook - 用于防抖函数调用
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  const { immediate = false } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (immediate && !timeoutRef.current) callbackRef.current(...args);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (!immediate) callbackRef.current(...args);
      }, delay);
    },
    [delay, immediate]
  );
}

export default useDebounce;
export type { DebounceOptions };
