import { useState, memo } from 'react';
import { Building2, Mail, Phone, BadgeCheck, Calendar, Shield, FileText, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
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

// 模拟统计数据
function useUserStats(_userId: string | undefined): { data?: UserStats; isLoading: boolean } {
  // 实际项目中应该调用API获取
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
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                {user.name?.charAt(0) || user.username?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{user.name}</SheetTitle>
              <p className="text-sm text-gray-500 mt-1">@{user.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={ROLE_CONFIG[user.role]?.color || 'default'}>
                  {ROLE_CONFIG[user.role]?.label || user.role}
                </Badge>
                {user.isActive !== false ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    启用
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">
                    禁用
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(user)}>
              编辑信息
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onResetPassword(user)}>
              重置密码
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="applications">申请记录</TabsTrigger>
            <TabsTrigger value="approvals">审批记录</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">基本信息</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-16">工号</span>
                  <span className="text-sm font-medium">{user.employeeId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-16">邮箱</span>
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-16">部门</span>
                  <span className="text-sm">{user.department || '-'}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-16">电话</span>
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 账号状态 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">账号状态</h4>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">账号启用状态</p>
                    <p className="text-xs text-gray-500">
                      {user.isActive !== false ? '账号正常，可以登录系统' : '账号已禁用，无法登录系统'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={user.isActive !== false}
                  disabled={statusLoading}
                  onCheckedChange={handleToggleStatus}
                />
              </div>
            </div>

            <Separator />

            {/* 统计信息 */}
            {stats && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-500">活动统计</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-blue-600">{stats.applicationCount}</p>
                    <p className="text-xs text-gray-500">总申请数</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-green-600">{stats.approvedCount}</p>
                    <p className="text-xs text-gray-500">已批准</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-red-600">{stats.rejectedCount}</p>
                    <p className="text-xs text-gray-500">已拒绝</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-orange-600">{stats.pendingCount}</p>
                    <p className="text-xs text-gray-500">审批中</p>
                  </div>
                </div>
                {stats.lastLoginAt && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>最后登录：{new Date(stats.lastLoginAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* 系统信息 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">系统信息</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500 w-16">创建时间</span>
                  <span>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</span>
                </div>
                {user.updatedAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500 w-16">更新时间</span>
                    <span>{new Date(user.updatedAt).toLocaleString()}</span>
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
      </SheetContent>
    </Sheet>
  );
}

export const UserDetail = memo(UserDetailComponent);
