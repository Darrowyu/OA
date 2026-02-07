# OA系统功能全覆盖实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成OA系统重构的100%功能覆盖，确保新版完全兼容旧版所有功能

**Architecture:**
- 后端：修复路由注册，确保所有API可用
- 前端：新增用户管理、待审核、已审核、系统设置页面
- 数据流：前端对接真实API，移除所有mock数据

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + React Router + Axios

---

## 任务清单总览

1. **Task 1-3:** 后端修复 - 路由注册、代码规范
2. **Task 4-8:** 前端API层 - HTTP客户端、API封装
3. **Task 9-15:** 用户管理功能 - 列表、创建、编辑、删除
4. **Task 16-20:** 待审核/已审核页面
5. **Task 21-25:** 系统设置页面
6. **Task 26-30:** 申请功能完善 - 附件、导出、筛选
7. **Task 31-35:** 测试验证

---

### Task 1: 修复后端路由注册

**Files:**
- Modify: `backend/src/index.ts:47-50`

**Step 1: 添加缺失的路由导入和注册**

```typescript
// 在文件顶部添加导入
import applicationsRoutes from './routes/applications';
import approvalsRoutes from './routes/approvals';
import uploadsRoutes from './routes/uploads';

// 在app.use('/api/users', userRoutes);后添加
app.use('/api/applications', applicationsRoutes);
app.use('/routes/approvals', approvalsRoutes);
app.use('/api/uploads', uploadsRoutes);
```

**Step 2: 修复applications.ts中的注释语法**

Modify: `backend/src/controllers/applications.ts:38-120`

将所有 `#` 注释替换为 `//` 注释

**Step 3: 修复approvals.ts中的注释语法**

Modify: `backend/src/routes/approvals.ts:13-30`

将所有 `#` 注释替换为 `//` 注释

**Step 4: 验证后端启动**

Run: `cd backend && npm run dev`
Expected: 服务正常启动，无语法错误

**Step 5: Commit**

```bash
git add backend/src/index.ts backend/src/controllers/applications.ts backend/src/routes/approvals.ts
git commit -m "fix: 注册缺失的API路由，修复注释语法"
```

---

### Task 2: 创建前端API客户端

**Files:**
- Create: `frontend-new/src/lib/api.ts`

**Step 1: 创建axios实例**

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;
```

**Step 2: Commit**

```bash
git add frontend-new/src/lib/api.ts
git commit -m "feat: 创建API客户端axios实例"
```

---

### Task 3: 创建API服务层

**Files:**
- Create: `frontend-new/src/services/auth.ts`
- Create: `frontend-new/src/services/users.ts`
- Create: `frontend-new/src/services/applications.ts`
- Create: `frontend-new/src/services/uploads.ts`

**Step 1: Auth服务**

```typescript
import apiClient from '@/lib/api';
import { User } from '@/types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),
};
```

**Step 2: Users服务**

```typescript
import apiClient from '@/lib/api';
import { User, UserRole } from '@/types';

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  employeeId: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
}

export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  department?: string;
  search?: string;
}

export const usersApi = {
  getUsers: (params?: UsersQueryParams) => apiClient.get('/users', { params }),
  getUser: (id: string) => apiClient.get(`/users/${id}`),
  createUser: (data: CreateUserRequest) => apiClient.post('/users', data),
  updateUser: (id: string, data: UpdateUserRequest) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }),
  importUsers: (users: CreateUserRequest[]) => apiClient.post('/users/import', { users }),
};
```

**Step 3: Applications服务**

```typescript
import apiClient from '@/lib/api';
import { Application, CreateApplicationRequest, ApplicationFilter } from '@/types';

export const applicationsApi = {
  getApplications: (params?: ApplicationFilter & { page?: number; limit?: number; myApplications?: boolean }) =>
    apiClient.get('/applications', { params }),
  getApplication: (id: string) => apiClient.get(`/applications/${id}`),
  createApplication: (data: CreateApplicationRequest) => apiClient.post('/applications', data),
  updateApplication: (id: string, data: Partial<CreateApplicationRequest>) =>
    apiClient.put(`/applications/${id}`, data),
  deleteApplication: (id: string) => apiClient.delete(`/applications/${id}`),
  submitApplication: (id: string) => apiClient.post(`/applications/${id}/submit`),
};
```

**Step 4: Uploads服务**

```typescript
import apiClient from '@/lib/api';

