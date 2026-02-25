import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, CreateUserRequest, UpdateUserRequest } from '@/services/users';
import { getUserFriendlyMessage } from '@/lib/error-handler';
import type { User, UserRole } from '@/types';
import { exportUsersToCSV } from '../utils/exportUsers';

export type SortField = 'username' | 'name' | 'employeeId' | 'department' | 'role' | 'isActive' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  searchKeyword: string;
  roleFilter: string;
  departmentFilter: string;
  statusFilter: string;
}

interface UserManagementState {
  // 列表数据
  users: User[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;

  // 筛选状态
  filters: Filters;

  // 分页状态
  page: number;
  pagination: Pagination;

  // 排序状态
  sortField: SortField;
  sortOrder: SortOrder;

  // 选择状态
  selectedIds: string[];

  // 对话框状态
  isFormOpen: boolean;
  isDetailOpen: boolean;
  isResetPasswordOpen: boolean;
  isImportOpen: boolean;
  selectedUser: User | null;
  formLoading: boolean;
}

interface UserManagementActions {
  // 数据加载
  loadUsers: () => Promise<void>;

  // 筛选操作
  handleSearch: () => void;
  handleReset: () => void;
  setSearchKeyword: (value: string) => void;
  setRoleFilter: (value: string) => void;
  setDepartmentFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;

  // 分页操作
  setPage: (page: number) => void;

  // 排序操作
  handleSort: (field: SortField) => void;

  // 选择操作
  setSelectedIds: (ids: string[]) => void;
  handleSelectAll: (selected: boolean) => void;

  // 对话框操作
  openCreateDialog: () => void;
  openEditDialog: (user: User) => void;
  openDetailDrawer: (user: User) => void;
  openResetPasswordDialog: (user: User) => void;
  setIsFormOpen: (open: boolean) => void;
  setIsDetailOpen: (open: boolean) => void;
  setIsResetPasswordOpen: (open: boolean) => void;
  setIsImportOpen: (open: boolean) => void;

  // CRUD 操作
  handleCreate: (data: Partial<CreateUserRequest>) => Promise<void>;
  handleEdit: (data: Partial<UpdateUserRequest>) => Promise<void>;
  handleToggleStatus: (user: User) => Promise<void>;
  handleResetPassword: (userId: string, newPassword: string) => Promise<void>;
  handleDelete: (user: User) => Promise<void>;

  // 批量操作
  handleBatchEnable: (ids: string[]) => Promise<void>;
  handleBatchDisable: (ids: string[]) => Promise<void>;
  handleBatchDelete: (ids: string[]) => Promise<void>;
  handleClearSelection: () => void;

