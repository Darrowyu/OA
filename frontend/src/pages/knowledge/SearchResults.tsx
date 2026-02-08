import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowLeft,
  FileText,
  Eye,
  ThumbsUp,
  Tag,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import {
  knowledgeApi,
  type SearchArticleResult,
} from '@/services/knowledge';

// 搜索结果卡片
function SearchResultCard({
  article,
  query,
}: {
  article: SearchArticleResult;
  query: string;
}) {
  const navigate = useNavigate();

  // 去除高亮标签显示纯文本
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border p-5 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`/knowledge/articles/${article.id}`)}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h3
            className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1"
            dangerouslySetInnerHTML={{ __html: article.highlightedTitle }}
          />

          {/* 摘要 */}
          <p
            className="text-sm text-gray-500 mt-2 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: article.highlightedSummary }}
          />

          {/* 元信息 */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {article.category.name}
            </Badge>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {article.viewCount} 阅读
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {article.helpfulCount} 有帮助
            </span>
          </div>

          {/* 标签 */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {article.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {article.tags.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{article.tags.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchArticleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 执行搜索
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await knowledgeApi.searchArticles(searchTerm, 50);
      if (res.success) {
        setResults(res.data);
      }
    } catch (error) {
      toast.error('搜索失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始搜索
  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, performSearch]);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
      performSearch(searchQuery.trim());
    }
  };

  // 清除搜索
  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
    setSearchParams({});
  };

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {/* 返回按钮 */}
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => navigate('/knowledge')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回知识库
          </Button>

          {/* 搜索框 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              搜索结果
            </h1>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="搜索文章、问题或关键词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 py-6 text-lg rounded-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 搜索结果 */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
                <p className="text-gray-500">搜索中...</p>
              </div>
            ) : !searched ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">
                  输入关键词开始搜索
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  搜索文章标题、内容或标签
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">
                  未找到相关结果
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  请尝试使用其他关键词搜索
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/knowledge')}
                >
                  浏览所有文章
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    找到 <span className="font-medium text-gray-900">{results.length}</span> 条结果
                    {query && (
                      <span>
                        ，关键词：
                        <span className="font-medium text-gray-900">"{query}"</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  {results.map((article) => (
                    <SearchResultCard
                      key={article.id}
                      article={article}
                      query={query}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