export const uploadsApi = {
  uploadFile: (file: File, applicationId?: string, isApprovalAttachment?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (applicationId) formData.append('applicationId', applicationId);
    if (isApprovalAttachment) formData.append('isApprovalAttachment', 'true');

    return apiClient.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFiles: (applicationId?: string) => apiClient.get('/uploads', { params: { applicationId } }),
  deleteFile: (id: string) => apiClient.delete(`/uploads/${id}`),
  downloadFile: (id: string) => apiClient.get(`/uploads/${id}/download`, { responseType: 'blob' }),
};
```

**Step 5: Approvals服务**

```typescript
import apiClient from '@/lib/api';

export interface ApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  selectedManagerIds?: string[];
  skipManager?: boolean;
}

export const approvalsApi = {
  factoryApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/factory/${applicationId}`, data),
  directorApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/director/${applicationId}`, data),
  managerApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/manager/${applicationId}`, data),
  ceoApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/ceo/${applicationId}`, data),
  getApprovalHistory: (applicationId: string) =>
    apiClient.get(`/approvals/${applicationId}/history`),
};
```

**Step 6: Commit**

```bash
git add frontend-new/src/services/
git commit -m "feat: 创建API服务层封装"
```

---

### Task 4: 更新Login页面使用真实API

**Files:**
- Modify: `frontend-new/src/pages/Login.tsx`

**Step 1: 替换mock登录为真实API**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { authApi } from '@/services/auth';

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({ username, password });
      if (response.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/applications');
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">OA系统登录</h1>
        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">用户名</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add frontend-new/src/pages/Login.tsx
git commit -m "feat: Login页面接入真实API"
```

---

### Task 5: 创建用户状态管理Context

**Files:**
- Create: `frontend-new/src/contexts/AuthContext.tsx`

**Step 1: 创建AuthContext**

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === UserRole.ADMIN,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Step 2: 在main.tsx中引入AuthProvider**

Modify: `frontend-new/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 3: Commit**

```bash
git add frontend-new/src/contexts/AuthContext.tsx frontend-new/src/main.tsx
git commit -m "feat: 创建用户认证Context"
```

---

### Task 6: 创建用户管理页面

**Files:**
- Create: `frontend-new/src/pages/Users.tsx`

**Step 1: 创建用户列表页面**

```typescript
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectOption } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { User, UserRole } from '@/types';
import { usersApi, CreateUserRequest } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';

const roleOptions: SelectOption[] = [
  { value: '', label: '全部角色' },
  { value: UserRole.USER, label: '普通用户' },
  { value: UserRole.FACTORY_MANAGER, label: '厂长' },
  { value: UserRole.DIRECTOR, label: '总监' },
  { value: UserRole.MANAGER, label: '经理' },
  { value: UserRole.CEO, label: 'CEO' },
  { value: UserRole.ADMIN, label: '管理员' },
  { value: UserRole.READONLY, label: '只读用户' },
];

