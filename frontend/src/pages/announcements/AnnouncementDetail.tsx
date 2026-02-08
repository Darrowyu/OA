import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Pin,
  Clock,
  Download,
  BarChart3,
  Edit3,
  Trash2,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  announcementsApi,
  announcementTypeLabels,
  announcementTypeStyles,
  type Announcement,
  type ReadStats,
} from '@/services/announcements';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReadStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 检查用户权限
  const canManage = announcement?.authorId === user?.id || user?.role === 'ADMIN';

  // 加载公告详情
  useEffect(() => {
    if (!id) return;

    const loadAnnouncement = async () => {
      try {
        const res = await announcementsApi.getAnnouncement(id);
        if (res.data.success) {
          setAnnouncement(res.data.data);
        }
      } catch (error) {
        toast.error('加载公告详情失败');
        navigate('/announcements');
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncement();
  }, [id, navigate]);

  // 加载阅读统计
  const loadStats = async () => {
    if (!id || !canManage) return;

    try {
      const res = await announcementsApi.getReadStats(id);
      if (res.data.success) {
        setStats(res.data.data);
        setShowStats(true);
      }
    } catch (error) {
      toast.error('加载统计数据失败');
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!id) return;

    try {
      const res = await announcementsApi.deleteAnnouncement(id);
      if (res.data.success) {
        toast.success('公告删除成功');
        navigate('/announcements');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // 处理编辑
  const handleEdit = () => {
    navigate(`/announcements/${id}/edit`);
  };

  // 处理返回
  const handleBack = () => {
    navigate('/announcements');
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
          <div className="bg-white rounded-lg border p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        </main>
      </>
    );
  }

  if (!announcement) {
    return (
      <>
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-lg text-gray-500">公告不存在或已被删除</p>
            <Button className="mt-4" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  <Button variant="outline" onClick={loadStats}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    阅读统计
                  </Button>
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 公告内容 */}
          <div className="bg-white rounded-lg border shadow-sm">
            {/* 标题区 */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {announcement.isTop && (
                  <Pin className="w-5 h-5 text-red-500 fill-red-100" />
                )}
                <Badge
                  variant="secondary"
                  className={announcementTypeStyles[announcement.type]}
                >
                  {announcementTypeLabels[announcement.type]}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {announcement.title}
              </h1>
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  发布人: {announcement.authorName || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  发布时间: {new Date(announcement.createdAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {announcement.viewCount} 次阅读
                </span>
              </div>
            </div>

            {/* 内容区 */}
            <div className="p-6">
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: announcement.content }}
              />
            </div>

            {/* 附件区 */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <div className="p-6 border-t bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  附件 ({announcement.attachments.length})
                </h3>
                <div className="space-y-2">
                  {announcement.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 有效期信息 */}
            {(announcement.validFrom || announcement.validUntil) && (
              <div className="p-6 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>有效期:</span>
                  <span>
                    {new Date(announcement.validFrom).toLocaleDateString()}
                  </span>
                  {announcement.validUntil && (
                    <>
                      <span>至</span>
                      <span>
                        {new Date(announcement.validUntil).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 阅读统计面板 */}
          {showStats && stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-white rounded-lg border shadow-sm"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  阅读统计
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowStats(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6">
                {/* 统计概览 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500">总人数</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.readCount}</p>
                    <p className="text-sm text-gray-500">已读</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{stats.unreadCount}</p>
                    <p className="text-sm text-gray-500">未读</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats.readRate}%</p>
                    <p className="text-sm text-gray-500">阅读率</p>
                  </div>
                </div>

                {/* 已读用户列表 */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    已读用户 ({stats.readUsers.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>部门</TableHead>
                          <TableHead>阅读时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.readUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.department}</TableCell>
                            <TableCell>
                              {new Date(user.readAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {stats.readUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-gray-500">
                              暂无已读记录
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 未读用户列表 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    未读用户 ({stats.unreadUsers.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>部门</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.unreadUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.department}</TableCell>
                          </TableRow>
                        ))}
                        {stats.unreadUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-gray-500">
                              全部已读
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除公告 "{announcement.title}" 吗？此操作不可撤销。
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
