import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  Bell,
  Plus,
  Search,
  Pin,
  Eye,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import { AnnouncementType } from '@/types';
import {
  announcementsApi,
  announcementTypeLabels,
  announcementTypeStyles,
  type Announcement,
} from '@/services/announcements';
import { useAuth } from '@/contexts/AuthContext';

// 公告类型选项
const typeOptions = [
  { value: 'all', label: '全部公告' },
  { value: AnnouncementType.COMPANY, label: announcementTypeLabels[AnnouncementType.COMPANY] },
  { value: AnnouncementType.DEPARTMENT, label: announcementTypeLabels[AnnouncementType.DEPARTMENT] },
  { value: AnnouncementType.SYSTEM, label: announcementTypeLabels[AnnouncementType.SYSTEM] },
];

// 公告卡片组件
function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  canManage,
}: {
  announcement: Announcement;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/announcements/${announcement.id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer ${
        announcement.isRead ? 'opacity-75' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* 左侧：阅读状态 */}
        <div className="flex-shrink-0 pt-1">
          {announcement.isRead ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-blue-500 fill-blue-100" />
          )}
        </div>

        {/* 中间：内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 置顶标记 */}
            {announcement.isTop && (
              <Pin className="w-4 h-4 text-red-500 fill-red-100" />
            )}
            {/* 类型标签 */}
            <Badge
              variant="secondary"
              className={announcementTypeStyles[announcement.type]}
            >
              {announcementTypeLabels[announcement.type]}
            </Badge>
            {/* 未读标记 */}
            {!announcement.isRead && (
              <Badge variant="default" className="bg-blue-500">
                未读
              </Badge>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-2 truncate group-hover:text-blue-600 transition-colors">
            {announcement.title}
          </h3>

          <p
            className="text-sm text-gray-500 mt-2 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.content) }}
          />

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(announcement.createdAt).toLocaleDateString()}
            </span>
            <span>发布人: {announcement.authorName || '-'}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {announcement.viewCount} 次阅读
            </span>
          </div>
        </div>

        {/* 右侧：操作 */}
        {canManage && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(announcement.id); }}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDelete(announcement.id); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 检查用户权限
  const canPublish = user?.role === 'ADMIN' || user?.role === 'CEO' || user?.role === 'DIRECTOR' || user?.role === 'MANAGER';
  const canManage = (announcementAuthorId: string) =>
    announcementAuthorId === user?.id || user?.role === 'ADMIN';

  // 加载公告列表
  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementsApi.getAnnouncements({
        page,
        pageSize,
        ...(selectedType !== 'all' && { type: selectedType as AnnouncementType }),
        ...(searchQuery && { search: searchQuery }),
      });

      if (res.success) {
        setAnnouncements(res.data.items);
        setTotal(res.data.total);
      }
    } catch (error) {
      toast.error('加载公告列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedType, searchQuery]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // 处理删除
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await announcementsApi.deleteAnnouncement(deleteId);
      if (res.success) {
        toast.success('公告删除成功');
        loadAnnouncements();
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  // 处理编辑
  const handleEdit = (id: string) => {
    navigate(`/announcements/${id}/edit`);
  };

  // 处理新建
  const handleCreate = () => {
    navigate('/announcements/new');
  };

  // 筛选置顶公告
  const topAnnouncements = announcements.filter((a) => a.isTop);
  const normalAnnouncements = announcements.filter((a) => !a.isTop);

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-6 h-6" />
                公告通知
              </h1>
              <p className="text-gray-500 mt-1">
                共 {total} 条公告
              </p>
            </div>
            {canPublish && (
              <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                发布公告
              </Button>
            )}
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索公告标题或内容..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="公告类型" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 公告列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900">暂无公告</p>
              <p className="text-sm text-gray-500 mt-1">
                {canPublish ? '点击上方"发布公告"按钮创建公告' : '暂无公告内容'}
              </p>
            </div>
          ) : (
            <>
              {/* 置顶公告 */}
              {topAnnouncements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    置顶公告
                  </h3>
                  <AnimatePresence>
                    {topAnnouncements.map((announcement) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        onEdit={handleEdit}
                        onDelete={(id) => {
                          setDeleteId(id);
                          setIsDeleteDialogOpen(true);
                        }}
                        canManage={canManage(announcement.authorId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* 普通公告 */}
              {normalAnnouncements.length > 0 && (
                <div className="space-y-3">
                  {topAnnouncements.length > 0 && (
                    <h3 className="text-sm font-medium text-gray-500 mt-6">
                      其他公告
                    </h3>
                  )}
                  <AnimatePresence>
                    {normalAnnouncements.map((announcement) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        onEdit={handleEdit}
                        onDelete={(id) => {
                          setDeleteId(id);
                          setIsDeleteDialogOpen(true);
                        }}
                        canManage={canManage(announcement.authorId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        {/* 分页 */}
        {total > pageSize && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 共 {total} 条
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这条公告吗？此操作不可撤销。
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
