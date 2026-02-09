import { Prisma, KnowledgeCategory, KnowledgeFeedback } from '@prisma/client';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

// 附件类型
export interface Attachment {
  name: string;
  url: string;
  size: number;
}

// 创建分类请求
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string | null;
}

// 更新分类请求
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  parentId?: string | null;
  isActive?: boolean;
}

// 创建文章请求
export interface CreateArticleRequest {
  title: string;
  content: string;
  summary?: string;
  categoryId: string;
  tags?: string[];
  attachments?: Attachment[];
  isPublished?: boolean;
}

// 更新文章请求
export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  summary?: string;
  categoryId?: string;
  tags?: string[];
  attachments?: Attachment[];
  isPublished?: boolean;
}

// 文章查询参数
export interface ArticleQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  tag?: string;
  search?: string;
  isPublished?: boolean;
  authorId?: string;
}

// 分类树节点
export interface CategoryTreeNode {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  articleCount: number;
  children: CategoryTreeNode[];
}

// 反馈请求
export interface SubmitFeedbackRequest {
  articleId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
}

/**
 * 知识库服务
 */
export class KnowledgeService {
  /**
   * 获取分类列表（树形结构）
   */
  async getCategories(): Promise<CategoryTreeNode[]> {
    try {
      const categories = await prisma.knowledgeCategory.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { articles: { where: { isPublished: true } } },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return this.buildCategoryTree(categories);
    } catch (error) {
      logger.error('获取分类列表失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 构建分类树
   */
  private buildCategoryTree(
    categories: Array<KnowledgeCategory & { _count: { articles: number } }>,
    parentId: string | null = null
  ): CategoryTreeNode[] {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        articleCount: cat._count.articles,
        children: this.buildCategoryTree(categories, cat.id),
      }));
  }

  /**
   * 获取分类详情
   */
  async getCategoryById(id: string) {
    try {
      const category = await prisma.knowledgeCategory.findUnique({
        where: { id },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { articles: { where: { isPublished: true } } },
          },
        },
      });

