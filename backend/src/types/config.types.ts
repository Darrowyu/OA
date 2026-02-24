import { ConfigValueType } from '@prisma/client';

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
  value: any;
  defaultValue?: any;
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
  value: any;
  reason?: string;
}

export interface ConfigHistoryDTO {
  id: string;
  configKey: string;
  oldValue?: any;
  newValue: any;
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
