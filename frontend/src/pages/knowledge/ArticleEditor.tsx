import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Eye,
  X,
  Plus,
  Upload,
  FileText,
  Tag,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import {
  knowledgeApi,
  type CategoryTreeNode,
} from '@/services/knowledge';
import { uploadsApi } from '@/services/uploads';

// 附件类型
interface Attachment {
  name: string;
  url: string;
  size: number;
}

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 加载分类和文章数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesRes] = await Promise.all([
        knowledgeApi.getCategories(),
        isEdit && id ? knowledgeApi.getArticle(id) : Promise.resolve(null),
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      if (isEdit && id) {
        // 这里应该获取文章详情来填充表单
        // 由于 getArticle 返回的是 KnowledgeArticleDetail，我们需要调整
        // 暂时使用 articles API 获取
        const articleRes = await knowledgeApi.getArticles({ limit: 1, authorId: '', isPublished: undefined });
        if (articleRes.success) {
          const article = articleRes.data.items.find((a) => a.id === id);
          if (article) {
            setTitle(article.title);
            setContent(article.content);
            setSummary(article.summary || '');
            setCategoryId(article.categoryId);
            setTags(article.tags || []);
            setAttachments(article.attachments || []);
            setIsPublished(article.isPublished);
          }
        }
      }
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // 上传附件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadsApi.uploadFile(file);
      if (res.success) {
        setAttachments([
          ...attachments,
          {
            name: file.name,
            url: res.data.path,
            size: file.size,
          },
        ]);
        toast.success('上传成功');
      }
    } catch (error) {
      toast.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 删除附件
  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // 保存文章
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请输入文章标题');
      return;
    }

    if (!content.trim()) {
      toast.error('请输入文章内容');
      return;
    }

    if (!categoryId) {
      toast.error('请选择分类');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        categoryId,
        tags,
        attachments,
        isPublished,
      };

      if (isEdit && id) {
        const res = await knowledgeApi.updateArticle(id, data);
        if (res.success) {
          toast.success('文章更新成功');
          navigate(`/knowledge/articles/${id}`);
        }
      } else {
        const res = await knowledgeApi.createArticle(data);
        if (res.success) {
          toast.success('文章创建成功');
          navigate(`/knowledge/articles/${res.data.id}`);
        }
      }
    } catch (error) {
      toast.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  // 预览文章
  const handlePreview = () => {
    // 在新标签页打开预览
    // 这里简化处理，直接保存为草稿
    toast.info('预览功能开发中');
  };

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

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/knowledge')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <h1 className="text-xl font-bold text-gray-900">
                {isEdit ? '编辑文章' : '新建文章'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                预览
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>

          {/* 表单 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 基本信息 */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                基本信息
              </h2>

              {/* 标题 */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  文章标题 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="请输入文章标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* 分类 */}
              <div className="space-y-2">
                <Label>
                  所属分类 <span className="text-red-500">*</span>
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 摘要 */}
              <div className="space-y-2">
                <Label htmlFor="summary">文章摘要</Label>
                <Textarea
                  id="summary"
                  placeholder="请输入文章摘要（选填）"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* 内容编辑 */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">文章内容</h2>
              <Textarea
                placeholder="支持 Markdown 格式

## 标题
正文内容...

**粗体文字**
*斜体文字*
`代码`
"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>

            {/* 标签 */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                标签
              </h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="输入标签后按回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 附件 */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                附件
              </h2>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="flex-1"
                />
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{attachment.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 发布设置 */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">发布文章</h2>
                  <p className="text-sm text-gray-500">
                    {isPublished
                      ? '文章将对所有用户可见'
                      : '文章将保存为草稿，仅您自己可见'}
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
