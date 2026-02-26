import { useState, useCallback } from 'react';
import { Plus, Search, Building2, AlertCircle, CheckCircle2, AlertTriangle, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDepartments } from '@/hooks/useDepartments';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { departmentApi, type Department, type DepartmentMember } from '@/services/departments';
import { DepartmentTree } from './DepartmentTree';
import { DepartmentFormDialog, type DepartmentFormData } from './DepartmentFormDialog';
import { DepartmentMembersDialog } from './DepartmentMembersDialog';
import { DeleteDepartmentDialog } from './DeleteDepartmentDialog';
import { useDepartmentTree } from '../hooks/useDepartmentTree';
import { cn } from '@/lib/utils';

// 错误提示组件
function ErrorAlert({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'error' | 'warning' | 'success';
  onClose: () => void;
}) {
  const icons = {
    error: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
  };
  const Icon = icons[type];

  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <Alert className={cn('mb-4 relative pr-10', styles[type])}>
      <Icon className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
      <button
        onClick={onClose}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}

// 部门管理组件
export function DepartmentManagement() {
  const { data: departments, isLoading, error: loadError, refetch } = useDepartments();
  const { error, showSuccess, clearError, handleApiError } = useErrorHandler();
  const [searchQuery, setSearchQuery] = useState('');
  const { departmentTree, expandedIds, matchedIds, toggleExpanded, handleSearch } = useDepartmentTree(departments);

  // 拖拽排序模式
  const [enableDrag, setEnableDrag] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // 对话框状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // 部门成员
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);

  // 搜索处理
  const onSearch = useCallback((query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  }, [handleSearch]);

  // 打开创建对话框
  const openCreateDialog = useCallback(() => {
    setSelectedDepartment(null);
    clearError();
    setIsFormOpen(true);
  }, [clearError]);

  // 打开编辑对话框
  const openEditDialog = useCallback((dept: Department) => {
    setSelectedDepartment(dept);
    clearError();
    setIsFormOpen(true);
  }, [clearError]);

  // 打开删除对话框
  const openDeleteDialog = useCallback((dept: Department) => {
    setSelectedDepartment(dept);
    clearError();
    setIsDeleteOpen(true);
  }, [clearError]);

  // 查看部门成员
  const handleViewMembers = useCallback(async (dept: Department) => {
    setSelectedDepartment(dept);
    clearError();
    try {
      const response = await departmentApi.getDepartmentUsers(dept.id);
      setDepartmentMembers(response.data || []);
      setIsMembersOpen(true);
    } catch (err) {
      handleApiError(err, '获取部门成员失败');
      setDepartmentMembers([]);
      setIsMembersOpen(true);
    }
  }, [clearError, handleApiError]);

  // 提交表单
  const handleSubmit = useCallback(async (formData: DepartmentFormData) => {
    setFormLoading(true);
    clearError();
    try {
      if (selectedDepartment) {
        await departmentApi.updateDepartment(selectedDepartment.id, {
          name: formData.name,
          parentId: formData.parentId,
          description: formData.description || undefined,
        });
        showSuccess('部门更新成功');
      } else {
        await departmentApi.createDepartment({
          name: formData.name,
          code: formData.code,
          parentId: formData.parentId,
          description: formData.description || undefined,
        });
        showSuccess('部门创建成功');
      }
      setIsFormOpen(false);
      refetch();
    } catch (err: unknown) {
      const message = handleApiError(err, selectedDepartment ? '更新部门失败' : '创建部门失败');
      throw new Error(message);
    } finally {
      setFormLoading(false);
    }
  }, [selectedDepartment, clearError, showSuccess, handleApiError, refetch]);

  // 删除部门
  const handleDelete = useCallback(async () => {
    if (!selectedDepartment) return;

    try {
      await departmentApi.deleteDepartment(selectedDepartment.id);
      showSuccess('部门删除成功');
      setIsDeleteOpen(false);
      refetch();
    } catch (err) {
      handleApiError(err, '删除部门失败');
    }
  }, [selectedDepartment, showSuccess, handleApiError, refetch]);

  // 处理部门排序
  const handleReorder = useCallback(async (
    deptId: string,
    newParentId: string | null,
    newIndex: number
  ) => {
    if (!departments) return;

    setIsReordering(true);
    try {
      // 构建新的排序数据
      const items: { id: string; parentId: string | null; sortOrder: number }[] = [];

      // 找到被移动的部门
      const movedDept = departments.find(d => d.id === deptId);
      if (!movedDept) return;

      // 获取同级别的所有部门（排除被移动的）
      const siblings = departments.filter(
        d => d.parentId === newParentId && d.id !== deptId
      );

      // 按当前排序排序
      siblings.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // 插入到新位置
      siblings.splice(newIndex, 0, movedDept);

      // 构建更新数据
      siblings.forEach((dept, index) => {
        items.push({
          id: dept.id,
          parentId: newParentId,
          sortOrder: index * 10, // 间隔10，方便后续插入
        });
      });

      await departmentApi.updateDepartmentSort({ items });
      showSuccess('部门排序已更新');
      refetch();
    } catch (err) {
      handleApiError(err, '更新部门排序失败');
    } finally {
      setIsReordering(false);
    }
  }, [departments, showSuccess, handleApiError, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>加载部门数据失败: {loadError.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* 错误/成功提示 */}
      {error && (
        <ErrorAlert
          message={error.message}
          type={error.type}
          onClose={clearError}
        />
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索部门..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={enableDrag ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEnableDrag(!enableDrag)}
            disabled={!!searchQuery || isReordering}
            title={searchQuery ? '搜索模式下无法排序' : '拖拽排序'}
          >
            <GripVertical className="h-4 w-4 mr-1" />
            {enableDrag ? '完成排序' : '排序'}
          </Button>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新建部门
        </Button>
      </div>

      {/* 部门树 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <ScrollArea className="h-[500px]">
          {departmentTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Building2 className="h-12 w-12 mb-4 text-gray-300" />
              <p>暂无部门数据</p>
              <p className="text-sm text-gray-400 mt-1">点击上方按钮创建第一个部门</p>
            </div>
          ) : (
            <DepartmentTree
              departments={departmentTree}
              expandedIds={expandedIds}
              searchQuery={searchQuery}
              matchedIds={matchedIds}
              onToggle={toggleExpanded}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onViewMembers={handleViewMembers}
              onReorder={enableDrag ? handleReorder : undefined}
              enableDrag={enableDrag}
            />
          )}
        </ScrollArea>
      </div>

      {/* 创建/编辑对话框 */}
      <DepartmentFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        selectedDepartment={selectedDepartment}
        departments={departments || []}
        onSubmit={handleSubmit}
        loading={formLoading}
      />

      {/* 删除确认对话框 */}
      <DeleteDepartmentDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        department={selectedDepartment}
        onConfirm={handleDelete}
      />

      {/* 成员列表对话框 */}
      <DepartmentMembersDialog
        isOpen={isMembersOpen}
        onOpenChange={setIsMembersOpen}
        department={selectedDepartment}
        members={departmentMembers}
      />
    </div>
  );
}
