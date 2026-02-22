import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  FileText,
  Pin,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { logger } from '@/lib/logger';
import { AnnouncementType } from '@/types';
import {
  announcementsApi,
  announcementTypeLabels,
  type Attachment,
} from '@/services/announcements';
import { departmentApi, type Department } from '@/services/departments';

// 富文本编辑器工具栏
function EditorToolbar({ onCommand }: { onCommand: (command: string, value?: string) => void }) {
  return (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('bold')}
        className="font-bold"
      >
        B
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('italic')}
        className="italic"
      >
        I
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('underline')}
        className="underline"
      >
        U
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-2" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('insertUnorderedList')}
      >
        • 列表
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('insertOrderedList')}
      >
        1. 列表
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-2" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('justifyLeft')}
      >
        左对齐
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onCommand('justifyCenter')}
      >
        居中
      </Button>
    </div>
  );
}

export default function AnnouncementFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  // 表单数据
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnouncementType>(AnnouncementType.COMPANY);
  const [isTop, setIsTop] = useState(false);
  const [validFrom, setValidFrom] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [targetDepts, setTargetDepts] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // 使用 ref 替代 getElementById
  const editorRef = useRef<HTMLDivElement>(null);

  // 加载编辑数据
  useEffect(() => {
    if (!id) {
      // 新建时设置默认生效时间为当前时间
      setValidFrom(new Date().toISOString().slice(0, 16));
      return;
    }

    const loadAnnouncement = async () => {
      setLoading(true);
      try {
        const res = await announcementsApi.getAnnouncement(id);
        if (res.success) {
          const data = res.data;
          setTitle(data.title);
          setContent(data.content);
          setType(data.type);
          setIsTop(data.isTop);
          setValidFrom(new Date(data.validFrom).toISOString().slice(0, 16));
          if (data.validUntil) {
            setValidUntil(new Date(data.validUntil).toISOString().slice(0, 16));
          }
          if (data.targetDepts) {
            setTargetDepts(data.targetDepts);
          }
          if (data.attachments) {
            setAttachments(data.attachments);
          }
        }
      } catch (error) {
        toast.error('加载公告数据失败');
        navigate('/announcements');
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncement();
  }, [id, navigate]);

  // 加载部门列表
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await departmentApi.getDepartments();
        if (res.success) {
          setDepartments(res.data);
        }
      } catch (error) {
        logger.error('加载部门列表失败', { error });
      }
    };

    loadDepartments();
  }, []);

  // 富文本命令 - 使用 ref 替代 getElementById
  const handleEditorCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // 更新内容
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // 处理内容变化
  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // 处理附件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 这里应该调用上传API，简化处理使用URL.createObjectURL
    // 实际项目中应该上传到服务器
    const mockUrl = URL.createObjectURL(file);
    setAttachments([...attachments, {
      name: file.name,
      url: mockUrl,
      size: file.size,
    }]);
    toast.success('文件已添加');

    // 重置input
    e.target.value = '';
  };

  // 删除附件
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // 处理部门选择
  const handleDeptChange = (deptId: string) => {
    if (targetDepts.includes(deptId)) {
      setTargetDepts(targetDepts.filter(id => id !== deptId));
    } else {
      setTargetDepts([...targetDepts, deptId]);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('请输入公告标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入公告内容');
      return;
    }
    if (!validFrom) {
      toast.error('请选择生效时间');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        type,
        isTop,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        targetDepts: targetDepts.length > 0 ? targetDepts : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      if (isEditing && id) {
        const res = await announcementsApi.updateAnnouncement(id, data);
        if (res.success) {
          toast.success('公告更新成功');
          navigate(`/announcements/${id}`);
        }
      } else {
        const res = await announcementsApi.createAnnouncement(data);
        if (res.success) {
          toast.success('公告发布成功');
          navigate('/announcements');
        }
      }
    } catch (error) {
      toast.error(isEditing ? '更新失败' : '发布失败');
    } finally {
      setSaving(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border p-12 text-center">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={() => navigate('/announcements')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? '编辑公告' : '发布公告'}
            </h1>
            <div className="w-24" /> {/* 占位 */}
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 space-y-6">
                {/* 标题 */}
                <div>
                  <Label htmlFor="title">公告标题 *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="请输入公告标题"
                    className="mt-1"
                  />
                </div>

                {/* 类型和置顶 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="type">公告类型 *</Label>
                    <Select value={type} onValueChange={(v) => setType(v as AnnouncementType)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择公告类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(AnnouncementType).map((t) => (
                          <SelectItem key={t} value={t}>
                            {announcementTypeLabels[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isTop"
                        checked={isTop}
                        onCheckedChange={setIsTop}
                      />
                      <Label htmlFor="isTop" className="flex items-center gap-2 cursor-pointer">
                        <Pin className="w-4 h-4" />
                        置顶公告
                      </Label>
                    </div>
                  </div>
                </div>

                {/* 有效期 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="validFrom">生效时间 *</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="validFrom"
                        type="datetime-local"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="validUntil">过期时间（可选）</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="validUntil"
                        type="datetime-local"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* 目标部门 */}
                <div>
                  <Label>目标部门（可选）</Label>
                  <div className="mt-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {departments.map((dept) => (
                        <label
                          key={dept.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={targetDepts.includes(dept.id)}
                            onChange={() => handleDeptChange(dept.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    不选择则对所有部门可见
                  </p>
                </div>

                {/* 富文本内容 */}
                <div>
                  <Label htmlFor="content">公告内容 *</Label>
                  <div className="mt-1 border rounded-lg overflow-hidden">
                    <EditorToolbar onCommand={handleEditorCommand} />
                    <div
                      id="content-editor"
                      ref={editorRef}
                      contentEditable
                      className="p-4 min-h-[200px] outline-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                      onInput={handleContentChange}
                      style={{
                        minHeight: '200px',
                        padding: '1rem',
                      }}
                    />
                  </div>
                </div>

                {/* 附件 */}
                <div>
                  <Label>附件（可选）</Label>
                  <div className="mt-2 space-y-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div>
                      <label className="cursor-pointer inline-block">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            添加附件
                          </span>
                        </Button>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        支持上传文档、图片等文件
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部操作 */}
              <div className="p-6 border-t bg-gray-50 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/announcements')}
                  disabled={saving}
                >
                  取消
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? '保存修改' : '立即发布'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </main>
    </>
  );
}
