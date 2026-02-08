import apiClient from '@/lib/api';

// 附件类型
export interface Attachment {
  name: string;
  url: string;
  size: number;
}

// 作者信息
export interface AuthorInfo {
  id: string;
  name: string;
  avatar: string | null;
  department?: string | null;
}

// 分类信息
export interface CategoryInfo {
  id: string;
  name: string;
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

// 文章类型
export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  categoryId: string;
  tags: string[];
  attachments: Attachment[];
  viewCount: number;
  helpfulCount: number;
  authorId: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: CategoryInfo;
  author: AuthorInfo;
  _count?: {
    feedbacks: number;
  };
}

// 文章详情（包含用户反馈）
export interface KnowledgeArticleDetail extends KnowledgeArticle {
  userFeedback: {
    id: string;
    isHelpful: boolean;
    comment: string | null;
  } | null;
}

// 搜索高亮文章
export interface SearchArticleResult extends KnowledgeArticle {
  highlightedTitle: string;
  highlightedSummary: string;
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

// 提交反馈请求
export interface SubmitFeedbackRequest {
  isHelpful: boolean;
  comment?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 知识库API
export const knowledgeApi = {
  // ========== 分类相关 ==========

  // 获取分类树
  getCategories: (): Promise<ApiResponse<CategoryTreeNode[]>> =>
    apiClient.get<ApiResponse<CategoryTreeNode[]>>('/knowledge/categories'),

  // 获取分类详情
  getCategory: (id: string): Promise<ApiResponse<CategoryTreeNode>> =>
    apiClient.get<ApiResponse<CategoryTreeNode>>(`/knowledge/categories/${id}`),

  // 创建分类
  createCategory: (data: CreateCategoryRequest): Promise<ApiResponse<CategoryTreeNode>> =>
    apiClient.post<ApiResponse<CategoryTreeNode>>('/knowledge/categories', data),

  // 更新分类
  updateCategory: (id: string, data: UpdateCategoryRequest): Promise<ApiResponse<CategoryTreeNode>> =>
    apiClient.put<ApiResponse<CategoryTreeNode>>(`/knowledge/categories/${id}`, data),

  // 删除分类
  deleteCategory: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<ApiResponse<void>>(`/knowledge/categories/${id}`),

  // ========== 文章相关 ==========

  // 获取文章列表
  getArticles: (params?: ArticleQueryParams): Promise<ApiResponse<PaginatedResponse<KnowledgeArticle>>> =>
    apiClient.get<ApiResponse<PaginatedResponse<KnowledgeArticle>>>('/knowledge/articles', { params }),

  // 获取热门文章
  getHotArticles: (limit?: number): Promise<ApiResponse<KnowledgeArticle[]>> =>
    apiClient.get<ApiResponse<KnowledgeArticle[]>>(`/knowledge/articles/hot`, { params: { limit } }),

  // 获取最近更新文章
  getRecentArticles: (limit?: number): Promise<ApiResponse<KnowledgeArticle[]>> =>
    apiClient.get<ApiResponse<KnowledgeArticle[]>>(`/knowledge/articles/recent`, { params: { limit } }),

  // 获取文章详情
  getArticle: (id: string): Promise<ApiResponse<KnowledgeArticleDetail>> =>
    apiClient.get<ApiResponse<KnowledgeArticleDetail>>(`/knowledge/articles/${id}`),

  // 创建文章
  createArticle: (data: CreateArticleRequest): Promise<ApiResponse<KnowledgeArticle>> =>
    apiClient.post<ApiResponse<KnowledgeArticle>>('/knowledge/articles', data),

  // 更新文章
  updateArticle: (id: string, data: UpdateArticleRequest): Promise<ApiResponse<KnowledgeArticle>> =>
    apiClient.put<ApiResponse<KnowledgeArticle>>(`/knowledge/articles/${id}`, data),

  // 删除文章
  deleteArticle: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<ApiResponse<void>>(`/knowledge/articles/${id}`),

  // ========== 反馈相关 ==========

  // 提交反馈
  submitFeedback: (articleId: string, data: SubmitFeedbackRequest): Promise<ApiResponse<void>> =>
    apiClient.post<ApiResponse<void>>(`/knowledge/articles/${articleId}/feedback`, data),

  // ========== 搜索相关 ==========

  // 搜索文章
  searchArticles: (query: string, limit?: number): Promise<ApiResponse<SearchArticleResult[]>> =>
    apiClient.get<ApiResponse<SearchArticleResult[]>>('/knowledge/search', {
      params: { q: query, limit },
    }),

  // ========== 标签相关 ==========

  // 获取所有标签
  getAllTags: (): Promise<ApiResponse<string[]>> =>
    apiClient.get<ApiResponse<string[]>>('/knowledge/tags'),
};
