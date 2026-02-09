import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MessageSquare,
  Calendar,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';
import { OrgTree } from '@/components/OrgTree';
import { ContactCard } from '@/components/ContactCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DepartmentTreeNode } from '@/services/department';
import { contactsApi, ContactUser } from '@/services/contacts';
import { useIsMobile } from '@/hooks/use-mobile';

// 防抖 hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 员工详情面板组件
interface ContactDetailPanelProps {
  contact: ContactUser | null;
  onClose?: () => void;
  isMobile?: boolean;
}

function ContactDetailPanel({
  contact,
  onClose,
  isMobile = false,
}: ContactDetailPanelProps) {
  // 生成头像占位符
  const getAvatarPlaceholder = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // 生成随机颜色
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600',
      'bg-teal-100 text-teal-600',
      'bg-red-100 text-red-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!contact) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <Users className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-center">选择一位员工查看详细信息</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">员工详情</h3>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="text-center">
            <div
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl mx-auto mb-4',
                getAvatarColor(contact.name)
              )}
            >
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getAvatarPlaceholder(contact.name)
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{contact.name}</h2>
            {contact.position && (
              <p className="text-gray-500 mt-1">{contact.position}</p>
            )}
            {contact.department && (
              <Badge variant="secondary" className="mt-2">
                {contact.department}
              </Badge>
            )}
          </div>

          {/* 联系信息 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              联系方式
            </h4>

            {contact.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">邮箱</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{contact.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600"
                  onClick={() => window.open(`mailto:${contact.email}`)}
                >
                  发送
                </Button>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">电话</p>
                  <p className="text-sm font-medium text-gray-900">{contact.phone}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600"
                  onClick={() => window.open(`tel:${contact.phone}`)}
                >
                  拨打
                </Button>
              </div>
            )}
          </div>

          {/* 工作信息 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              工作信息
            </h4>

            <div className="space-y-2">
              {contact.employeeId && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">工号</span>
                  <span className="text-sm font-medium text-gray-900">{contact.employeeId}</span>
                </div>
              )}
              {contact.department && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">部门</span>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {contact.department}
                  </span>
                </div>
              )}
              {contact.position && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">职位</span>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {contact.position}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.info('消息功能开发中...')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              发送消息
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.info('日程功能开发中...')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              查看日程
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// 主页面组件
function ContactsPage() {
  const isMobile = useIsMobile();

  // 状态
  const [departments, setDepartments] = useState<DepartmentTreeNode[]>([]);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentTreeNode | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [deptLoading, setDeptLoading] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // 分页状态
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // 防抖搜索
  const debouncedSearch = useDebounce(searchQuery, 300);

  // 加载部门树
  const loadDepartments = useCallback(async () => {
    setDeptLoading(true);
    try {
      const response = await contactsApi.getDepartmentTree();
      if (response.success) {
        setDepartments(response.data);
      } else {
        toast.error('加载部门数据失败');
      }
    } catch (error) {
      toast.error('加载部门数据失败');
    } finally {
      setDeptLoading(false);
    }
  }, []);

  // 加载通讯录
  const loadContacts = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const response = await contactsApi.getContacts({
          page: currentPage,
          pageSize,
          departmentId: selectedDept?.id,
          search: debouncedSearch || undefined,
        });
        if (response.success) {
          if (currentPage === 1) {
            setContacts(response.data.items);
          } else {
            setContacts((prev) => [...prev, ...response.data.items]);
          }
          setTotalPages(response.data.pagination.totalPages);
          setPage(currentPage);
        } else {
          toast.error('加载通讯录失败');
        }
      } catch (error) {
        toast.error('加载通讯录失败');
      } finally {
        setLoading(false);
      }
    },
    [selectedDept?.id, debouncedSearch]
  );

  // 初始加载
  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // 部门或搜索变化时重新加载
  useEffect(() => {
    loadContacts(1);
  }, [loadContacts]);

  // 选择部门
  const handleDeptSelect = useCallback((dept: DepartmentTreeNode) => {
    setSelectedDept(dept);
    setSelectedContact(null);
    setShowMobileDetail(false);
  }, []);

  // 选择员工
  const handleContactSelect = useCallback((contact: ContactUser) => {
    setSelectedContact(contact);
    if (isMobile) {
      setShowMobileDetail(true);
    }
  }, [isMobile]);

  // 导出通讯录
  const handleExport = useCallback(async () => {
    try {
      const blob = await contactsApi.exportContacts({
        departmentId: selectedDept?.id,
        search: debouncedSearch || undefined,
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `通讯录_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('通讯录导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  }, [selectedDept?.id, debouncedSearch]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !loading) {
      loadContacts(page + 1);
    }
  }, [page, totalPages, loading, loadContacts]);

  // 过滤后的联系人
  const filteredContacts = useMemo(() => {
    if (!debouncedSearch) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        contact.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        contact.phone?.includes(debouncedSearch)
    );
  }, [contacts, debouncedSearch]);

  // 统计
  const stats = useMemo(() => {
    return {
      total: contacts.length,
      filtered: filteredContacts.length,
    };
  }, [contacts, filteredContacts]);

  return (
    <>
      <Header />
      <main className="h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
        <div className="h-full flex">
          {/* 左侧：部门树 */}
          <AnimatePresence initial={false}>
            {!isMobile && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full border-r border-gray-200 bg-white flex flex-col"
              >
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    组织架构
                  </h2>
                </div>
                <ScrollArea className="flex-1 p-2">
                  {deptLoading ? (
                    <div className="p-4 text-center text-gray-400 text-sm">加载中...</div>
                  ) : (
                    <OrgTree
                      departments={departments}
                      selectedId={selectedDept?.id}
                      onSelect={handleDeptSelect}
                    />
                  )}
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 中间：员工列表 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 搜索栏 */}
            <div className="p-4 bg-white border-b flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索姓名、邮箱、电话..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadContacts(1)}
                disabled={loading}
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="hidden sm:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                导出
              </Button>
            </div>

            {/* 统计信息 */}
            <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-500 flex items-center justify-between">
              <span>
                {selectedDept ? (
                  <>
                    <span className="font-medium text-gray-900">{selectedDept.name}</span>
                    {' '}的联系人
                  </>
                ) : (
                  '全部联系人'
                )}
              </span>
              <span>
                共 <span className="font-medium text-gray-900">{stats.total}</span> 人
              </span>
            </div>

            {/* 联系人列表 */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {filteredContacts.length > 0 ? (
                  <>
                    {filteredContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        user={{
                          id: contact.id,
                          name: contact.name,
                          avatar: contact.avatar,
                          position: contact.position,
                          department: contact.department,
                          email: contact.email,
                          phone: contact.phone,
                          employeeId: contact.employeeId,
                        }}
                        isSelected={selectedContact?.id === contact.id}
                        onClick={() => handleContactSelect(contact)}
                      />
                    ))}

                    {/* 加载更多 */}
                    {page < totalPages && (
                      <div className="text-center py-4">
                        <Button
                          variant="ghost"
                          onClick={handleLoadMore}
                          disabled={loading}
                          className="text-gray-500"
                        >
                          {loading ? '加载中...' : '加载更多'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无联系人</p>
                    {searchQuery && (
                      <p className="text-sm mt-1">尝试调整搜索条件</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧：详情面板 */}
          {!isMobile && (
            <div className="w-80 border-l border-gray-200 bg-white">
              <ContactDetailPanel contact={selectedContact} />
            </div>
          )}
        </div>

        {/* 移动端详情抽屉 */}
        {isMobile && (
          <AnimatePresence>
            {showMobileDetail && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-50 bg-white"
              >
                <ContactDetailPanel
                  contact={selectedContact}
                  isMobile
                  onClose={() => setShowMobileDetail(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </>
  );
};

export default ContactsPage;
