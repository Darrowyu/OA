import { ConfigValueType } from '@prisma/client';

/**
 * 解析后的配置值类型
 */
export type ParsedConfigValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export interface ConfigCategoryDTO {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface ConfigOption {
  label: string;
  value: string | number | boolean;
  description?: string;
}

export interface ConfigValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
}

export interface SystemConfigDTO {
  id: string;
  key: string;
  value: ParsedConfigValue;
  defaultValue?: ParsedConfigValue;
  valueType: ConfigValueType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: ConfigOption[];
  validation?: ConfigValidation;
  isSecret: boolean;
  isEditable: boolean;
  isVisible: boolean;
  sortOrder: number;
  module: string;
  category?: ConfigCategoryDTO;
}

export interface UpdateConfigDTO {
  value: ParsedConfigValue;
  reason?: string;
}

export interface ConfigHistoryDTO {
  id: string;
  configKey: string;
  oldValue?: ParsedConfigValue;
  newValue: ParsedConfigValue;
  changedBy: string;
  changedByName?: string;
  reason?: string;
  createdAt: Date;
}

export interface ConfigQueryParams {
  category?: string;
  module?: string;
  search?: string;
}
