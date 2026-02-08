import { toast } from 'sonner';

// API 错误响应接口
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// 判断是否为 API 错误
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    error.success === false &&
    'error' in error &&
    typeof (error as ApiError).error === 'object'
  );
}

// 获取错误消息
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '操作失败，请稍后重试';
}

// 获取错误码
export function getErrorCode(error: unknown): string {
  if (isApiError(error)) {
    return error.error.code;
  }
  return 'UNKNOWN_ERROR';
}

// 错误码到用户友好消息的映射
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // 认证错误
  UNAUTHORIZED: '请先登录',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  INVALID_TOKEN: '登录状态无效，请重新登录',
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_INACTIVE: '账号已被禁用，请联系管理员',

  // 权限错误
  FORBIDDEN: '您没有权限执行此操作',
  NO_APPROVAL_PERMISSION: '您没有权限审批此申请',
  NOT_ASSIGNED_APPROVER: '您不是该申请的指定审批人',

  // 用户错误
  USER_NOT_FOUND: '用户不存在',
  USERNAME_EXISTS: '用户名已被使用',
  EMAIL_EXISTS: '邮箱已被注册',
  EMPLOYEE_ID_EXISTS: '工号已被使用',
  INVALID_USERNAME: '用户名格式不正确',
  WEAK_PASSWORD: '密码长度至少为6位',
  INVALID_EMAIL: '邮箱格式不正确',

  // 申请错误
  APPLICATION_NOT_FOUND: '申请不存在',
  INVALID_STATUS: '申请状态不正确',
  CANNOT_MODIFY: '只能修改草稿状态的申请',
  CANNOT_DELETE: '只能删除草稿或已拒绝的申请',
  CANNOT_SUBMIT: '只能提交草稿状态的申请',
  INVALID_APPROVAL_ACTION: '无效的审批操作',
  MANAGER_REQUIRED: '请选择审批经理',
  FACTORY_MANAGER_REQUIRED: '请选择厂长',
  TITLE_REQUIRED: '标题不能为空',
  CONTENT_REQUIRED: '内容不能为空',

  // 数据错误
  VALIDATION_ERROR: '参数验证失败',
  NOT_FOUND: '请求的资源不存在',
  DUPLICATE_ENTRY: '数据已存在',
  FOREIGN_KEY_CONSTRAINT: '关联数据不存在',
  MISSING_FIELDS: '请填写所有必填字段',

  // 设备错误
  EQUIPMENT_NOT_FOUND: '设备不存在',
  EQUIPMENT_CODE_EXISTS: '设备编号已存在',
  RECORD_NOT_FOUND: '记录不存在',
  PLAN_NOT_FOUND: '计划不存在',
  TEMPLATE_NOT_FOUND: '模板不存在',

  // 配件错误
  PART_NOT_FOUND: '配件不存在',
  PART_CODE_EXISTS: '配件编号已存在',
  INSUFFICIENT_STOCK: '库存不足',

  // 文件错误
  FILE_TOO_LARGE: '文件大小超过限制',
  INVALID_FILE_TYPE: '不支持的文件类型',
  UPLOAD_FAILED: '文件上传失败',

  // 导出错误
  EXPORT_FAILED: '导出失败',
  NO_DATA_TO_EXPORT: '没有可导出的数据',
};

// 获取用户友好的错误消息
export function getUserFriendlyMessage(error: unknown): string {
  if (isApiError(error)) {
    const { code, message } = error.error;
    return ERROR_MESSAGE_MAP[code] || message || '操作失败';
  }
  if (error instanceof Error) {
    return error.message || '操作失败';
  }
  return '操作失败，请稍后重试';
}

// Toast 错误提示
export function showErrorToast(error: unknown, defaultMessage?: string): void {
  const message = defaultMessage || getUserFriendlyMessage(error);
  toast.error(message);
}

// Toast 成功提示
export function showSuccessToast(message: string): void {
  toast.success(message);
}

// Toast 警告提示
export function showWarningToast(message: string): void {
  toast.warning(message);
}

// 处理 API 错误的通用函数
export function handleApiError(error: unknown, options?: {
  defaultMessage?: string;
  showToast?: boolean;
  onError?: (error: ApiError | unknown) => void;
}): string {
  const { defaultMessage = '操作失败', showToast = true, onError } = options || {};

  const message = getUserFriendlyMessage(error) || defaultMessage;

  if (showToast) {
    toast.error(message);
  }

  if (onError) {
    onError(error);
  }

  return message;
}

// 通用的 fetch 包装器
export async function safeFetch<T>(
  fetchFn: () => Promise<T>,
  options?: {
    defaultMessage?: string;
    showToast?: boolean;
    onError?: (error: unknown) => void;
    onSuccess?: (data: T) => void;
  }
): Promise<T | null> {
  const { defaultMessage, showToast = true, onError, onSuccess } = options || {};

  try {
    const result = await fetchFn();
    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  } catch (error) {
    handleApiError(error, { defaultMessage, showToast, onError });
    return null;
  }
}

// 导出错误码类型（与后端保持一致）
export type ErrorCode =
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'FOREIGN_KEY_CONSTRAINT'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'USER_INACTIVE'
  | 'USER_NOT_FOUND'
  | 'USERNAME_EXISTS'
  | 'EMAIL_EXISTS'
  | 'EMPLOYEE_ID_EXISTS'
  | 'APPLICATION_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'EQUIPMENT_NOT_FOUND'
  | 'PART_NOT_FOUND'
  | 'INSUFFICIENT_STOCK';
