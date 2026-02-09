import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  FolderOpen,
  TrendingUp,
  Clock,
  Eye,
  ThumbsUp,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  knowledgeApi,
  type CategoryTreeNode,
  type KnowledgeArticle,
} from '@/services/knowledge';

// 分类卡片组件
function CategoryCard({ category }: { category: CategoryTreeNode }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-lg border p-5 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`/knowledge?category=${category.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {category.articleCount} 篇文章
        </span>
        {category.children.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {category.children.length} 个子分类
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

// 文章卡片组件
function ArticleCard({ article }: { article: KnowledgeArticle }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`/knowledge/articles/${article.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {article.title}
          </h4>
          {article.summary && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {article.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {article.helpfulCount}
            </span>
            <span>{article.category.name}</span>
          </div>
          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {article.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{article.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [hotArticles, setHotArticles] = useState<KnowledgeArticle[]>([]);
  const [recentArticles, setRecentArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 检查用户权限
  const canCreate = user?.role === 'ADMIN' || user?.role === 'CEO' || user?.role === 'DIRECTOR' || user?.role === 'MANAGER';

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesRes, hotRes, recentRes] = await Promise.all([
        knowledgeApi.getCategories(),
        knowledgeApi.getHotArticles(5),
        knowledgeApi.getRecentArticles(5),
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }
      if (hotRes.success) {
        setHotArticles(hotRes.data);
      }
      if (recentRes.success) {
        setRecentArticles(recentRes.data);
      }
    } catch (error) {
      toast.error('加载知识库数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 处理新建文章
  const handleCreate = () => {
    navigate('/knowledge/articles/new');
  };

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        {/* 页面标题和搜索 */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                帮助中心
              </h1>
              <p className="text-gray-500 mt-1">
                常见问题解答、操作手册和培训资料
              </p>
            </div>
            {canCreate && (
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                新建文章
              </Button>
            )}
          </div>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="搜索文章、问题或关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                disabled={!searchQuery.trim()}
              >
                搜索
              </Button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 分类列表 */}
            {categories.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  知识分类
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>
              </section>
            )}

            {/* 热门文章 */}
            {hotArticles.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  热门文章
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* 最近更新 */}
            {recentArticles.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  最近更新
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* 空状态 */}
            {categories.length === 0 && hotArticles.length === 0 && recentArticles.length === 0 && (
              <div className="bg-white rounded-lg border p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">暂无内容</p>
                <p className="text-sm text-gray-500 mt-1">
                  {canCreate ? '点击上方"新建文章"按钮开始创建' : '管理员尚未发布帮助文档'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
