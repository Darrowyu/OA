/**
 * 统一响应工具函数
 */

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface FailResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | FailResponse;

/**
 * 成功响应
 */
export function ok<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  return { success: true, data, ...(meta && { meta }) };
}

/**
 * 带元数据的成功响应（与ok函数相同，别名）
 */
export function success<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  return { success: true, data, ...(meta && { meta }) };
}

/**
 * 失败响应
 */
export function fail(code: string, message: string, details?: unknown): FailResponse {
  return {
    success: false,
    error: { code, message, details },
  };
}
