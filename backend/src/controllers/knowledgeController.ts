import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { knowledgeService } from '../services/knowledgeService';
import logger from '../lib/logger';

// 统一响应辅助函数
function successResponse<T>(res: Response, data: T, message?: string): void {
  res.json({ success: true, data, message })
}

function errorResponse(res: Response, message: string, status = 500): void {
  res.status(status).json({ success: false, error: message })
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

// 解析分页参数
function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
  return {
    page: parseInt(query.page as string, 10) || 1,
    limit: parseInt(query.limit as string, 10) || 20,
  }
}

// 获取错误信息
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

/**
 * 获取分类列表
 * GET /api/knowledge/categories
 */
export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await knowledgeService.getCategories()
    successResponse(res, categories)
  } catch (error) {
    logger.error('获取分类列表失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取分类列表失败')
  }
}

/**
 * 获取分类详情
 * GET /api/knowledge/categories/:id
 */
export async function getCategoryById(req: Request, res: Response): Promise<void> {
  try {
    const category = await knowledgeService.getCategoryById(req.params.id)

    if (!category) {
      errorResponse(res, '分类不存在', 404)
      return
    }

    successResponse(res, category)
  } catch (error) {
    logger.error('获取分类详情失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取分类详情失败')
  }
}

/**
 * 创建分类
 * POST /api/knowledge/categories
 */
export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, icon, sortOrder, parentId } = req.body

    if (!name?.trim()) {
      errorResponse(res, '分类名称不能为空', 400)
      return
    }

    const category = await knowledgeService.createCategory({
      name: name.trim(),
      description,
      icon,
      sortOrder,
      parentId,
    })

    successResponse(res, category, '分类创建成功')
  } catch (error) {
    logger.error('创建分类失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '创建分类失败')
  }
}

/**
 * 更新分类
 * PUT /api/knowledge/categories/:id
 */
export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, icon, sortOrder, parentId, isActive } = req.body

    const category = await knowledgeService.updateCategory(req.params.id, {
      name, description, icon, sortOrder, parentId, isActive,
    })

    successResponse(res, category, '分类更新成功')
  } catch (error) {
    logger.error('更新分类失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '更新分类失败')
  }
}

/**
 * 删除分类
 * DELETE /api/knowledge/categories/:id
 */
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    await knowledgeService.deleteCategory(req.params.id)
    successResponse(res, null, '分类删除成功')
  } catch (error) {
    logger.error('删除分类失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '删除分类失败', 400)
  }
}

/**
 * 获取文章列表
 * GET /api/knowledge/articles
 */
export async function getArticles(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user
    const { categoryId, tag, search, isPublished, authorId } = req.query
    const { page, limit } = parsePagination(req.query as Record<string, unknown>)

    const result = await knowledgeService.getArticles(
      {
        page,
        limit,
        categoryId: categoryId as string,
        tag: tag as string,
        search: search as string,
        isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
        authorId: authorId as string,
      },
      user?.id,
      user?.role === UserRole.ADMIN
    )

    successResponse(res, result)
  } catch (error) {
    logger.error('获取文章列表失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取文章列表失败')
  }
}

/**
 * 获取热门文章
 * GET /api/knowledge/articles/hot
 */
export async function getHotArticles(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5
    const articles = await knowledgeService.getHotArticles(limit)
    successResponse(res, articles)
  } catch (error) {
    logger.error('获取热门文章失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取热门文章失败')
  }
}

/**
 * 获取最近更新文章
 * GET /api/knowledge/articles/recent
 */
export async function getRecentArticles(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5
    const articles = await knowledgeService.getRecentArticles(limit)
    successResponse(res, articles)
  } catch (error) {
    logger.error('获取最近文章失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取最近文章失败')
  }
}

/**
 * 获取文章详情
 * GET /api/knowledge/articles/:id
 */
export async function getArticleById(req: Request, res: Response): Promise<void> {
  try {
    const article = await knowledgeService.getArticleById(req.params.id, req.user?.id, true)

    if (!article) {
      errorResponse(res, '文章不存在或无权访问', 404)
      return
    }

    successResponse(res, article)
  } catch (error) {
    logger.error('获取文章详情失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取文章详情失败')
  }
}

/**
 * 创建文章
 * POST /api/knowledge/articles
 */
export async function createArticle(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { title, content, summary, categoryId, tags, attachments, isPublished } = req.body

    if (!title?.trim()) {
      errorResponse(res, '文章标题不能为空', 400)
      return
    }
    if (!content?.trim()) {
      errorResponse(res, '文章内容不能为空', 400)
      return
    }
    if (!categoryId) {
      errorResponse(res, '请选择分类', 400)
      return
    }

    const article = await knowledgeService.createArticle(
      {
        title: title.trim(),
        content: content.trim(),
        summary,
        categoryId,
        tags,
        attachments,
        isPublished,
      },
      user.id
    )

    successResponse(res, article, '文章创建成功')
  } catch (error) {
    logger.error('创建文章失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '创建文章失败')
  }
}

/**
 * 更新文章
 * PUT /api/knowledge/articles/:id
 */
export async function updateArticle(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { title, content, summary, categoryId, tags, attachments, isPublished } = req.body

    const article = await knowledgeService.updateArticle(
      req.params.id,
      { title, content, summary, categoryId, tags, attachments, isPublished },
      user.id,
      user.role === UserRole.ADMIN
    )

    successResponse(res, article, '文章更新成功')
  } catch (error) {
    logger.error('更新文章失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '更新文章失败', 400)
  }
}

/**
 * 删除文章
 * DELETE /api/knowledge/articles/:id
 */
export async function deleteArticle(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    await knowledgeService.deleteArticle(req.params.id, user.id, user.role === UserRole.ADMIN)
    successResponse(res, null, '文章删除成功')
  } catch (error) {
    logger.error('删除文章失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '删除文章失败', 400)
  }
}

/**
 * 提交反馈
 * POST /api/knowledge/articles/:id/feedback
 */
export async function submitFeedback(req: Request, res: Response): Promise<void> {
  try {
    const user = requireAuth(req, res)
    if (!user) return

    const { isHelpful, comment } = req.body

    if (isHelpful === undefined) {
      errorResponse(res, '请提供反馈内容', 400)
      return
    }

    const feedback = await knowledgeService.submitFeedback({
      articleId: req.params.id,
      userId: user.id,
      isHelpful,
      comment,
    })

    successResponse(res, feedback, '反馈提交成功')
  } catch (error) {
    logger.error('提交反馈失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '提交反馈失败')
  }
}

/**
 * 搜索文章
 * GET /api/knowledge/search
 */
export async function searchArticles(req: Request, res: Response): Promise<void> {
  try {
    const { q, limit = '20' } = req.query

    if (!q || typeof q !== 'string') {
      errorResponse(res, '请输入搜索关键词', 400)
      return
    }

    const articles = await knowledgeService.searchArticles(q, parseInt(limit as string, 10))
    successResponse(res, articles)
  } catch (error) {
    logger.error('搜索文章失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '搜索文章失败')
  }
}

/**
 * 获取所有标签
 * GET /api/knowledge/tags
 */
export async function getAllTags(_req: Request, res: Response): Promise<void> {
  try {
    const tags = await knowledgeService.getAllTags()
    successResponse(res, tags)
  } catch (error) {
    logger.error('获取标签列表失败', { error: getErrorMessage(error) })
    errorResponse(res, getErrorMessage(error) || '获取标签列表失败')
  }
}
