import { useState, memo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, MoreHorizontal, Pencil, Lock, Trash2, Eye, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import type { User as UserType } from '@/types';
import { ROLE_CONFIG } from '../config/roleConfig';
import { Pagination } from './Pagination';

// 排序类型
type SortField = 'username' | 'name' | 'employeeId' | 'department' | 'role' | 'isActive' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface UserTableProps {
  users: UserType[];
  loading: boolean;
  selectedIds: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSelect: (ids: string[]) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onEdit: (user: UserType) => void;
  onToggleStatus: (user: UserType) => void;
  onResetPassword: (user: UserType) => void;
  onDelete: (user: UserType) => void;
  onViewDetail: (user: UserType) => void;
}

function UserTableComponent({
  users,
  loading,
  selectedIds,
  pagination,
  sortField,
  sortOrder,
  onSelect,
  onSelectAll,
  onSort,
  onPageChange,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onDelete,
  onViewDetail,
}: UserTableProps) {
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // 保持旧数据，避免闪烁
  const [displayUsers, setDisplayUsers] = useState<UserType[]>(users);
  const [isInitialized, setIsInitialized] = useState(false);
  const prevUsersRef = useRef<UserType[]>(users);

  // 数据变化时更新显示数据
  useEffect(() => {
    if (users.length > 0 || !loading) {
      setDisplayUsers(users);
      prevUsersRef.current = users;
      if (!isInitialized) setIsInitialized(true);
    }
  }, [users, loading, isInitialized]);

  const handleToggleStatus = async (user: UserType) => {
    setStatusLoading(user.id);
    await onToggleStatus(user);
    setStatusLoading(null);
  };

  const allSelected = displayUsers.length > 0 && displayUsers.every((u) => selectedIds.includes(u.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  // 是否显示加载中遮罩（非首次加载时）
  const showLoadingOverlay = loading && isInitialized;

  // 排序图标
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="w-4 h-4 inline-block" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // 表头单元格
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  // 首次加载显示 Skeleton
  if (loading && !isInitialized) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // 数据为空显示空状态
  if (displayUsers.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <User className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>暂无用户数据</EmptyTitle>
          <EmptyDescription>当前条件下没有找到用户，请尝试调整筛选条件</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn("space-y-4 relative", showLoadingOverlay && "opacity-70")}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                  onCheckedChange={onSelectAll}
                  disabled={showLoadingOverlay}
                />
              </TableHead>
              <SortableHeader field="username">用户名</SortableHeader>
              <SortableHeader field="name">姓名</SortableHeader>
              <SortableHeader field="employeeId">工号</SortableHeader>
              <SortableHeader field="department">部门</SortableHeader>
              <SortableHeader field="role">角色</SortableHeader>
              <SortableHeader field="isActive">状态</SortableHeader>
              <SortableHeader field="createdAt">创建时间</SortableHeader>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayUsers.map((user) => (
              <TableRow key={user.id} className={selectedIds.includes(user.id) ? 'bg-blue-50/50' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelect([...selectedIds, user.id]);
                      } else {
                        onSelect(selectedIds.filter((id) => id !== user.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onViewDetail(user)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.username}
                  </button>
                </TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.employeeId}</TableCell>
                <TableCell>{user.department || '-'}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_CONFIG[user.role]?.color || 'default'}>
                    {ROLE_CONFIG[user.role]?.label || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.isActive !== false}
                      disabled={statusLoading === user.id}
                      onCheckedChange={() => handleToggleStatus(user)}
                    />
                    <span className={user.isActive !== false ? 'text-green-600' : 'text-gray-400'}>
                      {user.isActive !== false ? '启用' : '禁用'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetail(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetPassword(user)}>
                        <Lock className="mr-2 h-4 w-4" />
                        重置密码
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(user)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={onPageChange}
        disabled={showLoadingOverlay}
      />

      {/* 加载遮罩 - 非首次加载时显示 */}
      {showLoadingOverlay && (
        <div className="absolute inset-0 bg-white/30 flex items-start justify-center pt-20 z-10">
          <div className="bg-white/80 px-4 py-2 rounded-lg shadow-sm border flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            <span className="text-sm text-gray-600">加载中...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const UserTable = memo(UserTableComponent);
