import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// 权限配置类型
interface FolderPermissions {
  read?: string[];
  write?: string[];
}

/**
 * 文档权限检查中间件
 * 检查用户是否有权限访问指定文档
 */
export function documentPermissionMiddleware(action: 'download' | 'preview') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' },
        });
        return;
      }

      const { id } = req.params;

      // 查询文档及其文件夹权限
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          folder: true,
        },
      });

      if (!document) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '文档不存在' },
        });
        return;
      }

      // 管理员有所有权限
      if (user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // 上传者（拥有者）有权限
      if (document.ownerId === user.id) {
        next();
        return;
      }

      // 检查文件夹权限
      const hasPermission = checkFolderPermission(
        document.folder,
        user.id,
        user.role
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: `无权${action === 'download' ? '下载' : '预览'}此文档` },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('文档权限检查失败', { error: error instanceof Error ? error.message : '未知错误' });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '权限检查失败' },
      });
    }
  };
}

/**
 * 检查文件夹权限
 */
function checkFolderPermission(
  folder: { ownerId: string; permissions?: unknown } | null,
  userId: string,
  userRole: UserRole
): boolean {
  // 如果没有文件夹，默认允许访问
  if (!folder) return true;

  // 文件夹拥有者有权限
  if (folder.ownerId === userId) return true;

  // 解析权限配置
  const permissions = folder.permissions as FolderPermissions | null;

  // 如果没有设置权限，默认允许访问
  if (!permissions) return true;

  // 检查角色权限（read 权限包含下载和预览）
  if (permissions.read && permissions.read.length > 0) {
    // 如果设置了角色限制，检查用户角色是否匹配
    return permissions.read.includes(userRole);
  }

  return true;
}
