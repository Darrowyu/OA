import { Request, Response } from 'express';
import { AnnouncementType } from '@prisma/client';
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getReadStats,
  toggleTop,
  getUnreadCount,
} from '../services/announcementService';
import logger from '../lib/logger';

/**
 * 获取公告列表
 * GET /api/announcements
 */
export async function getAnnouncementsList(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const {
      type,
      isTop,
      search,
      page = '1',
      pageSize = '20',
      includeExpired,
    } = req.query;

    const result = await getAnnouncements(user.id, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      ...(type && type !== 'all' && { type: type as AnnouncementType }),
      ...(isTop !== undefined && { isTop: isTop === 'true' }),
      ...(search && { search: search as string }),
      ...(includeExpired && { includeExpired: includeExpired === 'true' }),
      userDeptId: user.departmentId || undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('获取公告列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取公告列表失败' });
  }
}

/**
 * 获取公告详情
 * GET /api/announcements/:id
 */
export async function getAnnouncementDetail(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    const announcement = await getAnnouncementById(id, user.id);

    if (!announcement) {
      res.status(404).json({ error: '公告不存在' });
      return;
    }

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    logger.error('获取公告详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取公告详情失败' });
  }
}

/**
 * 创建公告
 * POST /api/announcements
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    // 检查权限：只有管理员、CEO、总监可以发布公告
    if (!['ADMIN', 'CEO', 'DIRECTOR', 'MANAGER'].includes(user.role)) {
      res.status(403).json({ error: '无权发布公告' });
      return;
    }

    const {
      title,
      content,
      type,
      targetDepts,
      isTop,
      validFrom,
      validUntil,
      attachments,
    } = req.body;

    // 验证必填字段
    if (!title?.trim()) {
      res.status(400).json({ error: '标题不能为空' });
      return;
    }
    if (!content?.trim()) {
      res.status(400).json({ error: '内容不能为空' });
      return;
    }
    if (!type || !Object.values(AnnouncementType).includes(type)) {
      res.status(400).json({ error: '请选择有效的公告类型' });
      return;
    }
    if (!validFrom) {
      res.status(400).json({ error: '请选择生效时间' });
      return;
    }

    const announcement = await createAnnouncement({
      title: title.trim(),
      content: content.trim(),
      type,
      targetDepts,
      isTop: isTop ?? false,
      validFrom: new Date(validFrom),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      attachments,
      authorId: user.id,
    });

    res.status(201).json({
      success: true,
      message: '公告发布成功',
      data: announcement,
    });
  } catch (error) {
    logger.error('创建公告失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '创建公告失败' });
  }
}

/**
 * 更新公告
 * PUT /api/announcements/:id
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const {
      title,
      content,
      type,
      targetDepts,
      isTop,
      validFrom,
      validUntil,
      attachments,
    } = req.body;

    // 检查公告是否存在
    const existing = await getAnnouncementById(id);
    if (!existing) {
      res.status(404).json({ error: '公告不存在' });
      return;
    }

    // 权限检查：只有发布者或管理员可以修改
    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权修改此公告' });
      return;
    }

    const updated = await updateAnnouncement(id, {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(type !== undefined && { type }),
      ...(targetDepts !== undefined && { targetDepts }),
      ...(isTop !== undefined && { isTop }),
      ...(validFrom !== undefined && { validFrom: new Date(validFrom) }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      ...(attachments !== undefined && { attachments }),
    });

    res.json({
      success: true,
      message: '公告更新成功',
      data: updated,
    });
  } catch (error) {
    logger.error('更新公告失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '更新公告失败' });
  }
}

/**
 * 删除公告
 * DELETE /api/announcements/:id
 */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    // 检查公告是否存在
    const existing = await getAnnouncementById(id);
    if (!existing) {
      res.status(404).json({ error: '公告不存在' });
      return;
    }

    // 权限检查：只有发布者或管理员可以删除
    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权删除此公告' });
      return;
    }

    await deleteAnnouncement(id);

    res.json({
      success: true,
      message: '公告删除成功',
    });
  } catch (error) {
    logger.error('删除公告失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '删除公告失败' });
  }
}

/**
 * 获取阅读统计
 * GET /api/announcements/:id/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    // 检查公告是否存在
    const existing = await getAnnouncementById(id);
    if (!existing) {
      res.status(404).json({ error: '公告不存在' });
      return;
    }

    // 权限检查：只有发布者或管理员可以查看统计
    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权查看统计信息' });
      return;
    }

    const stats = await getReadStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取阅读统计失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取阅读统计失败' });
  }
}

/**
 * 切换置顶状态
 * POST /api/announcements/:id/toggle-top
 */
export async function toggleTopStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { isTop } = req.body;

    // 检查公告是否存在
    const existing = await getAnnouncementById(id);
    if (!existing) {
      res.status(404).json({ error: '公告不存在' });
      return;
    }

    // 权限检查：只有发布者或管理员可以修改置顶
    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权修改此公告' });
      return;
    }

    const updated = await toggleTop(id, isTop);

    res.json({
      success: true,
      message: isTop ? '公告已置顶' : '公告已取消置顶',
      data: updated,
    });
  } catch (error) {
    logger.error('切换置顶状态失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '切换置顶状态失败' });
  }
}

/**
 * 获取未读公告数量
 * GET /api/announcements/unread-count
 */
export async function getUnreadCountHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const count = await getUnreadCount(user.id, user.departmentId || undefined);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('获取未读数量失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取未读数量失败' });
  }
}