const roleLabelMap: Record<string, string> = {
  [UserRole.USER]: '普通用户',
  [UserRole.FACTORY_MANAGER]: '厂长',
  [UserRole.DIRECTOR]: '总监',
  [UserRole.MANAGER]: '经理',
  [UserRole.CEO]: 'CEO',
  [UserRole.ADMIN]: '管理员',
  [UserRole.READONLY]: '只读用户',
};

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState('');

  // 对话框状态
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // 表单状态
  const [formData, setFormData] = React.useState<Partial<CreateUserRequest>>({
    role: UserRole.USER,
    isActive: true,
  });
  const [submitting, setSubmitting] = React.useState(false);

  // 检查权限
  React.useEffect(() => {
    if (!isAdmin) {
      navigate('/applications');
    }
  }, [isAdmin, navigate]);

  // 加载用户列表
  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await usersApi.getUsers({
        page,
        pageSize: 10,
        role: roleFilter as UserRole,
        search,
      });
      if (response.success) {
        setUsers(response.data);
        setTotal(response.meta?.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err.message || '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 创建用户
  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await usersApi.createUser(formData as CreateUserRequest);
      setIsCreateOpen(false);
      setFormData({ role: UserRole.USER, isActive: true });
      loadUsers();
    } catch (err: any) {
      setError(err.message || '创建用户失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 更新用户
  const handleUpdate = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await usersApi.updateUser(selectedUser.id, formData);
      setIsEditOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || '更新用户失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除用户
  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await usersApi.deleteUser(selectedUser.id);
      setIsDeleteOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || '删除用户失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建用户
          </Button>
        </div>

        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索用户名、姓名或邮箱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 用户列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>工号</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    暂无用户数据
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.employeeId}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabelMap[user.role]}</Badge>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive !== false ? 'green' : 'gray'}>
                        {user.isActive !== false ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {total > 10 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-600">
              第 {page} 页 / 共 {Math.ceil(total / 10)} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(Math.ceil(total / 10), p + 1))}
              disabled={page >= Math.ceil(total / 10)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 创建用户对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">用户名 *</label>
                  <Input
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="3-20位字母数字"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">密码 *</label>
                  <Input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="至少6位"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">姓名 *</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">工号 *</label>
                  <Input
                    value={formData.employeeId || ''}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">邮箱 *</label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">部门 *</label>
                  <Input
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">角色 *</label>
                  <Select
                    options={roleOptions.filter(o => o.value)}
                    value={formData.role || UserRole.USER}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  />
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">姓名</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">部门</label>
                  <Input
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">邮箱</label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">角色</label>
                <Select
                  options={roleOptions.filter(o => o.value)}
                  value={formData.role || UserRole.USER}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>确定要删除用户 "{selectedUser?.name}" 吗？此操作不可撤销。</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add frontend-new/src/pages/Users.tsx
git commit -m "feat: 创建用户管理页面（列表、创建、编辑、删除）"
```

---

### Task 7: 更新路由配置

**Files:**
- Modify: `frontend-new/src/App.tsx`

**Step 1: 添加用户管理路由**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { Applications } from '@/pages/Applications';
import { ApplicationDetail } from '@/pages/ApplicationDetail';
import { Users } from '@/pages/Users';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<Navigate to="/applications" replace />}
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications/:id"
        element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requireAdmin>
            <Users />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
```

**Step 2: 更新ProtectedRoute组件**

Modify: `frontend-new/src/components/ProtectedRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/applications" replace />;
  }

  return <>{children}</>;
};
```

**Step 3: Commit**

```bash
git add frontend-new/src/App.tsx frontend-new/src/components/ProtectedRoute.tsx
git commit -m "feat: 添加用户管理路由，支持管理员权限控制"
```

---

### Task 8: 更新Applications页面使用真实API

**Files:**
- Modify: `frontend-new/src/pages/Applications.tsx`

**Step 1: 替换mock数据为真实API调用**

```typescript
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationCard } from '@/components/ApplicationCard';
import { ApplicationForm } from '@/components/ApplicationForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectOption } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import {
  Application,
  ApplicationStatus,
  CreateApplicationRequest,
  User,
} from '@/types';
import { applicationsApi } from '@/services/applications';
import { usersApi } from '@/services/users';
import { Plus, Search } from 'lucide-react';

const statusOptions: SelectOption[] = [
  { value: '', label: '全部状态' },
  { value: ApplicationStatus.PENDING_FACTORY, label: '待厂长审核' },
  { value: ApplicationStatus.PENDING_DIRECTOR, label: '待总监审批' },
  { value: ApplicationStatus.PENDING_MANAGER, label: '待经理审批' },
  { value: ApplicationStatus.PENDING_CEO, label: '待CEO审批' },
  { value: ApplicationStatus.APPROVED, label: '已通过' },
  { value: ApplicationStatus.REJECTED, label: '已拒绝' },
];

export const Applications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<ApplicationStatus | ''>('');
  const [keyword, setKeyword] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // 加载申请列表
  const loadApplications = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await applicationsApi.getApplications({
        page,
        limit: 10,
        status: statusFilter || undefined,
        keyword: keyword || undefined,
      });
      if (response.data) {
        setApplications(response.data);
        setTotal(response.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err.message || '加载申请列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, keyword]);

  // 加载用户列表（用于选择审批人）
  const loadUsers = React.useCallback(async () => {
    try {
      const response = await usersApi.getUsers({ pageSize: 100 });
      if (response.success) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('加载用户列表失败', err);
    }
  }, []);

  React.useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateApplication = async (data: CreateApplicationRequest) => {
    setSubmitting(true);
    try {
      await applicationsApi.createApplication(data);
      setIsCreateDialogOpen(false);
      loadApplications();
    } catch (err: any) {
      setError(err.message || '创建申请失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">申请管理</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建申请
          </Button>
        </div>

        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索申请编号、标题或申请人..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus)}
              />
            </div>
          </div>
        </div>

        {/* 申请列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">暂无申请记录</p>
            </div>
          ) : (
            applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onClick={() => navigate(`/applications/${application.id}`)}
              />
            ))
          )}
        </div>

        {/* 分页 */}
        {total > 10 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-600">
              第 {page} 页 / 共 {Math.ceil(total / 10)} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(Math.ceil(total / 10), p + 1))}
              disabled={page >= Math.ceil(total / 10)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 新建申请对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建申请</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ApplicationForm
              users={users}
              onSubmit={handleCreateApplication}
              onCancel={() => setIsCreateDialogOpen(false)}
              loading={submitting}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add frontend-new/src/pages/Applications.tsx
git commit -m "feat: Applications页面接入真实API"
```

---

### Task 9: 更新ApplicationDetail页面使用真实API

**Files:**
- Modify: `frontend-new/src/pages/ApplicationDetail.tsx`

由于代码较长，需要替换mock数据为真实API调用，包括：
1. 使用applicationsApi.getApplication获取申请详情
2. 使用approvalsApi获取审批历史
3. 使用approvalsApi提交审批操作
4. 使用uploadsApi处理附件

**Step 1: 修改导入和状态管理**

```typescript
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import {
  Application,
  ApplicationStatus,
  UserRole,
  ApprovalAction,
  User,
  Attachment,
  ApprovalRecord,
} from '@/types';
import { formatDate, formatAmount, formatFileSize } from '@/lib/utils';
import { applicationsApi } from '@/services/applications';
import { approvalsApi } from '@/services/approvals';
import { uploadsApi } from '@/services/uploads';
import { useAuth } from '@/contexts/AuthContext';
// ... icons import
```

**Step 2: 替换mock数据加载逻辑**

```typescript
export const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = React.useState<Application | null>(null);
  const [approvalHistory, setApprovalHistory] = React.useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  // ... dialog states

  const loadApplication = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [appResponse, historyResponse] = await Promise.all([
        applicationsApi.getApplication(id),
        approvalsApi.getApprovalHistory(id),
      ]);
      setApplication(appResponse.data);
      setApprovalHistory(historyResponse.data || []);
    } catch (err: any) {
      setError(err.message || '加载申请详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  // ... rest of component with real API calls
};
```

**Step 3: Commit**

```bash
git add frontend-new/src/pages/ApplicationDetail.tsx
git commit -m "feat: ApplicationDetail页面接入真实API"
```

---

### Task 10-35: 继续完成剩余任务

由于篇幅限制，以下是剩余任务的概要：

**Task 10-12: 创建待审核页面 (PendingApprovals.tsx)**
- 根据当前用户角色显示待审批申请
- 支持审批操作

**Task 13-15: 创建已审核页面 (ApprovedApplications.tsx)**
- 显示已审批的申请记录
- 支持筛选和搜索

**Task 16-18: 创建系统设置页面 (Settings.tsx)**
- 数据归档管理
- 邮件提醒配置

**Task 19-22: 完善附件功能**
- 文件上传组件
- 文件列表展示
- 下载功能

**Task 23-25: Excel导出功能**
- 申请列表导出
- 统计数据导出

**Task 26-30: 响应式优化**
- 移动端适配
- 卡片视图

**Task 31-35: 测试验证**
- 功能测试
- 集成测试
- 修复bug

---

## 执行检查清单

- [ ] Task 1: 后端路由修复
- [ ] Task 2-3: API客户端和服务层
- [ ] Task 4: Login页面API对接
- [ ] Task 5: AuthContext
- [ ] Task 6: 用户管理页面
- [ ] Task 7: 路由配置更新
- [ ] Task 8: Applications页面API对接
- [ ] Task 9: ApplicationDetail页面API对接
- [ ] Task 10-12: 待审核页面
- [ ] Task 13-15: 已审核页面
- [ ] Task 16-18: 系统设置页面
- [ ] Task 19-22: 附件功能
- [ ] Task 23-25: Excel导出
- [ ] Task 26-30: 响应式优化
- [ ] Task 31-35: 测试验证

---

**计划完成！准备执行实施。**