  // 导入导出
  handleExport: () => void;
  handleImport: (data: CreateUserRequest[]) => Promise<{ success: number; failed: number; errors: Array<{ row: number; message: string }> }>;
}

export function useUserManagement(): UserManagementState & UserManagementActions {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // 列表状态
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 筛选状态
  const [searchKeyword, setSearchKeywordState] = useState('');
  const [roleFilter, setRoleFilterState] = useState('');
  const [departmentFilter, setDepartmentFilterState] = useState('');
  const [statusFilter, setStatusFilterState] = useState('');

  // 分页状态
  const [page, setPageState] = useState(1);
  const pageSize = 10;
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 对话框状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // 权限检查
  useEffect(() => {
    if (!isAdmin) {
      navigate('/approval');
    }
  }, [isAdmin, navigate]);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        pageSize,
        search: searchKeyword || undefined,
        role: (roleFilter as UserRole) || undefined,
        departmentId: departmentFilter || undefined,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
      };
      const response = await usersApi.getUsers(params);
      setUsers(response.data?.items || []);
      setPagination({
        page,
        pageSize,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.totalPages || 0,
      });
      setSelectedIds([]);
    } catch (err) {
      setError(getUserFriendlyMessage(err) || '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, roleFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [loadUsers, isAdmin]);

  // 筛选操作
  const handleSearch = useCallback(() => {
    setPageState(1);
    loadUsers();
  }, [loadUsers]);

  const handleReset = useCallback(() => {
    setSearchKeywordState('');
    setRoleFilterState('');
    setDepartmentFilterState('');
    setStatusFilterState('');
    setPageState(1);
    loadUsers();
  }, [loadUsers]);

  const setSearchKeyword = useCallback((value: string) => {
    setSearchKeywordState(value);
  }, []);

  const setRoleFilter = useCallback((value: string) => {
    setRoleFilterState(value);
    setPageState(1);
  }, []);

  const setDepartmentFilter = useCallback((value: string) => {
    setDepartmentFilterState(value);
    setPageState(1);
  }, []);

  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterState(value);
    setPageState(1);
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  // 排序处理
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  // 选择操作
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  }, [users]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // 对话框操作
  const openCreateDialog = useCallback(() => {
    setSelectedUser(null);
    setIsFormOpen(true);
  }, []);

  const openEditDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  }, []);

  const openDetailDrawer = useCallback((user: User) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  }, []);

  const openResetPasswordDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setIsResetPasswordOpen(true);
  }, []);

  // CRUD 操作
  const handleCreate = useCallback(async (data: Partial<CreateUserRequest>) => {
    setFormLoading(true);
    try {
      await usersApi.createUser(data as CreateUserRequest);
      setSuccessMessage('用户创建成功');
      setIsFormOpen(false);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getUserFriendlyMessage(err) || '创建用户失败');
    } finally {
      setFormLoading(false);
    }
  }, [loadUsers]);

  const handleEdit = useCallback(async (data: Partial<UpdateUserRequest>) => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await usersApi.updateUser(selectedUser.id, data);
      setSuccessMessage('用户信息更新成功');
      setIsFormOpen(false);
      setSelectedUser(null);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getUserFriendlyMessage(err) || '更新用户失败');
    } finally {
      setFormLoading(false);
    }
  }, [selectedUser, loadUsers]);

  const handleToggleStatus = useCallback(async (user: User) => {
    try {
      await usersApi.updateUser(user.id, { isActive: user.isActive === false });
      setSuccessMessage(user.isActive === false ? '用户已启用' : '用户已禁用');
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getUserFriendlyMessage(err) || '操作失败');
      throw err;
    }
  }, [loadUsers]);

  const handleResetPassword = useCallback(async (userId: string, newPassword: string) => {
    try {
      await usersApi.resetPassword(userId, newPassword);
      setSuccessMessage('密码重置成功');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getUserFriendlyMessage(err) || '重置失败');
      throw err;
    }
  }, []);

  const handleDelete = useCallback(async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.name}" 吗？`)) return;
    try {
      await usersApi.deleteUser(user.id);
      setSuccessMessage('用户已删除');
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(getUserFriendlyMessage(err) || '删除用户失败');
    }
  }, [loadUsers]);

  // 批量操作
  const handleBatchEnable = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => usersApi.updateUser(id, { isActive: true })));
      setSuccessMessage(`已启用 ${ids.length} 个用户`);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('批量启用失败');
      throw err;
    }
  }, [loadUsers]);

  const handleBatchDisable = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => usersApi.updateUser(id, { isActive: false })));
      setSuccessMessage(`已禁用 ${ids.length} 个用户`);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('批量禁用失败');
      throw err;
    }
  }, [loadUsers]);

  const handleBatchDelete = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => usersApi.deleteUser(id)));
      setSuccessMessage(`已删除 ${ids.length} 个用户`);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('批量删除失败');
      throw err;
    }
  }, [loadUsers]);

  // 导出Excel
  const handleExport = useCallback(() => {
    const result = exportUsersToCSV(users);

    if (result.success) {
      setSuccessMessage('导出成功');
    } else {
      setError(result.message || '导出失败');
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 3000);
  }, [users]);

  // 导入用户
  const handleImport = useCallback(async (data: CreateUserRequest[]) => {
    try {
      const response = await usersApi.importUsers(data);
      loadUsers();
      return {
        success: response.data?.summary?.success || 0,
        failed: response.data?.summary?.failed || 0,
        errors: (response.data?.errors || []).map((e: { index: number; message: string }) => ({
          row: e.index + 1,
          message: e.message,
        })),
      };
    } catch (err) {
      throw new Error(getUserFriendlyMessage(err) || '导入失败');
    }
  }, [loadUsers]);

  if (!isAdmin) {
    return {
      users: [],
      loading: false,
      error: null,
      successMessage: null,
      filters: { searchKeyword: '', roleFilter: '', departmentFilter: '', statusFilter: '' },
      page: 1,
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      sortField: 'createdAt',
      sortOrder: 'desc',
      selectedIds: [],
      isFormOpen: false,
      isDetailOpen: false,
      isResetPasswordOpen: false,
      isImportOpen: false,
      selectedUser: null,
      formLoading: false,
      loadUsers: async () => {},
      handleSearch: () => {},
      handleReset: () => {},
      setSearchKeyword: () => {},
      setRoleFilter: () => {},
      setDepartmentFilter: () => {},
      setStatusFilter: () => {},
      setPage: () => {},
      handleSort: () => {},
      setSelectedIds: () => {},
      handleSelectAll: () => {},
      openCreateDialog: () => {},
      openEditDialog: () => {},
      openDetailDrawer: () => {},
      openResetPasswordDialog: () => {},
      setIsFormOpen: () => {},
      setIsDetailOpen: () => {},
      setIsResetPasswordOpen: () => {},
      setIsImportOpen: () => {},
      handleCreate: async () => {},
      handleEdit: async () => {},
      handleToggleStatus: async () => {},
      handleResetPassword: async () => {},
      handleDelete: async () => {},
      handleBatchEnable: async () => {},
      handleBatchDisable: async () => {},
      handleBatchDelete: async () => {},
      handleClearSelection: () => {},
      handleExport: () => {},
      handleImport: async () => ({ success: 0, failed: 0, errors: [] }),
    };
  }

  return {
    users,
    loading,
    error,
    successMessage,
    filters: { searchKeyword, roleFilter, departmentFilter, statusFilter },
    page,
    pagination,
    sortField,
    sortOrder,
    selectedIds,
    isFormOpen,
    isDetailOpen,
    isResetPasswordOpen,
    isImportOpen,
    selectedUser,
    formLoading,
    loadUsers,
    handleSearch,
    handleReset,
    setSearchKeyword,
    setRoleFilter,
    setDepartmentFilter,
    setStatusFilter,
    setPage,
    handleSort,
    setSelectedIds,
    handleSelectAll,
    openCreateDialog,
    openEditDialog,
    openDetailDrawer,
    openResetPasswordDialog,
    setIsFormOpen,
    setIsDetailOpen,
    setIsResetPasswordOpen,
    setIsImportOpen,
    handleCreate,
    handleEdit,
    handleToggleStatus,
    handleResetPassword,
    handleDelete,
    handleBatchEnable,
    handleBatchDisable,
    handleBatchDelete,
    handleClearSelection,
    handleExport,
    handleImport,
  };
}
