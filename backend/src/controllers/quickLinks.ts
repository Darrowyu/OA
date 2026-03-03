import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, fail } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import * as logger from '../lib/logger';

const MAX_QUICK_LINKS = 10;

// 验证用户认证的辅助函数
const getUserId = (req: Request): string | null => req.user?.id ?? null;

// 获取当前用户的所有快捷入口
export const getQuickLinks = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json(fail('UNAUTHORIZED', '请先登录'));
  }

  const quickLinks = await prisma.userQuickLink.findMany({
    where: { userId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return res.json(ok(quickLinks));
});

// 创建快捷入口
export const createQuickLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json(fail('UNAUTHORIZED', '请先登录'));
  }

  const { name, path, icon } = req.body;

  if (!name || !path || !icon) {
    return res.status(400).json(fail('MISSING_FIELDS', '名称、路径和图标不能为空'));
  }

  // 并行执行数量检查和获取最大排序值
  const [count, maxOrderItem] = await Promise.all([
    prisma.userQuickLink.count({ where: { userId } }),
    prisma.userQuickLink.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    }),
  ]);

  if (count >= MAX_QUICK_LINKS) {
    return res.status(400).json(fail('LIMIT_EXCEEDED', `最多只能添加 ${MAX_QUICK_LINKS} 个快捷入口`));
  }

  const quickLink = await prisma.userQuickLink.create({
    data: {
      userId,
      name,
      path,
      icon,
      sortOrder: (maxOrderItem?.sortOrder ?? -1) + 1,
    },
  });

  logger.info('创建快捷入口', { userId, quickLinkId: quickLink.id });
  return res.status(201).json(ok(quickLink));
});

// 更新快捷入口
export const updateQuickLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json(fail('UNAUTHORIZED', '请先登录'));
  }

  const { id } = req.params;
  const { name, path, icon, isActive } = req.body;

  // 直接尝试更新，让 Prisma 处理不存在的情况
  try {
    const quickLink = await prisma.userQuickLink.update({
      where: { id, userId },
      data: {
        ...(name && { name }),
        ...(path && { path }),
        ...(icon && { icon }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    logger.info('更新快捷入口', { userId, quickLinkId: id });
    return res.json(ok(quickLink));
  } catch (err: any) {
    if (err.code === 'P2025') { // Prisma not found error
      return res.status(404).json(fail('NOT_FOUND', '快捷入口不存在'));
    }
    throw err;
  }
});

// 删除快捷入口
export const deleteQuickLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json(fail('UNAUTHORIZED', '请先登录'));
  }

  const { id } = req.params;

  try {
    await prisma.userQuickLink.delete({
      where: { id, userId },
    });

    logger.info('删除快捷入口', { userId, quickLinkId: id });
    return res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json(fail('NOT_FOUND', '快捷入口不存在'));
    }
    throw err;
  }
});

// 批量更新排序
export const reorderQuickLinks = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json(fail('UNAUTHORIZED', '请先登录'));
  }

  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json(fail('INVALID_INPUT', '请提供有效的排序列表'));
  }

  const ids = items.map((item: { id: string }) => item.id);

  // 验证所有项属于当前用户
  const userLinksCount = await prisma.userQuickLink.count({
    where: { id: { in: ids }, userId },
  });

  if (userLinksCount !== ids.length) {
    return res.status(400).json(fail('INVALID_INPUT', '无效的快捷入口ID'));
  }

  // 使用单个 updateMany 配合 CASE 语句优化批量更新
  const caseStatements = items
    .map((item: { id: string; sortOrder: number }) => `WHEN '${item.id}' THEN ${item.sortOrder}`)
    .join(' ');

  await prisma.$executeRaw`
    UPDATE user_quick_links
    SET sort_order = CASE id ${caseStatements} END
    WHERE user_id = ${userId}
    AND id IN (${ids.join(',')})
  `;

  logger.info('更新快捷入口排序', { userId, count: items.length });
  return res.json(ok({ message: '排序更新成功' }));
});
