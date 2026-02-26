import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { Building2, Mail, Phone, BadgeCheck, Calendar, Shield, FileText, CheckCircle, Edit2, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { User as UserType } from '@/types';
import { ROLE_CONFIG } from '../config/roleConfig';
import { usersApi, UserStats, UserApproval } from '@/services/users';
import { Application, ApplicationStatus } from '@/types';

interface UserDetailProps {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (user: UserType) => void;
  onToggleStatus: (user: UserType) => void;
  onResetPassword: (user: UserType) => void;
}

// 申请状态映射
const STATUS_MAP: Record<ApplicationStatus, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  PENDING_FACTORY: { label: '厂长审批中', color: 'bg-yellow-100 text-yellow-700' },
  PENDING_DIRECTOR: { label: '总监审批中', color: 'bg-blue-100 text-blue-700' },
  PENDING_MANAGER: { label: '经理审批中', color: 'bg-purple-100 text-purple-700' },
  PENDING_CEO: { label: 'CEO审批中', color: 'bg-orange-100 text-orange-700' },
  APPROVED: { label: '已批准', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
  ARCHIVED: { label: '已归档', color: 'bg-gray-100 text-gray-500' },
};

// 数据缓存类型
interface DataCache {
  userId: string;
  stats: UserStats | null;
  applications: Application[];
  approvals: UserApproval[];
  applicationsTotal: number;
  approvalsTotal: number;
}

function UserDetailComponent({
  user,
  open,
  onOpenChange,
  onEdit,
  onToggleStatus,
  onResetPassword,
}: UserDetailProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [statusLoading, setStatusLoading] = useState(false);

  // 使用ref缓存数据，避免重复请求
  const dataCacheRef = useRef<DataCache | null>(null);

  // 统计数据状态
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsInitialized, setStatsInitialized] = useState(false);

  // 申请记录状态
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [applicationsInitialized, setApplicationsInitialized] = useState(false);

  // 审批记录状态
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [approvalsPage, setApprovalsPage] = useState(1);
  const [approvalsTotal, setApprovalsTotal] = useState(0);
  const [approvalsInitialized, setApprovalsInitialized] = useState(false);

  // 重置缓存当用户变化时
  useEffect(() => {
    if (user?.id && dataCacheRef.current?.userId !== user.id) {
      dataCacheRef.current = null;
      setStats(null);
      setStatsInitialized(false);
      setApplications([]);
      setApplicationsInitialized(false);
      setApprovals([]);
      setApprovalsInitialized(false);
      setStatsError(null);
      setApplicationsError(null);
      setApprovalsError(null);
    }
  }, [user?.id]);

  // 预加载所有数据（模态框打开时）
  useEffect(() => {
    if (user?.id && open) {
      // 并行加载所有数据
      loadStats();
      loadApplications();
      loadApprovals();
    }
  }, [user?.id, open]);

  // 页码变化时重新加载
  useEffect(() => {
    if (user?.id && open && applicationsInitialized) {
      loadApplications();
    }
  }, [applicationsPage]);

  useEffect(() => {
    if (user?.id && open && approvalsInitialized) {
      loadApprovals();
    }
  }, [approvalsPage]);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;

    // 如果有缓存且未强制刷新，直接使用缓存
    if (dataCacheRef.current?.userId === user.id && dataCacheRef.current.stats) {
      setStats(dataCacheRef.current.stats);
      setStatsInitialized(true);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await usersApi.getUserStats(user.id);
      if (response.success) {
        setStats(response.data);
        // 更新缓存
        if (!dataCacheRef.current || dataCacheRef.current.userId !== user.id) {
          dataCacheRef.current = {
            userId: user.id,
            stats: response.data,
            applications: [],
            approvals: [],
            applicationsTotal: 0,
            approvalsTotal: 0,
          };
        } else {
          dataCacheRef.current.stats = response.data;
        }
      }
    } catch (error) {
      setStatsError('加载统计数据失败');
      console.error('加载用户统计数据失败:', error);
    } finally {
      setStatsLoading(false);
      setStatsInitialized(true);
    }
  }, [user?.id]);

  const loadApplications = useCallback(async () => {
    if (!user?.id) return;

    setApplicationsLoading(true);
    setApplicationsError(null);
    try {
      const response = await usersApi.getUserApplications(user.id, applicationsPage, 10);
      if (response.success) {
        setApplications(response.data.items);
        setApplicationsTotal(response.data.pagination.total);
        // 更新缓存
        if (!dataCacheRef.current || dataCacheRef.current.userId !== user.id) {
          dataCacheRef.current = {
            userId: user.id,
            stats: null,
            applications: response.data.items,
            approvals: [],
            applicationsTotal: response.data.pagination.total,
            approvalsTotal: 0,
          };
        } else {
          dataCacheRef.current.applications = response.data.items;
          dataCacheRef.current.applicationsTotal = response.data.pagination.total;
        }
      }
    } catch (error) {
      setApplicationsError('加载申请记录失败');
      console.error('加载用户申请记录失败:', error);
    } finally {
      setApplicationsLoading(false);
      setApplicationsInitialized(true);
    }
  }, [user?.id, applicationsPage]);

  const loadApprovals = useCallback(async () => {
    if (!user?.id) return;

    setApprovalsLoading(true);
    setApprovalsError(null);
    try {
      const response = await usersApi.getUserApprovals(user.id, approvalsPage, 10);
      if (response.success) {
        setApprovals(response.data.items);
        setApprovalsTotal(response.data.pagination.total);
        // 更新缓存
        if (!dataCacheRef.current || dataCacheRef.current.userId !== user.id) {
          dataCacheRef.current = {
            userId: user.id,
            stats: null,
            applications: [],
            approvals: response.data.items,
            applicationsTotal: 0,
            approvalsTotal: response.data.pagination.total,
          };
        } else {
          dataCacheRef.current.approvals = response.data.items;
          dataCacheRef.current.approvalsTotal = response.data.pagination.total;
        }
      }
    } catch (error) {
      setApprovalsError('加载审批记录失败');
      console.error('加载用户审批记录失败:', error);
    } finally {
      setApprovalsLoading(false);
      setApprovalsInitialized(true);
    }
  }, [user?.id, approvalsPage]);

  if (!user) return null;

  const handleToggleStatus = async () => {
    setStatusLoading(true);
    await onToggleStatus(user);
    setStatusLoading(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return `¥${amount.toLocaleString('zh-CN')}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto p-0">
        {/* 头部区域 */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-6">
          <SheetHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-semibold">
                  {user.name?.charAt(0) || user.username?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-1">
                <SheetTitle className="text-xl text-gray-900">{user.name}</SheetTitle>
                <p className="text-gray-500 mt-1 text-sm">@{user.username}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={ROLE_CONFIG[user.role]?.color || 'default'}>
                    {ROLE_CONFIG[user.role]?.label || user.role}
                  </Badge>
                  {user.isActive !== false ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                      启用
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5" />
                      禁用
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮组 */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(user)}>
                <Edit2 className="h-4 w-4 mr-2" />
                编辑信息
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onResetPassword(user)}>
                <KeyRound className="h-4 w-4 mr-2" />
                重置密码
              </Button>
            </div>
          </SheetHeader>
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="info" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                基本信息
              </TabsTrigger>
              <TabsTrigger value="applications" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                申请记录
              </TabsTrigger>
              <TabsTrigger value="approvals" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
                审批记录
              </TabsTrigger>
            </TabsList>

            {/* 基本信息 Tab */}
            <TabsContent value="info" className="space-y-5 mt-5 transition-opacity duration-300">
              {/* 基本信息卡片 */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-blue-600" />
                  基本信息
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BadgeCheck className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">工号</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.employeeId}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-600">邮箱</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-600">部门</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.department || '-'}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Phone className="h-4 w-4 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-600">电话</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 账号状态卡片 */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  账号状态
                </h4>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user.isActive !== false ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Shield className={`h-5 w-5 ${user.isActive !== false ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">账号启用状态</p>
                      <p className="text-xs text-gray-500">
                        {user.isActive !== false ? '账号正常，可以登录系统' : '账号已禁用，无法登录系统'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={user.isActive !== false}
                    disabled={statusLoading}
                    onCheckedChange={handleToggleStatus}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>

              {/* 统计信息卡片 - 带平滑过渡 */}
              <div className={cn(
                "bg-gray-50 rounded-xl p-5 transition-opacity duration-300",
                statsLoading && !statsInitialized && "opacity-100"
              )}>
                {!statsInitialized && statsLoading ? (
                  <>
                    <Skeleton className="h-4 w-24 mb-4" />
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  </>
                ) : statsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{statsError}</AlertDescription>
                  </Alert>
                ) : stats ? (
                  <>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      活动统计
                      {statsLoading && (
                        <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-auto" />
                      )}
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                        <p className="text-xl font-bold text-blue-600">{stats.applicationCount}</p>
                        <p className="text-xs text-gray-500 mt-1">总申请</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                        <p className="text-xl font-bold text-green-600">{stats.approvedCount}</p>
                        <p className="text-xs text-gray-500 mt-1">已批准</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                        <p className="text-xl font-bold text-red-600">{stats.rejectedCount}</p>
                        <p className="text-xs text-gray-500 mt-1">已拒绝</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl text-center shadow-sm">
                        <p className="text-xl font-bold text-orange-600">{stats.approvalCount}</p>
                        <p className="text-xs text-gray-500 mt-1">审批次数</p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* 系统信息卡片 */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  系统信息
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="text-gray-600">创建时间</span>
                    </div>
                    <span className="font-medium text-gray-900">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</span>
                  </div>
                  {user.updatedAt && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="text-gray-600">更新时间</span>
                      </div>
                      <span className="font-medium text-gray-900">{new Date(user.updatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 申请记录 Tab */}
            <TabsContent value="applications" className="mt-6 transition-opacity duration-300">
              <div className={cn("relative", applicationsLoading && "opacity-70")}>
                {!applicationsInitialized && applicationsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : applicationsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{applicationsError}</AlertDescription>
                  </Alert>
                ) : applications.length === 0 ? (
                  <Empty className="py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileText className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>暂无申请记录</EmptyTitle>
                      <EmptyDescription>该用户还没有提交过申请</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>申请编号</TableHead>
                            <TableHead>标题</TableHead>
                            <TableHead>金额</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>提交时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app) => (
                            <TableRow key={app.id}>
                              <TableCell className="font-mono text-xs">{app.applicationNo}</TableCell>
                              <TableCell className="max-w-[150px] truncate" title={app.title}>{app.title}</TableCell>
                              <TableCell>{formatAmount(app.amount)}</TableCell>
                              <TableCell>
                                <Badge className={STATUS_MAP[app.status]?.color || 'bg-gray-100'}>
                                  {STATUS_MAP[app.status]?.label || app.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">{formatDate(app.createdAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {applicationsLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {applicationsTotal > 10 && (
                      <div className="flex justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={applicationsPage === 1 || applicationsLoading}
                          onClick={() => setApplicationsPage(p => Math.max(1, p - 1))}
                        >
                          上一页
                        </Button>
                        <span className="text-sm text-gray-600 py-2">
                          第 {applicationsPage} 页，共 {Math.ceil(applicationsTotal / 10)} 页
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={applicationsPage >= Math.ceil(applicationsTotal / 10) || applicationsLoading}
                          onClick={() => setApplicationsPage(p => p + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 审批记录 Tab */}
            <TabsContent value="approvals" className="mt-6 transition-opacity duration-300">
              <div className={cn("relative", approvalsLoading && "opacity-70")}>
                {!approvalsInitialized && approvalsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : approvalsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{approvalsError}</AlertDescription>
                  </Alert>
                ) : approvals.length === 0 ? (
                  <Empty className="py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CheckCircle className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>暂无审批记录</EmptyTitle>
                      <EmptyDescription>该用户还没有审批过申请</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>申请编号</TableHead>
                            <TableHead>申请标题</TableHead>
                            <TableHead>操作</TableHead>
                            <TableHead>级别</TableHead>
                            <TableHead>审批时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvals.map((approval) => (
                            <TableRow key={approval.id}>
                              <TableCell className="font-mono text-xs">{approval.application?.applicationNo}</TableCell>
                              <TableCell className="max-w-[150px] truncate" title={approval.application?.title}>
                                {approval.application?.title}
                              </TableCell>
                              <TableCell>
                                <Badge className={approval.action === 'APPROVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                  {approval.action === 'APPROVE' ? '批准' : '拒绝'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {approval.level === 'FACTORY' && '厂长'}
                                  {approval.level === 'DIRECTOR' && '总监'}
                                  {approval.level === 'MANAGER' && '经理'}
                                  {approval.level === 'CEO' && 'CEO'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">{formatDate(approval.createdAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {approvalsLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {approvalsTotal > 10 && (
                      <div className="flex justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={approvalsPage === 1 || approvalsLoading}
                          onClick={() => setApprovalsPage(p => Math.max(1, p - 1))}
                        >
                          上一页
                        </Button>
                        <span className="text-sm text-gray-600 py-2">
                          第 {approvalsPage} 页，共 {Math.ceil(approvalsTotal / 10)} 页
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={approvalsPage >= Math.ceil(approvalsTotal / 10) || approvalsLoading}
                          onClick={() => setApprovalsPage(p => p + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const UserDetail = memo(UserDetailComponent);
