import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Users,
  Search,
  RefreshCw,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DepartmentTreeNode, User as UserType } from '@/types';
import { departmentApi } from '@/services/department';
import { usersApi } from '@/services/users';
import DepartmentTree from '@/components/DepartmentTree';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';

// 部门表单数据
interface DepartmentFormData {
  name: string;
  code: string;
  parentId: string | null;
  managerId: string | null;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

// 部门成员
interface DepartmentMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  employeeId: string;
  position?: string;
  phone?: string;
  isActive: boolean;
}

const initialFormData: DepartmentFormData = {
  name: '',
  code: '',
  parentId: null,
  managerId: null,
  description: '',
  sortOrder: 0,
  isActive: true,
};

export const Departments: React.FC = () => {
  // 状态
  const [departments, setDepartments] = useState<DepartmentTreeNode[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentTreeNode | null>(
    null
  );
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // 对话框状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentTreeNode | null>(
    null
  );
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  // 加载部门数据
  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await departmentApi.getDepartmentTree();
      if (response.success) {
        setDepartments(response.data);
      } else {
        toast.error(response.error?.message || '加载部门数据失败');
      }
    } catch (error) {
      toast.error('加载部门数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载用户列表（用于选择负责人）
  const loadUsers = useCallback(async () => {
    try {
      const response = await usersApi.getUsers({ pageSize: 1000 });
      if (response.success) {
        setUsers(response.data.items);
      }
    } catch (error) {
      console.error('加载用户列表失败', error);
    }
  }, []);

  // 加载部门成员
  const loadMembers = useCallback(async (deptId: string) => {
    setMembersLoading(true);
    try {
      const response = await departmentApi.getDepartmentUsers(deptId);
      if (response.success) {
        setMembers(response.data);
      } else {
        toast.error(response.error?.message || '加载成员数据失败');
      }
    } catch (error) {
      toast.error('加载成员数据失败');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, [loadDepartments, loadUsers]);

  // 选择部门时加载成员
  useEffect(() => {
    if (selectedDept) {
      loadMembers(selectedDept.id);
    } else {
      setMembers([]);
    }
  }, [selectedDept, loadMembers]);

  // 打开添加表单
  const handleAdd = useCallback(() => {
    setEditingDept(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsFormOpen(true);
  }, []);

  // 打开添加子部门表单
  const handleAddChild = useCallback(
    (dept: DepartmentTreeNode) => {
      setEditingDept(null);
      setFormData({
        ...initialFormData,
        parentId: dept.id,
      });
      setFormErrors({});
      setIsFormOpen(true);
    },
    [setFormData, setFormErrors, setIsFormOpen, setEditingDept]
  );

  // 打开编辑表单
  const handleEdit = useCallback((dept: DepartmentTreeNode) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      parentId: dept.parentId,
      managerId: dept.managerId,
      description: dept.description || '',
      sortOrder: dept.sortOrder,
      isActive: dept.isActive,
    });
    setFormErrors({});
    setIsFormOpen(true);
  }, []);

  // 打开删除确认
  const handleDelete = useCallback((dept: DepartmentTreeNode) => {
    setEditingDept(dept);
    setIsDeleteOpen(true);
  }, []);

  // 选择部门
  const handleSelect = useCallback((dept: DepartmentTreeNode) => {
    setSelectedDept(dept);
  }, []);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入部门名称';
    }

    if (!formData.code.trim()) {
      errors.code = '请输入部门编码';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.code)) {
      errors.code = '编码只能包含字母、数字、连字符和下划线';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingDept) {
        // 更新
        const response = await departmentApi.updateDepartment(
          editingDept.id,
          formData
        );
        if (response.success) {
          toast.success('部门更新成功');
          setIsFormOpen(false);
          loadDepartments();
          if (selectedDept?.id === editingDept.id) {
            setSelectedDept(response.data as DepartmentTreeNode);
          }
        } else {
          toast.error(response.error?.message || '更新失败');
        }
      } else {
        // 创建
        const response = await departmentApi.createDepartment(formData);
        if (response.success) {
          toast.success('部门创建成功');
          setIsFormOpen(false);
          loadDepartments();
        } else {
          toast.error(response.error?.message || '创建失败');
        }
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  }, [
    formData,
    editingDept,
    validateForm,
    loadDepartments,
    selectedDept?.id,
  ]);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!editingDept) return;

    setSubmitting(true);
    try {
      const response = await departmentApi.deleteDepartment(editingDept.id);
      if (response.success) {
        toast.success('部门删除成功');
        setIsDeleteOpen(false);
        loadDepartments();
        if (selectedDept?.id === editingDept.id) {
          setSelectedDept(null);
        }
      } else {
        toast.error(response.error?.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setSubmitting(false);
      setEditingDept(null);
    }
  }, [editingDept, loadDepartments, selectedDept?.id]);

  // 过滤部门列表（搜索）
  const filteredDepartments = React.useMemo(() => {
    if (!searchQuery.trim()) return departments;

    const filterNodes = (
      nodes: DepartmentTreeNode[]
    ): DepartmentTreeNode[] => {
      return nodes
        .map((node) => {
          const matches =
            node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.code.toLowerCase().includes(searchQuery.toLowerCase());

          const filteredChildren = node.children
            ? filterNodes(node.children)
            : [];

          if (matches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter(Boolean) as DepartmentTreeNode[];
    };

    return filterNodes(departments);
  }, [departments, searchQuery]);

  // 将部门列表转换为扁平结构（用于父部门选择）
  const flatDepartments = React.useMemo(() => {
    const result: Array<{ id: string; name: string; level: number }> = [];

    const flatten = (
      nodes: DepartmentTreeNode[]
    ) => {
      nodes.forEach((node) => {
        // 排除当前编辑的部门及其子部门（防止循环依赖）
        if (editingDept && node.id === editingDept.id) return;

        result.push({
          id: node.id,
          name: node.name,
          level: node.level,
        });

        if (node.children) {
          flatten(node.children);
        }
      });
    };

    flatten(departments);
    return result;
  }, [departments, editingDept]);

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            组织架构管理
          </h1>
          <p className="text-gray-500 mt-1">管理公司部门结构、设置部门负责人和分配人员</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：部门树 */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">部门结构</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="搜索部门..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={loadDepartments}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={cn('w-4 h-4', loading && 'animate-spin')}
                    />
                  </Button>
                  <Button onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-1" />
                    新增部门
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <DepartmentTree
                departments={filteredDepartments}
                selectedId={selectedDept?.id}
                onSelect={handleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                className="min-h-[400px]"
              />
            </CardContent>
          </Card>

          {/* 右侧：部门详情 */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">部门详情</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <AnimatePresence mode="wait">
                {selectedDept ? (
                  <motion.div
                    key={selectedDept.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* 基本信息 */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-gray-500">部门名称</Label>
                        <p className="font-medium">{selectedDept.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">部门编码</Label>
                        <p className="font-mono text-sm">{selectedDept.code}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">层级</Label>
                        <p>第 {selectedDept.level} 级</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">状态</Label>
                        <div className="mt-1">
                          {selectedDept.isActive ? (
                            <Badge variant="green">启用中</Badge>
                          ) : (
                            <Badge variant="secondary">已停用</Badge>
                          )}
                        </div>
                      </div>
                      {selectedDept.description && (
                        <div>
                          <Label className="text-gray-500">描述</Label>
                          <p className="text-sm text-gray-600">
                            {selectedDept.description}
                          </p>
                        </div>
                      )}
                      {selectedDept.manager && (
                        <div>
                          <Label className="text-gray-500">部门负责人</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{selectedDept.manager.name}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          部门成员
                          <Badge variant="secondary">{members.length}</Badge>
                        </h3>
                      </div>

                      {membersLoading ? (
                        <div className="text-center py-4 text-gray-400">
                          加载中...
                        </div>
                      ) : members.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                                {member.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {member.employeeId}
                                </p>
                              </div>
                              {!member.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  已停用
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-400">
                          暂无成员
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-gray-400"
                  >
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>选择一个部门查看详情</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 部门表单对话框 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? '编辑部门' : '新增部门'}
            </DialogTitle>
            <p className="text-sm text-gray-500">
              {editingDept
                ? '修改部门信息'
                : '创建新的部门，部门编码创建后不可修改'}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  部门名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="如：技术部"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  部门编码 <span className="text-red-500">*</span>
                  {editingDept && (
                    <span className="text-gray-400 text-xs">(不可修改)</span>
                  )}
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="如：tech"
                  disabled={!!editingDept}
                />
                {formErrors.code && (
                  <p className="text-sm text-red-500">{formErrors.code}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">上级部门</Label>
              <Select
                value={formData.parentId || '__root__'}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    parentId: value === '__root__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择上级部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">无（作为根部门）</SelectItem>
                  {flatDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {'  '.repeat(dept.level - 1)}
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">部门负责人</Label>
              <Select
                value={formData.managerId || '__none__'}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    managerId: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">暂不设置</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序序号</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">状态</Label>
                <div className="flex items-center h-10">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive" className="ml-2">
                    {formData.isActive ? '启用' : '停用'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="部门描述（可选）"
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? '保存中...'
                : editingDept
                ? '保存修改'
                : '创建部门'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <p className="text-sm text-gray-500">
              确定要删除部门 "{editingDept?.name}" 吗？此操作不可恢复。
            </p>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={submitting}
            >
              {submitting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Departments;
