import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// 文件类型定义
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

interface UploadedFiles {
  [fieldname: string]: UploadedFile[];
}

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string; isActive: boolean };
      file?: UploadedFile;
      files?: UploadedFile[] | UploadedFiles;
    }
  }
}

// 导出AuthRequest类型
export interface AuthRequest extends Request {
  user: JwtPayload & { id: string; isActive: boolean };
}

// 导出authenticate作为authMiddleware的别名
export { authMiddleware as authenticate };

// 导出auth作为authMiddleware的别名
export { authMiddleware as auth };

/**
 * 要求管理员权限中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录',
      },
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '需要管理员权限',
      },
    });
    return;
  }

  next();
}

/**
 * 认证错误响应
 */
class AuthError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 认证中间件 - 验证JWT令牌
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthError(401, 'UNAUTHORIZED', '未提供认证令牌');
    }

    // 验证令牌
    const payload = verifyAccessToken(token);

    // 检查用户是否存在且激活
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        isActive: true,
        employeeId: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } }
      },
    });

    if (!user) {
      throw new AuthError(401, 'USER_NOT_FOUND', '用户不存在');
    }

    if (!user.isActive) {
      throw new AuthError(403, 'USER_INACTIVE', '用户已被禁用');
    }

    // 将用户信息附加到请求对象
    req.user = {
      ...payload,
      id: user.id,
      isActive: user.isActive,
      employeeId: user.employeeId,
      name: user.name,
      departmentId: user.departmentId,
      department: user.department?.name || null,
    };

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: '认证令牌已过期',
        },
      });
      return;
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '无效的认证令牌',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '认证过程中发生错误',
      },
    });
  }
}

/**
 * 角色权限中间件 - 检查用户角色
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '您没有权限执行此操作',
          requiredRoles: allowedRoles,
          yourRole: req.user.role,
        },
      });
      return;
    }

    next();
  };
}

/**
 * 角色层级检查 - 检查用户角色是否满足最低要求
 * 角色层级: USER < FACTORY_MANAGER < DIRECTOR < MANAGER < CEO < ADMIN
 */
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.READONLY]: 1,
  [UserRole.FACTORY_MANAGER]: 2,
  [UserRole.DIRECTOR]: 3,
  [UserRole.MANAGER]: 4,
  [UserRole.CEO]: 5,
  [UserRole.ADMIN]: 6,
};

export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      });
      return;
    }

    const userLevel = roleHierarchy[req.user.role];
    const requiredLevel = roleHierarchy[minRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '您的权限等级不足',
          requiredRole: minRole,
          yourRole: req.user.role,
        },
      });
      return;
    }

    next();
  };
}

/**
 * 可选认证中间件 - 有令牌则解析，无令牌也继续
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          isActive: true,
          employeeId: true,
          name: true,
          departmentId: true,
          department: { select: { name: true } }
        },
      });

      if (user && user.isActive) {
        req.user = {
          ...payload,
          id: user.id,
          isActive: user.isActive,
          employeeId: user.employeeId,
          name: user.name,
          departmentId: user.departmentId,
          department: user.department?.name || null,
        };
      }
    }

    next();
  } catch (error) {
    // 可选认证，错误不影响请求继续，但记录日志
    logger.warn('可选认证失败', { error: error instanceof Error ? error.message : '未知错误' });
    next();
  }
}
