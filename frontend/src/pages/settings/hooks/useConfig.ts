import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { configApi } from '@/services/config.api';
import { logger } from '@/lib/logger';
import {
  ConfigCategory,
  SystemConfig,
  ConfigQueryParams,
  ConfigHistoryQueryParams,
  UseConfigReturn,
  UseConfigValueReturn,
  UseConfigValuesReturn,
} from '@/types/config';

// 解析配置值
const parseConfigValue = (
  value: string,
  valueType: string
): string | number | boolean | unknown[] | Record<string, unknown> => {
  try {
    switch (valueType) {
      case 'STRING':
        return value;
      case 'NUMBER':
        return Number(value);
      case 'BOOLEAN':
        return value === 'true' || value === '1';
      case 'JSON':
      case 'ARRAY':
        return JSON.parse(value);
      default:
        return value;
    }
  } catch {
    return value;
  }
};

// 序列化配置值
const serializeConfigValue = (
  value: string | number | boolean | unknown[] | Record<string, unknown>
): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

/**
 * 通用配置管理 Hook
 * 用于管理所有配置分类和配置项
 */
export function useConfig(): UseConfigReturn {
  const [categories, setCategories] = useState<ConfigCategory[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory] = useState<string | null>(null);

  // 加载配置分类
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await configApi.getCategories();
      if (response.success) {
        setCategories(response.data);
      } else {
        setError('加载配置分类失败');
      }
    } catch (err) {
      logger.error('加载配置分类失败', { err });
      setError('加载配置分类失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载配置列表
  const loadConfigs = useCallback(async (params?: ConfigQueryParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await configApi.getConfigs(params);
      if (response.success) {
        // 解析配置值
        const parsedConfigs = response.data.map((config) => ({
          ...config,
          value: parseConfigValue(String(config.value), config.valueType),
        }));
        setConfigs(parsedConfigs);
      } else {
        setError('加载配置失败');
      }
    } catch (err) {
      logger.error('加载配置失败', { err });
      setError('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新单个配置
  const updateConfig = useCallback(
    async (key: string, value: unknown, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        const serializedValue = serializeConfigValue(
          value as string | number | boolean | unknown[] | Record<string, unknown>
        );
        const response = await configApi.updateConfig(key, {
          value: serializedValue,
          reason,
        });
        if (response.success) {
          // 更新本地状态
          setConfigs((prev) =>
            prev.map((config) =>
              config.key === key
                ? { ...config, value: parseConfigValue(String(response.data.value), config.valueType) }
                : config
            )
          );
          toast.success('配置更新成功');
        } else {
          setError('更新配置失败');
          toast.error('更新配置失败');
        }
      } catch (err) {
        logger.error('更新配置失败', { err, key, value });
        setError('更新配置失败');
        toast.error('更新配置失败');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 批量更新配置
  const batchUpdateConfigs = useCallback(
    async (configsToUpdate: Record<string, unknown>, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        const serializedConfigs = Object.entries(configsToUpdate).map(([key, value]) => ({
          key,
          value: serializeConfigValue(
            value as string | number | boolean | unknown[] | Record<string, unknown>
          ),
        }));
        const response = await configApi.batchUpdateConfigs({
          configs: serializedConfigs,
          reason,
        });
        if (response.success) {
          // 更新本地状态
          setConfigs((prev) =>
            prev.map((config) => {
              const updated = response.data.find((c) => c.key === config.key);
              if (updated) {
                return {
                  ...config,
                  value: parseConfigValue(String(updated.value), config.valueType),
                };
              }
              return config;
            })
          );
          toast.success('批量更新成功');
        } else {
          setError('批量更新失败');
          toast.error('批量更新失败');
        }
      } catch (err) {
        logger.error('批量更新配置失败', { err, configs: configsToUpdate });
        setError('批量更新失败');
        toast.error('批量更新失败');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 获取配置历史
  const getConfigHistory = useCallback(
    async (configId: string, params?: ConfigHistoryQueryParams) => {
      try {
        const response = await configApi.getConfigHistory(configId, params);
        if (response.success) {
          return response.data.items;
        }
        return [];
      } catch (err) {
        logger.error('获取配置历史失败', { err, configId });
        return [];
      }
    },
    []
  );

  // 导出配置
  const exportConfigs = useCallback(async (category?: string) => {
    try {
      const blob = await configApi.exportConfigs(category);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `configs-${category || 'all'}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('配置导出成功');
      return blob;
    } catch (err) {
      logger.error('导出配置失败', { err, category });
      toast.error('导出配置失败');
      throw err;
    }
  }, []);

  // 导入配置
  const importConfigs = useCallback(
    async (data: { configs: Array<{ key: string; value: string; categoryCode?: string }>; overwrite?: boolean }) => {
      try {
        const response = await configApi.importConfigs(data);
        if (response.success) {
          toast.success(`导入成功: ${response.data.imported} 项, 跳过: ${response.data.skipped} 项`);
          // 重新加载配置
          await loadConfigs();
          return response.data;
        }
        toast.error('导入配置失败');
        return { imported: 0, skipped: 0 };
      } catch (err) {
        logger.error('导入配置失败', { err });
        toast.error('导入配置失败');
        throw err;
      }
    },
    [loadConfigs]
  );

  // 比较配置
  const compareConfigs = useCallback(async (file: File) => {
    try {
      const response = await configApi.compareConfigs(file);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (err) {
      logger.error('比较配置失败', { err });
      toast.error('比较配置失败');
      throw err;
    }
  }, []);

  // 重置为默认值
  const resetToDefault = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const response = await configApi.resetConfigToDefault(key);
      if (response.success) {
        setConfigs((prev) =>
          prev.map((config) =>
            config.key === key
              ? { ...config, value: parseConfigValue(String(response.data.value), config.valueType) }
              : config
          )
        );
        toast.success('已重置为默认值');
      }
    } catch (err) {
      logger.error('重置配置失败', { err, key });
      toast.error('重置配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    categories,
    configs,
    loading,
    error,
    selectedCategory,
    loadCategories,
    loadConfigs,
    updateConfig,
    batchUpdateConfigs,
    getConfigHistory,
    exportConfigs,
    importConfigs,
    compareConfigs,
    resetToDefault,
    clearError,
  };
}

/**
 * 单个配置值 Hook
 * 用于获取和更新单个配置值
 */
export function useConfigValue<T = unknown>(key: string): UseConfigValueReturn<T> {
  const [value, setValue] = useState<T>(null as unknown as T);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef<SystemConfig | null>(null);

  const loadValue = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const response = await configApi.getConfig(key);
      if (response.success) {
        configRef.current = response.data;
        const parsedValue = parseConfigValue(
          String(response.data.value),
          response.data.valueType
        ) as T;
        setValue(parsedValue);
      }
    } catch (err) {
      logger.error('加载配置值失败', { err, key });
      setError('加载配置值失败');
    } finally {
      setLoading(false);
    }
  }, [key]);

  const updateValue = useCallback(
    async (newValue: T, reason?: string) => {
      if (!key) return;
      setLoading(true);
      setError(null);
      try {
        const serializedValue = serializeConfigValue(
          newValue as string | number | boolean | unknown[] | Record<string, unknown>
        );
        const response = await configApi.updateConfig(key, {
          value: serializedValue,
          reason,
        });
        if (response.success) {
          const parsedValue = parseConfigValue(
            String(response.data.value),
            response.data.valueType
          ) as T;
          setValue(parsedValue);
          toast.success('配置更新成功');
        }
      } catch (err) {
        logger.error('更新配置值失败', { err, key, newValue });
        setError('更新配置值失败');
        toast.error('更新配置值失败');
      } finally {
        setLoading(false);
      }
    },
    [key]
  );

  const resetToDefault = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const response = await configApi.resetConfigToDefault(key);
      if (response.success) {
        const parsedValue = parseConfigValue(
          String(response.data.value),
          response.data.valueType
        ) as T;
        setValue(parsedValue);
        toast.success('已重置为默认值');
      }
    } catch (err) {
      logger.error('重置配置失败', { err, key });
      toast.error('重置配置失败');
    } finally {
      setLoading(false);
    }
  }, [key]);

  const refresh = useCallback(async () => {
    await loadValue();
  }, [loadValue]);

  useEffect(() => {
    loadValue();
  }, [loadValue]);

  return {
    value,
    loading,
    error,
    updateValue,
    resetToDefault,
    refresh,
  };
}

/**
 * 多个配置值 Hook
 * 用于管理一组相关的配置值
 */
export function useConfigValues<T extends Record<string, unknown>>(
  keys: string[]
): UseConfigValuesReturn<T> {
  const [values, setValues] = useState<T>({} as T);
  const [originalValues, setOriginalValues] = useState<T>({} as T);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadValues = useCallback(async () => {
    if (keys.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await configApi.getConfigs({});
      if (response.success) {
        const configs = response.data.filter((c) => keys.includes(c.key));
        const parsedValues = configs.reduce((acc, config) => {
          acc[config.key as keyof T] = parseConfigValue(
            String(config.value),
            config.valueType
          ) as T[keyof T];
          return acc;
        }, {} as T);
        setValues(parsedValues);
        setOriginalValues(JSON.parse(JSON.stringify(parsedValues)));
      }
    } catch (err) {
      logger.error('加载配置值失败', { err, keys });
      setError('加载配置值失败');
    } finally {
      setLoading(false);
    }
  }, [keys]);

  const updateValue = useCallback((key: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateValues = useCallback(async (newValues: Partial<T>, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const serializedConfigs = Object.entries(newValues).map(([key, value]) => ({
        key,
        value: serializeConfigValue(value as string | number | boolean | unknown[] | Record<string, unknown>),
      }));
      const response = await configApi.batchUpdateConfigs({
        configs: serializedConfigs,
        reason,
      });
      if (response.success) {
        const parsedValues = response.data.reduce((acc, config) => {
          acc[config.key as keyof T] = parseConfigValue(
            String(config.value),
            config.valueType
          ) as T[keyof T];
          return acc;
        }, {} as T);
        setValues((prev) => ({ ...prev, ...parsedValues }));
        setOriginalValues(JSON.parse(JSON.stringify({ ...values, ...parsedValues })));
        toast.success('配置更新成功');
      }
    } catch (err) {
      logger.error('批量更新配置失败', { err, values: newValues });
      setError('批量更新配置失败');
      toast.error('批量更新配置失败');
    } finally {
      setLoading(false);
    }
  }, [values]);

  const save = useCallback(
    async (reason?: string) => {
      const changedValues = Object.entries(values).reduce((acc, [key, value]) => {
        if (JSON.stringify(value) !== JSON.stringify(originalValues[key as keyof T])) {
          acc[key as keyof T] = value as T[keyof T];
        }
        return acc;
      }, {} as Partial<T>);

      if (Object.keys(changedValues).length > 0) {
        await updateValues(changedValues, reason);
      }
    },
    [values, originalValues, updateValues]
  );

  const reset = useCallback(() => {
    setValues(JSON.parse(JSON.stringify(originalValues)));
  }, [originalValues]);

  const refresh = useCallback(async () => {
    await loadValues();
  }, [loadValues]);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  const hasChanges = Object.entries(values).some(
    ([key, value]) => JSON.stringify(value) !== JSON.stringify(originalValues[key as keyof T])
  );

  return {
    values,
    loading,
    error,
    updateValues,
    updateValue,
    save,
    refresh,
    hasChanges,
    reset,
  };
}

export default useConfig;
