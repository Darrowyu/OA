import { Request, Response, NextFunction } from 'express';
import { createAuditLog, CreateAuditLogData } from '../services/auditService';
import logger from '../lib/logger';

/**
 * 获取客户端IP地址
 */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress;
}

/**
 * 审计中间件选项
 */
interface AuditMiddlewareOptions {
  action: string;
  entityType: string;
  entityIdExtractor?: (req: Request) => string | undefined;
  descriptionExtractor?: (req: Request, res: Response) => string | undefined;
  captureOldValues?: boolean;
  captureNewValues?: boolean;
}

/**
 * 生成请求唯一标识
 */
function getRequestId(req: Request): string {
  return `${req.method}-${req.path}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 审计中间件 - 自动记录操作日志
 * 使用示例:
 * router.post('/users', auditMiddleware({ action: 'CREATE_USER', entityType: 'User' }), createUser);
 */
export function auditMiddleware(options: AuditMiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { action, entityType, entityIdExtractor, descriptionExtractor, captureOldValues, captureNewValues } = options;

    // 存储请求ID用于关联响应
    const requestId = getRequestId(req);
    (req as unknown as Record<string, unknown>).auditRequestId = requestId;

    // 捕获旧值（用于更新操作）
    if (captureOldValues && req.method === 'PUT' || req.method === 'PATCH') {
      // 这里可以根据entityType和entityId查询原始数据
      // 实际实现需要在业务逻辑中处理
    }

    // 监听响应完成
    const originalEnd = res.end.bind(res);
    let responseBody = '';

    // 重写res.end以捕获响应内容
    res.end = function(chunk: unknown, encoding?: unknown): Response {
      if (chunk) {
        responseBody = chunk.toString();
      }
      return originalEnd(chunk, encoding as BufferEncoding);
    };

    res.on('finish', async () => {
      try {
        const user = req.user;
        if (!user) return;

        const entityId = entityIdExtractor ? entityIdExtractor(req) : undefined;
        const description = descriptionExtractor ? descriptionExtractor(req, res) : undefined;

        let oldValues: Record<string, unknown> | undefined;
        let newValues: Record<string, unknown> | undefined;

        // 尝试解析响应体获取新值
        if (captureNewValues && responseBody) {
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed.success && parsed.data) {
              newValues = parsed.data;
            }
          } catch {
            // 解析失败不处理
          }
        }

        // 从请求体获取值
        if (req.body && Object.keys(req.body).length > 0) {
          if (!newValues && captureNewValues) {
            newValues = req.body;
          }
        }

        const auditData: CreateAuditLogData = {
          userId: user.id,
          action,
          entityType,
          entityId,
          oldValues,
          newValues,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'],
          description,
        };

        await createAuditLog(auditData);
      } catch (error) {
        logger.error('审计中间件执行失败', {
          error: error instanceof Error ? error.message : '未知错误',
          action,
          entityType,
        });
      }
    });

    next();
  };
}

/**
 * 登录审计
 */
export async function auditLogin(
  req: Request,
  userId: string,
  success: boolean,
  extraInfo?: { username?: string; reason?: string }
): Promise<void> {
  try {
    const description = success
      ? `用户登录成功: ${extraInfo?.username || ''}`
      : `用户登录失败: ${extraInfo?.username || ''}${extraInfo?.reason ? `, 原因: ${extraInfo.reason}` : ''}`;

    await createAuditLog({
      userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entityType: 'User',
      entityId: userId,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      description,
    });
  } catch (error) {
    logger.error('登录审计记录失败', {
      error: error instanceof Error ? error.message : '未知错误',
      userId,
      success,
    });
  }
}

/**
 * 登出审计
 */
export async function auditLogout(req: Request, userId: string): Promise<void> {
  try {
    await createAuditLog({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      description: '用户登出',
    });
  } catch (error) {
    logger.error('登出审计记录失败', {
      error: error instanceof Error ? error.message : '未知错误',
      userId,
    });
  }
}

/**
 * 手动审计记录
 * 用于在业务逻辑中直接记录审计日志
 */
export async function manualAudit(
  req: Request,
  data: Omit<CreateAuditLogData, 'ipAddress' | 'userAgent'>
): Promise<void> {
  try {
    await createAuditLog({
      ...data,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    logger.error('手动审计记录失败', {
      error: error instanceof Error ? error.message : '未知错误',
      data,
    });
  }
}
