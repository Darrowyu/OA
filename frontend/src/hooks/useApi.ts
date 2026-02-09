import { useState, useCallback, useEffect } from 'react';

export function useApi<T>(
  fetcher: () => Promise<T>
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const [state, setState] = useState({ data: null as T | null, loading: true, error: null as Error | null });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [fetcher]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}
