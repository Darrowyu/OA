import { ErrorCode, getErrorInfo } from './error-codes';

// 应用基础错误类
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    const errorInfo = getErrorInfo(code);
    super(message || errorInfo.message);
    this.code = code;
    this.statusCode = errorInfo.status;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.name = 'AppError';

    // 修复原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // 转换为 JSON 响应格式
  toJSON(): { success: false; error: { code: ErrorCode; message: string; details?: unknown } } {
    const error: { code: ErrorCode; message: string; details?: unknown } = {
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) {
      error.details = this.details;
    }
    return {
      success: false,
      error,
    };
  }
}

// 400 Bad Request - 参数验证错误
export class ValidationError extends AppError {
  constructor(message?: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// 401 Unauthorized - 未认证
export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

// 403 Forbidden - 权限不足
export class ForbiddenError extends AppError {
  constructor(message?: string, details?: unknown) {
    super('FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

// 404 Not Found - 资源不存在
export class NotFoundError extends AppError {
  constructor(code: ErrorCode = 'NOT_FOUND', message?: string) {
    super(code, message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// 409 Conflict - 资源冲突
export class ConflictError extends AppError {
  constructor(code: ErrorCode = 'DUPLICATE_ENTRY', message?: string) {
    super(code, message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// 500 Internal Server Error - 服务器内部错误
export class InternalError extends AppError {
  constructor(message?: string, details?: unknown) {
    super('INTERNAL_ERROR', message, details);
    this.name = 'InternalError';
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

// 便捷的错误创建函数
export const createError = {
  // 通用错误
  internal: (message?: string, details?: unknown) => new InternalError(message, details),
  validation: (message?: string, details?: unknown) => new ValidationError(message, details),
  notFound: (code: ErrorCode = 'NOT_FOUND', message?: string) => new NotFoundError(code, message),
  conflict: (code: ErrorCode = 'DUPLICATE_ENTRY', message?: string) => new ConflictError(code, message),
  unauthorized: (message?: string) => new UnauthorizedError(message),
  forbidden: (message?: string, details?: unknown) => new ForbiddenError(message, details),

  // 用户相关错误
  userNotFound: (message?: string) => new NotFoundError('USER_NOT_FOUND', message),
  usernameExists: (message?: string) => new ConflictError('USERNAME_EXISTS', message),
  emailExists: (message?: string) => new ConflictError('EMAIL_EXISTS', message),
  employeeIdExists: (message?: string) => new ConflictError('EMPLOYEE_ID_EXISTS', message),

  // 申请相关错误
  applicationNotFound: (message?: string) => new NotFoundError('APPLICATION_NOT_FOUND', message),
  invalidStatus: (message?: string) => new ValidationError(message, { code: 'INVALID_STATUS' }),
  noApprovalPermission: (message?: string) => new ForbiddenError(message),

  // 设备相关错误
  equipmentNotFound: (message?: string) => new NotFoundError('EQUIPMENT_NOT_FOUND', message),

  // 配件相关错误
  partNotFound: (message?: string) => new NotFoundError('PART_NOT_FOUND', message),
  insufficientStock: (message?: string) => new ValidationError(message, { code: 'INSUFFICIENT_STOCK' }),
};

// 判断是否为 AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// 从未知错误创建 AppError
export function fromUnknownError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message);
  }

  return new InternalError('未知错误');
}
