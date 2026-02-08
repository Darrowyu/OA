import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError, fromUnknownError } from '../errors/AppError';
import logger from '../lib/logger';
import { config } from '../config';

// 错误响应接口
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  stack?: string;
}

/**
 * 全局错误处理中间件
 * 统一处理所有未捕获的错误
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. 处理 AppError
  if (isAppError(err)) {
    const error: ErrorResponse['error'] = {
      code: err.code,
      message: err.message,
    };
    if (err.details !== undefined) {
      error.details = err.details;
    }
    const response: ErrorResponse = {
      success: false,
      error,
    };

    // 开发环境添加堆栈信息
    if (config.nodeEnv === 'development') {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // 2. 处理 Zod 验证错误
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '参数验证失败',
        details,
      },
    };

    if (config.nodeEnv === 'development') {
      response.stack = err.stack;
    }

    logger.warn('参数验证失败', { details });
    res.status(400).json(response);
    return;
  }

  // 3. 处理 Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: unknown; message: string };

    // 唯一约束冲突
    if (prismaError.code === 'P2002') {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '数据已存在',
          details: prismaError.meta,
        },
      };

      if (config.nodeEnv === 'development') {
        response.stack = err.stack;
      }

      res.status(409).json(response);
      return;
    }

    // 外键约束失败
    if (prismaError.code === 'P2003') {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: '关联数据不存在',
        },
      };

      if (config.nodeEnv === 'development') {
        response.stack = err.stack;
      }

      res.status(400).json(response);
      return;
    }

    // 记录未找到
    if (prismaError.code === 'P2025') {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '记录不存在',
        },
      };

      if (config.nodeEnv === 'development') {
        response.stack = err.stack;
      }

      res.status(404).json(response);
      return;
    }

    // 其他 Prisma 错误
    logger.error('Prisma 错误', { code: prismaError.code, message: prismaError.message });
  }

  // 4. 处理 JWT 错误
  if (err.name === 'TokenExpiredError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: '认证令牌已过期',
      },
    };

    if (config.nodeEnv === 'development') {
      response.stack = err.stack;
    }

    res.status(401).json(response);
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '无效的认证令牌',
      },
    };

    if (config.nodeEnv === 'development') {
      response.stack = err.stack;
    }

    res.status(401).json(response);
    return;
  }

  // 5. 处理 SyntaxError (JSON 解析错误)
  if (err instanceof SyntaxError && 'body' in err) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: '请求体格式不正确',
      },
    };

    if (config.nodeEnv === 'development') {
      response.stack = err.stack;
    }

    res.status(400).json(response);
    return;
  }

  // 6. 默认: 未知错误
  logger.error('未处理的错误', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : '服务器内部错误',
    },
  };

  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
    },
  });
}

/**
 * 异步函数错误包装器
 * 自动捕获控制器中的异步错误并传递给错误处理中间件
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 导出便捷函数
export { AppError, isAppError, fromUnknownError };
export * from '../errors/error-codes';
