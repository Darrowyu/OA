import apiClient from '@/lib/api';
import {
  ApiResponse,
  PaginationData,
} from '@/types/api';
import {
  ConfigCategory,
  SystemConfig,
  ConfigHistory,
  ConfigQueryParams,
  ConfigUpdateRequest,
  ConfigBatchUpdateRequest,
  ConfigHistoryQueryParams,
  ConfigImportRequest,
  ConfigCompareResult,
} from '@/types/config';

/**
 * 配置服务 API
 * 对应后端配置管理接口
 */

// 获取所有配置分类
const getCategories = (): Promise<ApiResponse<ConfigCategory[]>> =>
  apiClient.get('/config/categories');

// 获取配置分类详情
const getCategory = (code: string): Promise<ApiResponse<ConfigCategory>> =>
  apiClient.get(`/config/categories/${code}`);

// 获取配置列表
const getConfigs = (params?: ConfigQueryParams): Promise<ApiResponse<SystemConfig[]>> =>
  apiClient.get('/config', { params });

// 获取单个配置
const getConfig = (key: string): Promise<ApiResponse<SystemConfig>> =>
  apiClient.get(`/config/${key}`);

// 获取配置值（简化版，直接返回值）
const getConfigValue = <T = unknown>(key: string): Promise<ApiResponse<{ value: T }>> =>
  apiClient.get(`/config/${key}/value`);

// 更新配置
const updateConfig = (
  key: string,
  data: ConfigUpdateRequest
): Promise<ApiResponse<SystemConfig>> =>
  apiClient.put(`/config/${key}`, data);

// 批量更新配置
const batchUpdateConfigs = (
  data: ConfigBatchUpdateRequest
): Promise<ApiResponse<SystemConfig[]>> =>
  apiClient.put('/config/batch', data);

// 获取配置历史
const getConfigHistory = (
  configId: string,
  params?: ConfigHistoryQueryParams
): Promise<ApiResponse<PaginationData<ConfigHistory>>> =>
  apiClient.get(`/config/${configId}/history`, { params });

// 重置配置为默认值
const resetConfigToDefault = (key: string): Promise<ApiResponse<SystemConfig>> =>
  apiClient.post(`/config/${key}/reset`);

// 导出配置
const exportConfigs = (category?: string): Promise<Blob> =>
  apiClient.get('/config/export', {
    params: { category },
    responseType: 'blob',
  });

// 导入配置
const importConfigs = (
  data: ConfigImportRequest
): Promise<ApiResponse<{ imported: number; skipped: number }>> =>
  apiClient.post('/config/import', data);

// 比较配置
const compareConfigs = (file: File): Promise<ApiResponse<ConfigCompareResult[]>> => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/config/compare', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 验证配置值
const validateConfig = (
  key: string,
  value: unknown
): Promise<ApiResponse<{ valid: boolean; message?: string }>> =>
  apiClient.post(`/config/${key}/validate`, { value });

// 获取配置元数据（包含验证规则、选项等）
const getConfigMetadata = (key: string): Promise<ApiResponse<{
  validation?: Record<string, unknown>;
  options?: Array<{ label: string; value: unknown }>;
}>> =>
  apiClient.get(`/config/${key}/metadata`);

// 搜索配置
const searchConfigs = (
  keyword: string,
  category?: string
): Promise<ApiResponse<SystemConfig[]>> =>
  apiClient.get('/config/search', {
    params: { keyword, category },
  });

export const configApi = {
  // 分类管理
  getCategories,
  getCategory,

  // 配置管理
  getConfigs,
  getConfig,
  getConfigValue,
  updateConfig,
  batchUpdateConfigs,

  // 历史记录
  getConfigHistory,

  // 工具方法
  resetConfigToDefault,
  exportConfigs,
  importConfigs,
  compareConfigs,
  validateConfig,
  getConfigMetadata,
  searchConfigs,
};

export default configApi;
