/**
 * 系统配置类型定义
 * 对应后端 Prisma 模型: ConfigCategory, SystemConfig, ConfigHistory
 */

// 配置值类型枚举
export type ConfigValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY';

// 配置分类
export interface ConfigCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 配置作用域类型
export type ConfigScopeType = 'GLOBAL' | 'MODULE' | 'USER';

// 系统配置项
export interface SystemConfig {
  id: string;
  categoryId: string;
  key: string;
  value: string | number | boolean | unknown[] | Record<string, unknown>;
  defaultValue?: string;
  valueType: ConfigValueType;
  label: string;
  description?: string;
  scope: ConfigScopeType;
  scopeId?: string;
  isEncrypted: boolean;
  isEditable: boolean;
  isVisible: boolean;
  sortOrder: number;
  validation?: string; // JSON 字符串，存储验证规则
  options?: string; // JSON 字符串，存储选项列表
  createdAt: string;
  updatedAt: string;
  category?: ConfigCategory;
}

// 配置历史记录
export interface ConfigHistory {
  id: string;
  configId: string;
  oldValue?: string;
  newValue: string;
  changedBy: string;
  changeReason?: string;
  createdAt: string;
  config?: SystemConfig;
  changedByUser?: {
    id: string;
    name: string;
    username: string;
  };
}

// 配置验证规则
export interface ConfigValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
  customMessage?: string;
}

// 配置选项
export interface ConfigOption {
  label: string;
  value: string | number | boolean;
  description?: string;
}

// 配置表单字段属性
export interface ConfigFormFieldProps {
  config: SystemConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

// 配置分类区块属性
export interface ConfigCategorySectionProps {
  category: ConfigCategory;
  configs: SystemConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  loading?: boolean;
}

// 配置查询参数
export interface ConfigQueryParams {
  category?: string;
  scope?: ConfigScopeType;
  scopeId?: string;
  search?: string;
}

// 配置更新请求
export interface ConfigUpdateRequest {
  value: string | number | boolean | unknown[] | Record<string, unknown>;
  reason?: string;
}

// 批量配置更新请求
export interface ConfigBatchUpdateRequest {
  configs: Array<{
    key: string;
    value: string | number | boolean | unknown[] | Record<string, unknown>;
  }>;
  reason?: string;
}

// 配置历史查询参数
export interface ConfigHistoryQueryParams {
  configId?: string;
  page?: number;
  pageSize?: number;
}

// 配置导入请求
export interface ConfigImportRequest {
  configs: Array<{
    key: string;
    value: string;
    categoryCode?: string;
  }>;
  overwrite?: boolean;
}

// 配置比较结果
export interface ConfigCompareResult {
  key: string;
  label: string;
  currentValue: string;
  importedValue: string;
  hasConflict: boolean;
}

// 配置上下文状态
export interface ConfigContextState {
  categories: ConfigCategory[];
  configs: SystemConfig[];
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
}

// 配置操作
export interface ConfigActions {
  loadCategories: () => Promise<void>;
  loadConfigs: (params?: ConfigQueryParams) => Promise<void>;
  updateConfig: (key: string, value: unknown, reason?: string) => Promise<void>;
  batchUpdateConfigs: (configs: Record<string, unknown>, reason?: string) => Promise<void>;
  getConfigHistory: (configId: string, params?: ConfigHistoryQueryParams) => Promise<ConfigHistory[]>;
  exportConfigs: (category?: string) => Promise<Blob>;
  importConfigs: (data: ConfigImportRequest) => Promise<{ imported: number; skipped: number }>;
  compareConfigs: (file: File) => Promise<ConfigCompareResult[]>;
  resetToDefault: (key: string) => Promise<void>;
  clearError: () => void;
}

// 配置 Hook 返回值
export type UseConfigReturn = ConfigContextState & ConfigActions;

// 单个配置值 Hook 返回值
export interface UseConfigValueReturn<T = unknown> {
  value: T;
  loading: boolean;
  error: string | null;
  updateValue: (newValue: T, reason?: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
  refresh: () => Promise<void>;
}

// 多个配置值 Hook 返回值
export interface UseConfigValuesReturn<T extends Record<string, unknown> = Record<string, unknown>> {
  values: T;
  loading: boolean;
  error: string | null;
  updateValues: (newValues: Partial<T>, reason?: string) => Promise<void>;
  updateValue: (key: keyof T, value: T[keyof T]) => void;
  save: (reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
  hasChanges: boolean;
  reset: () => void;
}
