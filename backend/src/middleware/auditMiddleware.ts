import { Request, Response, NextFunction } from 'express';
import { createAuditLog, CreateAuditLogData } from '../services/auditService';
import { prisma } from '../lib/prisma';
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
 * 根据entityType和entityId查询原始数据
 * 支持常见实体类型的旧值捕获
 */
async function fetchOldValues(
  entityType: string,
  entityId: string | undefined
): Promise<Record<string, unknown> | undefined> {
  if (!entityId) return undefined;

  try {
    let oldData: unknown = null;

    switch (entityType) {
      case 'User':
        oldData = await prisma.user.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            departmentId: true,
            employeeId: true,
            isActive: true,
            phone: true,
            position: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Department':
        oldData = await prisma.department.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            code: true,
            parentId: true,
            level: true,
            managerId: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Application':
        oldData = await prisma.application.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            applicationNo: true,
            title: true,
            content: true,
            amount: true,
            priority: true,
            status: true,
            applicantId: true,
            rejectedBy: true,
            rejectReason: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Equipment':
        oldData = await prisma.equipment.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            code: true,
            name: true,
            model: true,
            category: true,
            location: true,
            status: true,
            healthScore: true,
            purchaseDate: true,
            warrantyDate: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Folder':
      case 'DocumentFolder':
        oldData = await prisma.documentFolder.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            parentId: true,
            ownerId: true,
            permissions: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Document':
        oldData = await prisma.document.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            folderId: true,
            name: true,
            type: true,
            size: true,
            version: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Task':
        oldData = await prisma.task.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            assigneeId: true,
            creatorId: true,
            projectId: true,
            startDate: true,
            dueDate: true,
            completedAt: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Meeting':
        oldData = await prisma.meeting.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            title: true,
            description: true,
            roomId: true,
            startTime: true,
            endTime: true,
            organizerId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Announcement':
        oldData = await prisma.announcement.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
            isTop: true,
            validFrom: true,
            validUntil: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'KnowledgeArticle':
        oldData = await prisma.knowledgeArticle.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            title: true,
            content: true,
            summary: true,
            categoryId: true,
            tags: true,
            isPublished: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'Workflow':
        oldData = await prisma.workflow.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            description: true,
            entityType: true,
            version: true,
            status: true,
            isDefault: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      default:
        // 未知实体类型，返回undefined
        logger.debug(`审计: 未知的实体类型 ${entityType}，无法捕获旧值`);
        return undefined;
    }

    return oldData ? (oldData as Record<string, unknown>) : undefined;
  } catch (error) {
    logger.error('审计: 获取旧值失败', {
      error: error instanceof Error ? error.message : '未知错误',
      entityType,
      entityId,
    });
    return undefined;
  }
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
    let oldValues: Record<string, unknown> | undefined;
    if (captureOldValues && (req.method === 'PUT' || req.method === 'PATCH')) {
      const entityId = entityIdExtractor ? entityIdExtractor(req) : req.params.id;
      oldValues = await fetchOldValues(entityType, entityId);
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

        let finalOldValues = oldValues;
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
          oldValues: finalOldValues,
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
