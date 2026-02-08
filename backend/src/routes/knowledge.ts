import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getArticles,
  getHotArticles,
  getRecentArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  submitFeedback,
  searchArticles,
  getAllTags,
} from '../controllers/knowledgeController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 分类相关路由
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// 标签相关
router.get('/tags', getAllTags);

// 文章相关路由
router.get('/articles', getArticles);
router.get('/articles/hot', getHotArticles);
router.get('/articles/recent', getRecentArticles);
router.post('/articles', createArticle);
router.get('/articles/:id', getArticleById);
router.put('/articles/:id', updateArticle);
router.delete('/articles/:id', deleteArticle);

// 反馈路由
router.post('/articles/:id/feedback', submitFeedback);

// 搜索路由
router.get('/search', searchArticles);

export default router;
