import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  User,
  Calendar,
  Tag,
  Download,
  Edit,
  Trash2,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  knowledgeApi,
  type KnowledgeArticleDetail,
} from '@/services/knowledge';

// 提取目录
function extractToc(content: string) {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = content.split('\n');

  lines.forEach((line) => {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        id: match[2].trim().toLowerCase().replace(/\s+/g, '-'),
      });
    }
  });

  return headings;
}

// 渲染 Markdown 内容为简单 HTML
function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 id="$1" class="text-lg font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 id="$1" class="text-xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function ArticleView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<KnowledgeArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 加载文章
  const loadArticle = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const res = await knowledgeApi.getArticle(id);
      if (res.success) {
        setArticle(res.data);
      }
    } catch (error) {
      toast.error('加载文章失败');
      navigate('/knowledge');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  // 检查权限
  const canEdit = article?.authorId === user?.id || user?.role === 'ADMIN';

  // 提交反馈
  const handleFeedback = async (isHelpful: boolean) => {
    if (!id || !article) return;

    setSubmitting(true);
    try {
      const res = await knowledgeApi.submitFeedback(id, { isHelpful });
      if (res.success) {
        toast.success('感谢您的反馈！');
        loadArticle();
      }
    } catch (error) {
      toast.error('提交反馈失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除文章
  const handleDelete = async () => {
    if (!id) return;

    try {
      const res = await knowledgeApi.deleteArticle(id);
      if (res.success) {
        toast.success('文章删除成功');
        navigate('/knowledge');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // 获取目录
  const toc = article ? extractToc(article.content) : [];

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        </main>
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">文章不存在或已被删除</p>
            <Button className="mt-4" onClick={() => navigate('/knowledge')}>
              返回知识库
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-5xl mx-auto">
          {/* 返回按钮 */}
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => navigate('/knowledge')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回知识库
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* 主内容区 */}
            <div className="space-y-6">
              {/* 文章头部 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border p-6"
              >
                {/* 分类和标签 */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {article.category.name}
                  </Badge>
                  {!article.isPublished && (
                    <Badge variant="outline" className="text-orange-500">
                      未发布
                    </Badge>
                  )}
                  {article.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* 标题 */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {article.title}
                </h1>

                {/* 作者信息 */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-100">
                        {article.author.name?.[0] || <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {article.author.name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          更新于 {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 统计 */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {article.viewCount} 阅读
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {article.helpfulCount} 有帮助
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                {canEdit && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/knowledge/articles/${id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                )}
              </motion.div>

              {/* 文章内容 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg border p-6"
              >
                {article.summary && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">{article.summary}</p>
                  </div>
                )}

                <div
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(article.content),
                  }}
                />
              </motion.div>

              {/* 附件 */}
              {article.attachments && article.attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-lg border p-6"
                >
                  <h3 className="text-lg font-semibold mb-4">附件</h3>
                  <div className="space-y-2">
                    {article.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {attachment.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 反馈 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg border p-6"
              >
                <h3 className="text-lg font-semibold mb-4">这篇文章对您有帮助吗？</h3>
                <div className="flex items-center gap-3">
                  {article.userFeedback ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        您已反馈：
                        {article.userFeedback.isHelpful ? '有帮助' : '无帮助'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleFeedback(true)}
                        disabled={submitting}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        有帮助
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleFeedback(false)}
                        disabled={submitting}
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        无帮助
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 目录 */}
              {toc.length > 0 && (
                <div className="bg-white rounded-lg border p-4 sticky top-4">
                  <h3 className="font-semibold text-gray-900 mb-3">目录</h3>
                  <nav className="space-y-1">
                    {toc.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`block text-sm hover:text-blue-600 transition-colors ${
                          heading.level === 2 ? 'pl-0' : 'pl-4'
                        }`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这篇文章吗？此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
