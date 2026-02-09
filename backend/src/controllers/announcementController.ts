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

// 统一响应辅助函数
function successResponse<T>(res: Response, data: T, message?: string): void {
  res.json({ success: true, data, message })
}

function errorResponse(res: Response, message: string, status = 500): void {
  res.status(status).json({ error: message })
}

// 验证用户登录
function requireAuth(req: Request, res: Response): NonNullable<typeof req.user> | null {
  const user = req.user
  if (!user) {
    errorResponse(res, '未登录', 401)
    return null
  }
  return user
}

// 检查发布权限
function canPublish(role: string): boolean {
  return ['ADMIN', 'CEO', 'DIRECTOR', 'MANAGER'].includes(role)
}

// 解析分页参数
function parsePagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  return {
    page: parseInt(query.page as string, 10) || 1,
    pageSize: parseInt(query.pageSize as string, 10) || 20,
  }
}

/**
 * 获取公告列表
 * GET /api/announcements
 */
export async function getAnnouncementsList(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { type, isTop, search, includeExpired } = req.query
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>)

    const result = await getAnnouncements(user.id, {
      page,
      pageSize,
      ...(type && type !== 'all' && { type: type as AnnouncementType }),
      ...(isTop !== undefined && { isTop: isTop === 'true' }),
      ...(search && { search: search as string }),
      ...(includeExpired && { includeExpired: includeExpired === 'true' }),
      userDeptId: user.departmentId || undefined,
    })

    successResponse(res, result)
  } catch (error) {
    logger.error('获取公告列表失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '获取公告列表失败')
  }
}

/**
 * 获取公告详情
 * GET /api/announcements/:id
 */
export async function getAnnouncementDetail(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const announcement = await getAnnouncementById(req.params.id, user.id)

    if (!announcement) {
      errorResponse(res, '公告不存在', 404)
      return
    }

    successResponse(res, announcement)
  } catch (error) {
    logger.error('获取公告详情失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '获取公告详情失败')
  }
}

/**
 * 创建公告
 * POST /api/announcements
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    if (!canPublish(user.role)) {
      errorResponse(res, '无权发布公告', 403)
      return
    }

    const { title, content, type, targetDepts, isTop, validFrom, validUntil, attachments } = req.body

    // 验证必填字段
    if (!title?.trim()) {
      errorResponse(res, '标题不能为空', 400)
      return
    }
    if (!content?.trim()) {
      errorResponse(res, '内容不能为空', 400)
      return
    }
    if (!type || !Object.values(AnnouncementType).includes(type)) {
      errorResponse(res, '请选择有效的公告类型', 400)
      return
    }
    if (!validFrom) {
      errorResponse(res, '请选择生效时间', 400)
      return
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
    })

    successResponse(res, announcement, '公告发布成功')
  } catch (error) {
    logger.error('创建公告失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '创建公告失败')
  }
}

/**
 * 更新公告
 * PUT /api/announcements/:id
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { id } = req.params
    const { title, content, type, targetDepts, isTop, validFrom, validUntil, attachments } = req.body

    const existing = await getAnnouncementById(id)
    if (!existing) {
      errorResponse(res, '公告不存在', 404)
      return
    }

    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      errorResponse(res, '无权修改此公告', 403)
      return
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
    })

    successResponse(res, updated, '公告更新成功')
  } catch (error) {
    logger.error('更新公告失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '更新公告失败')
  }
}

/**
 * 删除公告
 * DELETE /api/announcements/:id
 */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { id } = req.params

    const existing = await getAnnouncementById(id)
    if (!existing) {
      errorResponse(res, '公告不存在', 404)
      return
    }

    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      errorResponse(res, '无权删除此公告', 403)
      return
    }

    await deleteAnnouncement(id)
    successResponse(res, null, '公告删除成功')
  } catch (error) {
    logger.error('删除公告失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '删除公告失败')
  }
}

/**
 * 获取阅读统计
 * GET /api/announcements/:id/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { id } = req.params

    const existing = await getAnnouncementById(id)
    if (!existing) {
      errorResponse(res, '公告不存在', 404)
      return
    }

    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      errorResponse(res, '无权查看统计信息', 403)
      return
    }

    const stats = await getReadStats(id)
    successResponse(res, stats)
  } catch (error) {
    logger.error('获取阅读统计失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '获取阅读统计失败')
  }
}

/**
 * 切换置顶状态
 * POST /api/announcements/:id/toggle-top
 */
export async function toggleTopStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { id } = req.params
    const { isTop } = req.body

    const existing = await getAnnouncementById(id)
    if (!existing) {
      errorResponse(res, '公告不存在', 404)
      return
    }

    if (existing.authorId !== user.id && user.role !== 'ADMIN') {
      errorResponse(res, '无权修改此公告', 403)
      return
    }

    const updated = await toggleTop(id, isTop)
    successResponse(res, updated, isTop ? '公告已置顶' : '公告已取消置顶')
  } catch (error) {
    logger.error('切换置顶状态失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '切换置顶状态失败')
  }
}

/**
 * 获取未读公告数量
 * GET /api/announcements/unread-count
 */
export async function getUnreadCountHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const count = await getUnreadCount(user.id, user.departmentId || undefined)
    successResponse(res, { count })
  } catch (error) {
    logger.error('获取未读数量失败', { error: error instanceof Error ? error.message : '未知错误' })
    errorResponse(res, '获取未读数量失败')
  }
}
