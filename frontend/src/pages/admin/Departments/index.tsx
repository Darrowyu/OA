import { useState, useMemo, useCallback } from 'react';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { useDepartments } from './hooks/useDepartments';
import { DepartmentDetail } from './components/DepartmentDetail';
import { DepartmentTree } from './components/DepartmentTree';
import { departmentApi, type CreateDepartmentRequest } from '@/services/department';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { DepartmentTreeNode } from '@/types';

// 过滤部门列表（搜索）
function useFilteredDepartments(
  departments: DepartmentTreeNode[],
  searchQuery: string
): DepartmentTreeNode[] {
  return useMemo(() => {
    if (!searchQuery.trim()) return departments;

    const filterNodes = (nodes: DepartmentTreeNode[]): DepartmentTreeNode[] => {
      return nodes
        .map((node) => {
          const matches =
            node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.code.toLowerCase().includes(searchQuery.toLowerCase());

          const filteredChildren = node.children ? filterNodes(node.children) : [];

          if (matches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter((node): node is DepartmentTreeNode => node !== null);
    };

    return filterNodes(departments);
  }, [departments, searchQuery]);
}

/**
 * 组织架构管理页面
 */
export default function Departments() {
  const {
    departments,
    selectedDept,
    members,
    isLoading,
    isMembersLoading,
    loadDepartments,
    setSelectedDept,
  } = useDepartments();

  const [searchQuery, setSearchQuery] = useState('');
  // 过滤后的部门列表（搜索用）
  const filteredDepartments = useFilteredDepartments(departments, searchQuery);

  // 对话框状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'addChild'>('add');
  const [currentDept, setCurrentDept] = useState<DepartmentTreeNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState<CreateDepartmentRequest>({
    name: '',
    code: '',
    description: '',
    parentId: null,
    managerId: null,
    sortOrder: 0,
    isActive: true,
  });

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      code: '',
      description: '',
      parentId: null,
      managerId: null,
      sortOrder: 0,
      isActive: true,
    });
    setCurrentDept(null);
  }, []);

  // 打开新增部门对话框
  const handleAdd = useCallback(() => {
    resetForm();
    setDialogMode('add');
    setIsDialogOpen(true);
  }, [resetForm]);

  // 打开编辑部门对话框
  const handleEdit = useCallback((dept: DepartmentTreeNode) => {
    setCurrentDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      parentId: dept.parentId,
      managerId: dept.managerId,
      sortOrder: dept.sortOrder,
      isActive: dept.isActive,
    });
    setDialogMode('edit');
    setIsDialogOpen(true);
  }, []);

  // 打开删除确认对话框
  const handleDelete = useCallback((dept: DepartmentTreeNode) => {
    setCurrentDept(dept);
    setIsDeleteDialogOpen(true);
  }, []);

  // 打开添加子部门对话框
  const handleAddChild = useCallback((dept: DepartmentTreeNode) => {
    resetForm();
    setCurrentDept(dept);
    setFormData((prev) => ({ ...prev, parentId: dept.id }));
    setDialogMode('addChild');
    setIsDialogOpen(true);
  }, [resetForm]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('部门名称和编码不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (dialogMode === 'add' || dialogMode === 'addChild') {
        response = await departmentApi.createDepartment(formData);
      } else {
        if (!currentDept) return;
        response = await departmentApi.updateDepartment(currentDept.id, formData);
      }

      if (response.success) {
        toast.success(
          dialogMode === 'add' || dialogMode === 'addChild' ? '部门创建成功' : '部门更新成功'
        );
        setIsDialogOpen(false);
        resetForm();
        await loadDepartments();
      } else {
        toast.error(response.error?.message || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, dialogMode, currentDept, loadDepartments, resetForm]);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!currentDept) return;

    setIsSubmitting(true);
    try {
      const response = await departmentApi.deleteDepartment(currentDept.id);
      if (response.success) {
        toast.success('部门删除成功');
        setIsDeleteDialogOpen(false);
        setCurrentDept(null);
        if (selectedDept?.id === currentDept.id) {
          setSelectedDept(null);
        }
        await loadDepartments();
      } else {
        toast.error(response.error?.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentDept, loadDepartments, selectedDept, setSelectedDept]);

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
                    <input
                      type="text"
                      placeholder="搜索部门..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1.5 border rounded-md text-sm w-48"
                    />
                  </div>
                  <button
                    onClick={loadDepartments}
                    disabled={isLoading}
                    className="p-2 border rounded-md hover:bg-gray-50"
                  >
                    🔄
                  </button>
                  <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    新增部门
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <DepartmentTree
                nodes={filteredDepartments}
                selectedId={selectedDept?.id}
                onSelect={setSelectedDept}
              />
            </CardContent>
          </Card>

          {/* 右侧：部门详情 */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">部门详情</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedDept ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{selectedDept.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(selectedDept)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAddChild(selectedDept)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                        title="添加子部门"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(selectedDept)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>编码: {selectedDept.code}</p>
                    <p>层级: {selectedDept.level}</p>
                    <p>状态: {selectedDept.isActive ? '启用' : '禁用'}</p>
                    {selectedDept.description && <p>描述: {selectedDept.description}</p>}
                  </div>
                  <DepartmentDetail
                    department={selectedDept}
                    members={members}
                    isMembersLoading={isMembersLoading}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-400 py-10">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>请选择部门查看详情</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 部门表单对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'add' && '新增部门'}
                {dialogMode === 'edit' && '编辑部门'}
                {dialogMode === 'addChild' && `添加子部门 - ${currentDept?.name}`}
              </DialogTitle>
              <DialogDescription>
                请填写部门信息，带 * 的为必填项
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    部门名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="请输入部门名称"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="code">
                    部门编码 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="请输入部门编码"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="请输入部门描述"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sortOrder">排序</Label>
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
                    placeholder="请输入排序号"
                    className="mt-1"
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除部门 "{currentDept?.name}" 吗？此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-gray-500">
                删除部门将同时删除其所有子部门，请谨慎操作。
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                {isSubmitting ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
