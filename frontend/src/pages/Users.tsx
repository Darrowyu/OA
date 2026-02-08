import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Pen } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { SignatureDialog } from '@/components/SignatureDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, CreateUserRequest, UpdateUserRequest } from '@/services/users';
import { User, UserRole } from '@/types';

const roleOptions = [
  { value: '', label: '全部角色' },
  { value: 'USER', label: '普通用户' },
  { value: 'FACTORY_MANAGER', label: '厂长' },
  { value: 'DIRECTOR', label: '总监' },
  { value: 'MANAGER', label: '经理' },
  { value: 'CEO', label: 'CEO' },
  { value: 'ADMIN', label: '管理员' },
  { value: 'READONLY', label: '只读用户' },
];

const roleLabelMap: Record<string, string> = {
  USER: '普通用户',
  FACTORY_MANAGER: '厂长',
  DIRECTOR: '总监',
  MANAGER: '经理',
  CEO: 'CEO',
  ADMIN: '管理员',
  READONLY: '只读用户',
};

const roleBadgeVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  USER: 'default',
  FACTORY_MANAGER: 'secondary',
  DIRECTOR: 'secondary',
  MANAGER: 'outline',
  CEO: 'destructive',
  ADMIN: 'destructive',
  READONLY: 'outline',
};

interface UserFormData {
  username: string;
  password: string;
  name: string;
  employeeId: string;
  email: string;
  department: string;
  role: UserRole;
}

const initialFormData: UserFormData = {
  username: '',
  password: '',
  name: '',
  employeeId: '',
  email: '',
  department: '',
  role: UserRole.USER,
};

export default function Users() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 对话框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // 权限检查
  useEffect(() => {
    if (!isAdmin) {
      navigate('/approval');
    }
  }, [isAdmin, navigate]);

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        pageSize,
        search: searchKeyword || undefined,
        role: (roleFilter as UserRole) || undefined,
      };
      const response = await usersApi.getUsers(params);
      const data = response as unknown as { success: boolean; data: User[]; meta: { pagination: { total: number; totalPages: number } } };
      setUsers(data.data || []);
      setTotal(data.meta?.pagination?.total || 0);
      setTotalPages(data.meta?.pagination?.totalPages || 0);
    } catch (err: any) {
      setError(err.error?.message || '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [page, pageSize, isAdmin]);

  // 搜索处理
  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  // 表单验证
  const validateForm = (isEdit: boolean = false): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {};

    if (!isEdit) {
      if (!formData.username.trim()) {
        errors.username = '请输入用户名';
      }
      if (!formData.password.trim()) {
        errors.password = '请输入密码';
      } else if (formData.password.length < 6) {
        errors.password = '密码长度至少6位';
      }
    }

    if (!formData.name.trim()) {
      errors.name = '请输入姓名';
    }
    if (!formData.employeeId.trim()) {
      errors.employeeId = '请输入工号';
    }
    if (!formData.email.trim()) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '邮箱格式不正确';
    }
    if (!formData.department.trim()) {
      errors.department = '请输入部门';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 创建用户
  const handleCreate = async () => {
    if (!validateForm()) return;

    setSubmitLoading(true);
    try {
      const data: CreateUserRequest = {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        employeeId: formData.employeeId,
      };
      await usersApi.createUser(data);
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建用户失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 编辑用户
  const handleEdit = async () => {
    if (!selectedUser || !validateForm(true)) return;

    setSubmitLoading(true);
    try {
      const data: UpdateUserRequest = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
      };
      await usersApi.updateUser(selectedUser.id, data);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || '更新用户失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 删除用户
  const handleDelete = async () => {
    if (!selectedUser) return;

    setSubmitLoading(true);
    try {
      await usersApi.deleteUser(selectedUser.id);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || '删除用户失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      employeeId: user.employeeId,
      email: user.email,
      department: user.department,
      role: user.role,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  // 打开删除对话框
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // 打开签名对话框
  const openSignatureDialog = (user: User) => {
    setSelectedUser(user);
    setIsSignatureDialogOpen(true);
  };

  // 打开创建对话框
  const openCreateDialog = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户账号和权限</p>
        </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="mb-1.5 block text-sm font-medium text-gray-700">关键词搜索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索用户名、姓名、邮箱"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <div className="w-48">
            <Label className="mb-1.5 block text-sm font-medium text-gray-700">角色筛选</Label>
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button onClick={handleSearch} className="mb-0">
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
          <Button variant="outline" onClick={() => {
            setSearchKeyword('');
            setRoleFilter('');
            setPage(1);
          }} className="mb-0">
            重置
          </Button>
          <Button onClick={openCreateDialog} className="mb-0 ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            新建用户
          </Button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>工号</TableHead>
              <TableHead>部门</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">加载中...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  暂无用户数据
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.employeeId}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariantMap[user.role] || 'default'}>
                      {roleLabelMap[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      className="h-8 w-8 p-0"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSignatureDialog(user)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                      title="设置签名"
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              共 {total} 条记录，第 {page}/{totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 创建用户对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">用户名 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="请输入用户名"
                  error={formErrors.username}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">密码 *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="请输入密码"
                  error={formErrors.password}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">姓名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入姓名"
                  error={formErrors.name}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">工号 *</Label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="请输入工号"
                  error={formErrors.employeeId}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">邮箱 *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱"
                error={formErrors.email}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">部门 *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="请输入部门"
                  error={formErrors.department}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">角色 *</Label>
                <Select
                  options={roleOptions.filter((o) => o.value !== '')}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={submitLoading}>
              {submitLoading ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">用户名</Label>
                <Input value={formData.username} disabled className="bg-gray-100" />
              </div>
              <div>
                <Label className="mb-1.5 block">工号</Label>
                <Input value={formData.employeeId} disabled className="bg-gray-100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">姓名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入姓名"
                  error={formErrors.name}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">邮箱 *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱"
                  error={formErrors.email}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">部门 *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="请输入部门"
                  error={formErrors.department}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">角色 *</Label>
                <Select
                  options={roleOptions.filter((o) => o.value !== '')}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={submitLoading}>
              {submitLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              确定要删除用户 <span className="font-medium text-gray-900">{selectedUser?.name}</span> 吗？
            </p>
            <p className="text-sm text-gray-500 mt-2">此操作不可撤销，请谨慎操作。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitLoading}>
              {submitLoading ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 签名设置对话框 */}
      <SignatureDialog
        isOpen={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        username={selectedUser?.username || ''}
      />
      </main>
    </div>
  );
}