      return category;
    } catch (error) {
      logger.error('获取分类详情失败', { error: error instanceof Error ? error.message : '未知错误', id });
      throw error;
    }
  }

  /**
   * 创建分类
   */
  async createCategory(data: CreateCategoryRequest) {
    try {
      const category = await prisma.knowledgeCategory.create({
        data: {
          name: data.name,
          description: data.description,
          icon: data.icon,
          sortOrder: data.sortOrder ?? 0,
          parentId: data.parentId || null,
        },
      });

      return category;
    } catch (error) {
      logger.error('创建分类失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, data: UpdateCategoryRequest) {
    try {
      const category = await prisma.knowledgeCategory.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          ...(data.parentId !== undefined && { parentId: data.parentId }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      return category;
    } catch (error) {
      logger.error('更新分类失败', { error: error instanceof Error ? error.message : '未知错误', id });
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string) {
    try {
      // 检查是否有子分类
      const childrenCount = await prisma.knowledgeCategory.count({
        where: { parentId: id },
      });

      if (childrenCount > 0) {
        throw new Error('该分类下存在子分类，无法删除');
      }

      // 检查是否有文章
      const articlesCount = await prisma.knowledgeArticle.count({
        where: { categoryId: id },
      });

      if (articlesCount > 0) {
        throw new Error('该分类下存在文章，无法删除');
      }

      await prisma.knowledgeCategory.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      logger.error('删除分类失败', { error: error instanceof Error ? error.message : '未知错误', id });
      throw error;
    }
  }

  /**
   * 获取文章列表
   */
  async getArticles(params: ArticleQueryParams, userId?: string, isAdmin?: boolean) {
    try {
      const { page = 1, limit = 20, categoryId, tag, search, isPublished, authorId } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.KnowledgeArticleWhereInput = {};

      // 分类过滤
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // 标签过滤 - 使用 array_contains
      if (tag) {
        where.tags = { array_contains: tag };
      }

      // 搜索过滤
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { tags: { array_contains: search } },
        ];
      }

      // 发布状态过滤
      if (isPublished !== undefined) {
        where.isPublished = isPublished;
      } else if (!isAdmin) {
        // 非管理员默认只看已发布
        where.isPublished = true;
      }

      // 作者过滤
      if (authorId) {
        where.authorId = authorId;
      }

      // 权限过滤：非管理员只能看到已发布或自己的文章
      if (!isAdmin && userId) {
        if (where.isPublished === undefined) {
          where.OR = [
            { isPublished: true },
            { authorId: userId },
          ];
        }
      }

      const [total, articles] = await Promise.all([
        prisma.knowledgeArticle.count({ where }),
        prisma.knowledgeArticle.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            category: {
              select: { id: true, name: true },
            },
            author: {
              select: { id: true, name: true, avatar: true },
            },
            _count: {
              select: { feedbacks: true },
            },
          },
        }),
      ]);

      return {
        items: articles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('获取文章列表失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 获取热门文章
   */
  async getHotArticles(limit: number = 5) {
    try {
      const articles = await prisma.knowledgeArticle.findMany({
        where: { isPublished: true },
        take: limit,
        orderBy: [
          { viewCount: 'desc' },
          { helpfulCount: 'desc' },
        ],
        include: {
          category: {
            select: { id: true, name: true },
          },
          author: {
            select: { id: true, name: true },
          },
        },
      });

      return articles;
    } catch (error) {
      logger.error('获取热门文章失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 获取最近更新文章
   */
  async getRecentArticles(limit: number = 5) {
    try {
      const articles = await prisma.knowledgeArticle.findMany({
        where: { isPublished: true },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          author: {
            select: { id: true, name: true },
          },
        },
      });

      return articles;
    } catch (error) {
      logger.error('获取最近更新文章失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 获取文章详情
   */
  async getArticleById(id: string, userId?: string, incrementView: boolean = true) {
    try {
      const article = await prisma.knowledgeArticle.findUnique({
        where: { id },
        include: {
          category: true,
          author: {
            select: { id: true, name: true, avatar: true, department: { select: { name: true } } },
          },
          _count: {
            select: { feedbacks: true },
          },
        },
      });

      if (!article) {
        return null;
      }

      // 检查权限：未发布的文章只有作者和管理员可见
      if (!article.isPublished && article.authorId !== userId) {
        return null;
      }

      // 增加浏览量
      if (incrementView) {
        await prisma.knowledgeArticle.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        });
      }

      // 获取用户反馈状态
      let userFeedback: KnowledgeFeedback | null = null;
      if (userId) {
        userFeedback = await prisma.knowledgeFeedback.findUnique({
          where: {
            articleId_userId: {
              articleId: id,
              userId,
            },
          },
        });
      }

      // 格式化返回数据
      const { author, ...rest } = article;
      return {
        ...rest,
        author: {
          ...author,
          department: author.department?.name || '',
        },
        userFeedback,
      };
    } catch (error) {
      logger.error('获取文章详情失败', { error: error instanceof Error ? error.message : '未知错误', id });
      throw error;
    }
  }

  /**
   * 创建文章
   */
  async createArticle(data: CreateArticleRequest, authorId: string) {
    try {
      const article = await prisma.knowledgeArticle.create({
        data: {
          title: data.title,
          content: data.content,
          summary: data.summary,
          categoryId: data.categoryId,
          tags: data.tags || [],
          attachments: (data.attachments || []) as unknown as Prisma.InputJsonValue,
          authorId,
          isPublished: data.isPublished || false,
          publishedAt: data.isPublished ? new Date() : null,
        },
        include: {
          category: true,
          author: {
            select: { id: true, name: true },
          },
        },
      });

      return article;
    } catch (error) {
      logger.error('创建文章失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(id: string, data: UpdateArticleRequest, userId: string, isAdmin: boolean = false) {
    try {
      // 检查权限
      const existing = await prisma.knowledgeArticle.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (!existing) {
        throw new Error('文章不存在');
      }

      if (existing.authorId !== userId && !isAdmin) {
        throw new Error('无权修改此文章');
      }

      const updateData: Prisma.KnowledgeArticleUpdateInput = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.attachments !== undefined) updateData.attachments = data.attachments as unknown as Prisma.InputJsonValue;
      if (data.isPublished !== undefined) {
        updateData.isPublished = data.isPublished;
        if (data.isPublished) {
          updateData.publishedAt = new Date();
        }
      }

      const article = await prisma.knowledgeArticle.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          author: {
            select: { id: true, name: true },
          },
        },
      });

      return article;
    } catch (error) {
      logger.error('更新文章失败', { error: error instanceof Error ? error.message : '未知错误', id });
      throw error;
    }
  }

  /**
   * 删除文章
   */
  async deleteArticle(id: string, userId: string, isAdmin: boolean = false) {
    try {
      // 检查权限
      const existing = await prisma.knowledgeArticle.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (!existing) {
        throw new Error('文章不存在');
      }

      if (existing.authorId !== userId && !isAdmin) {
        throw new Error('无权删除此文章');
      }

      await prisma.knowledgeArticle.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      logger.error('删除文章失败', { error: error instanceof Error ? error.message : '未知错误', id });
      throw error;
    }
  }

  /**
   * 提交反馈
   */
  async submitFeedback(data: SubmitFeedbackRequest) {
    try {
      const feedback = await prisma.knowledgeFeedback.upsert({
        where: {
          articleId_userId: {
            articleId: data.articleId,
            userId: data.userId,
          },
        },
        update: {
          isHelpful: data.isHelpful,
          comment: data.comment,
        },
        create: {
          articleId: data.articleId,
          userId: data.userId,
          isHelpful: data.isHelpful,
          comment: data.comment,
        },
      });

      // 更新文章有帮助计数
      const helpfulCount = await prisma.knowledgeFeedback.count({
        where: {
          articleId: data.articleId,
          isHelpful: true,
        },
      });

      await prisma.knowledgeArticle.update({
        where: { id: data.articleId },
        data: { helpfulCount },
      });

      return feedback;
    } catch (error) {
      logger.error('提交反馈失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 全文搜索
   */
  async searchArticles(query: string, limit: number = 20) {
    try {
      const articles = await prisma.knowledgeArticle.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { tags: { array_contains: query } },
          ],
        },
        take: limit,
        orderBy: [
          { helpfulCount: 'desc' },
          { viewCount: 'desc' },
        ],
        include: {
          category: {
            select: { id: true, name: true },
          },
          author: {
            select: { id: true, name: true },
          },
        },
      });

      // 高亮处理
      const highlightedArticles = articles.map((article) => ({
        ...article,
        highlightedTitle: this.highlightText(article.title, query),
        highlightedSummary: this.highlightText(
          article.summary || article.content.substring(0, 200) + '...',
          query
        ),
      }));

      return highlightedArticles;
    } catch (error) {
      logger.error('搜索文章失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }

  /**
   * 高亮文本
   */
  private highlightText(text: string, query: string): string {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<string[]> {
    try {
      const articles = await prisma.knowledgeArticle.findMany({
        where: { isPublished: true },
        select: { tags: true },
      });

      const tagSet = new Set<string>();
      articles.forEach((article) => {
        if (article.tags && Array.isArray(article.tags)) {
          (article.tags as string[]).forEach((tag) => tagSet.add(tag));
        }
      });

      return Array.from(tagSet).sort();
    } catch (error) {
      logger.error('获取标签列表失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw error;
    }
  }
}

export const knowledgeService = new KnowledgeService();
