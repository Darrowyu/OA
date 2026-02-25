import { useState, memo } from 'react';
import { Building2, Mail, Phone, BadgeCheck, Calendar, Shield, FileText, CheckCircle, Clock, Edit2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import type { User as UserType } from '@/types';
import { ROLE_CONFIG } from '../config/roleConfig';

interface UserStats {
  applicationCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  lastLoginAt: string | null;
}

interface UserDetailProps {
  user: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (user: UserType) => void;
  onToggleStatus: (user: UserType) => void;
  onResetPassword: (user: UserType) => void;
}

function useUserStats(_userId: string | undefined): { data?: UserStats; isLoading: boolean } {
  return {
    data: {
      applicationCount: 12,
      approvedCount: 8,
      rejectedCount: 2,
      pendingCount: 2,
      lastLoginAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    isLoading: false,
  };
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
  const { data: stats } = useUserStats(user?.id);

  if (!user) return null;

  const handleToggleStatus = async () => {
    setStatusLoading(true);
    await onToggleStatus(user);
    setStatusLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto p-0">
        {/* 头部区域 - 系统默认配色 */}
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
              <TabsTrigger value="info" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                基本信息
              </TabsTrigger>
              <TabsTrigger value="applications" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                申请记录
              </TabsTrigger>
              <TabsTrigger value="approvals" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                审批记录
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-5 mt-5">
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

              {/* 统计信息卡片 */}
              {stats && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    活动统计
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
                      <p className="text-xl font-bold text-orange-600">{stats.pendingCount}</p>
                      <p className="text-xs text-gray-500 mt-1">审批中</p>
                    </div>
                  </div>
                  {stats.lastLoginAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-4 bg-white p-3 rounded-lg">
                      <Clock className="h-4 w-4" />
                      <span>最后登录：{new Date(stats.lastLoginAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

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

            <TabsContent value="applications" className="mt-6">
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>暂无申请记录</EmptyTitle>
                  <EmptyDescription>该用户还没有提交过申请</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </TabsContent>

            <TabsContent value="approvals" className="mt-6">
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CheckCircle className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>暂无审批记录</EmptyTitle>
                  <EmptyDescription>该用户还没有审批过申请</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const UserDetail = memo(UserDetailComponent);
