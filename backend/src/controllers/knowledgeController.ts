import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { knowledgeService } from '../services/knowledgeService';
import logger from '../lib/logger';

/**
 * 获取分类列表
 * GET /api/knowledge/categories
 */
export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await knowledgeService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('获取分类列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取分类列表失败',
    });
  }
}

/**
 * 获取分类详情
 * GET /api/knowledge/categories/:id
 */
export async function getCategoryById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const category = await knowledgeService.getCategoryById(id);

    if (!category) {
      res.status(404).json({
        success: false,
        error: '分类不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error('获取分类详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取分类详情失败',
    });
  }
}

/**
 * 创建分类
 * POST /api/knowledge/categories
 */
export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, icon, sortOrder, parentId } = req.body;

    if (!name?.trim()) {
      res.status(400).json({
        success: false,
        error: '分类名称不能为空',
      });
      return;
    }

    const category = await knowledgeService.createCategory({
      name: name.trim(),
      description,
      icon,
      sortOrder,
      parentId,
    });

    res.status(201).json({
      success: true,
      data: category,
      message: '分类创建成功',
    });
  } catch (error) {
    logger.error('创建分类失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建分类失败',
    });
  }
}

/**
 * 更新分类
 * PUT /api/knowledge/categories/:id
 */
export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, icon, sortOrder, parentId, isActive } = req.body;

    const category = await knowledgeService.updateCategory(id, {
      name,
      description,
      icon,
      sortOrder,
      parentId,
      isActive,
    });

    res.json({
      success: true,
      data: category,
      message: '分类更新成功',
    });
  } catch (error) {
    logger.error('更新分类失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新分类失败',
    });
  }
}

/**
 * 删除分类
 * DELETE /api/knowledge/categories/:id
 */
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await knowledgeService.deleteCategory(id);

    res.json({
      success: true,
      message: '分类删除成功',
    });
  } catch (error) {
    logger.error('删除分类失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '删除分类失败',
    });
  }
}

/**
 * 获取文章列表
 * GET /api/knowledge/articles
 */
export async function getArticles(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const {
      page = '1',
      limit = '20',
      categoryId,
      tag,
      search,
      isPublished,
      authorId,
    } = req.query;

    const result = await knowledgeService.getArticles(
      {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        categoryId: categoryId as string,
        tag: tag as string,
        search: search as string,
        isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
        authorId: authorId as string,
      },
      user?.id,
      user?.role === UserRole.ADMIN
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('获取文章列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文章列表失败',
    });
  }
}

/**
 * 获取热门文章
 * GET /api/knowledge/articles/hot
 */
export async function getHotArticles(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '5' } = req.query;
    const articles = await knowledgeService.getHotArticles(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    logger.error('获取热门文章失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取热门文章失败',
    });
  }
}

/**
 * 获取最近更新文章
 * GET /api/knowledge/articles/recent
 */
export async function getRecentArticles(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '5' } = req.query;
    const articles = await knowledgeService.getRecentArticles(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    logger.error('获取最近文章失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取最近文章失败',
    });
  }
}

/**
 * 获取文章详情
 * GET /api/knowledge/articles/:id
 */
export async function getArticleById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user;

    const article = await knowledgeService.getArticleById(id, user?.id, true);

    if (!article) {
      res.status(404).json({
        success: false,
        error: '文章不存在或无权访问',
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    logger.error('获取文章详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文章详情失败',
    });
  }
}

/**
 * 创建文章
 * POST /api/knowledge/articles
 */
export async function createArticle(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: '未登录',
      });
      return;
    }

    const { title, content, summary, categoryId, tags, attachments, isPublished } = req.body;

    if (!title?.trim()) {
      res.status(400).json({
        success: false,
        error: '文章标题不能为空',
      });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({
        success: false,
        error: '文章内容不能为空',
      });
      return;
    }

    if (!categoryId) {
      res.status(400).json({
        success: false,
        error: '请选择分类',
      });
      return;
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
    );

    res.status(201).json({
      success: true,
      data: article,
      message: '文章创建成功',
    });
  } catch (error) {
    logger.error('创建文章失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建文章失败',
    });
  }
}

/**
 * 更新文章
 * PUT /api/knowledge/articles/:id
 */
export async function updateArticle(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: '未登录',
      });
      return;
    }

    const { id } = req.params;
    const { title, content, summary, categoryId, tags, attachments, isPublished } = req.body;

    const article = await knowledgeService.updateArticle(
      id,
      {
        title,
        content,
        summary,
        categoryId,
        tags,
        attachments,
        isPublished,
      },
      user.id,
      user.role === UserRole.ADMIN
    );

    res.json({
      success: true,
      data: article,
      message: '文章更新成功',
    });
  } catch (error) {
    logger.error('更新文章失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '更新文章失败',
    });
  }
}

/**
 * 删除文章
 * DELETE /api/knowledge/articles/:id
 */
export async function deleteArticle(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: '未登录',
      });
      return;
    }

    const { id } = req.params;
    await knowledgeService.deleteArticle(id, user.id, user.role === UserRole.ADMIN);

    res.json({
      success: true,
      message: '文章删除成功',
    });
  } catch (error) {
    logger.error('删除文章失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '删除文章失败',
    });
  }
}

/**
 * 提交反馈
 * POST /api/knowledge/articles/:id/feedback
 */
export async function submitFeedback(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: '未登录',
      });
      return;
    }

    const { id } = req.params;
    const { isHelpful, comment } = req.body;

    if (isHelpful === undefined) {
      res.status(400).json({
        success: false,
        error: '请提供反馈内容',
      });
      return;
    }

    const feedback = await knowledgeService.submitFeedback({
      articleId: id,
      userId: user.id,
      isHelpful,
      comment,
    });

    res.json({
      success: true,
      data: feedback,
      message: '反馈提交成功',
    });
  } catch (error) {
    logger.error('提交反馈失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '提交反馈失败',
    });
  }
}

/**
 * 搜索文章
 * GET /api/knowledge/search
 */
export async function searchArticles(req: Request, res: Response): Promise<void> {
  try {
    const { q, limit = '20' } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: '请输入搜索关键词',
      });
      return;
    }

    const articles = await knowledgeService.searchArticles(
      q,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    logger.error('搜索文章失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '搜索文章失败',
    });
  }
}

/**
 * 获取所有标签
 * GET /api/knowledge/tags
 */
export async function getAllTags(_req: Request, res: Response): Promise<void> {
  try {
    const tags = await knowledgeService.getAllTags();

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    logger.error('获取标签列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取标签列表失败',
    });
  }
}
