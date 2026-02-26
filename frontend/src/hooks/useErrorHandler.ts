import { useState, useCallback } from 'react';

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'success';
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null);

  const showError = useCallback((message: string) => {
    setError({ message, type: 'error' });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setError({ message, type: 'success' });
  }, []);

  const showWarning = useCallback((message: string) => {
    setError({ message, type: 'warning' });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = useCallback((err: unknown, defaultMessage = '操作失败') => {
    let message = defaultMessage;
    if (err && typeof err === 'object') {
      const errorObj = err as Record<string, unknown>;
      const response = errorObj.response as Record<string, unknown> | undefined;
      const data = response?.data as Record<string, unknown> | undefined;
      message = (data?.message as string)
        || (errorObj.message as string)
        || defaultMessage;
    }
    showError(message);
    return message;
  }, [showError]);

  return {
    error,
    showError,
    showSuccess,
    showWarning,
    clearError,
    handleApiError,
  };
}
