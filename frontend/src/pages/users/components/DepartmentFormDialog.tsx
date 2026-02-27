import { useState, useEffect } from 'react';
import { Loader2, Building2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Department } from '@/services/departments';

// 部门表单数据
export interface DepartmentFormData {
  name: string;
  code: string;
  parentId: string | null;
  description: string;
}

interface DepartmentFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDepartment: Department | null;
  departments: Department[];
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  loading?: boolean;
}

const INITIAL_FORM_DATA: DepartmentFormData = {
  name: '',
  code: '',
  parentId: null,
  description: '',
};

export function DepartmentFormDialog({
  isOpen,
  onOpenChange,
  selectedDepartment,
  departments,
  onSubmit,
  loading,
}: DepartmentFormDialogProps) {
  const isEdit = !!selectedDepartment;
  const [formData, setFormData] = useState<DepartmentFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof DepartmentFormData, string>>>({});

  useEffect(() => {
    if (selectedDepartment) {
      setFormData({
        name: selectedDepartment.name,
        code: '', // 编辑时不修改code
        parentId: selectedDepartment.parentId,
        description: selectedDepartment.description || '',
      });
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
    setErrors({});
  }, [selectedDepartment, isOpen]);

  // 获取可选的父部门列表（排除当前部门及其子部门）
  const getParentOptions = () => {
    if (!departments) return [];

    const excludeIds = new Set<string>();
    if (selectedDepartment) {
      excludeIds.add(selectedDepartment.id);
      const addChildren = (parentId: string) => {
        departments.forEach((dept) => {
          if (dept.parentId === parentId) {
            excludeIds.add(dept.id);
            addChildren(dept.id);
          }
        });
      };
      addChildren(selectedDepartment.id);
    }

    return departments.filter((dept) => !excludeIds.has(dept.id));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DepartmentFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入部门名称';
    }

    if (!isEdit) {
      if (!formData.code.trim()) {
        newErrors.code = '请输入部门编码';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.code)) {
        newErrors.code = '部门编码只能包含字母、数字、连字符和下划线';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} closeOnOverlayClick={false}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden">
        {/* 头部 - 系统默认配色 */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                {isEdit ? (
                  <Building2 className="h-5 w-5 text-gray-700" />
                ) : (
                  <Plus className="h-5 w-5 text-gray-700" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl text-gray-900 font-semibold">
                  {isEdit ? '编辑部门' : '新建部门'}
                </DialogTitle>
                <DialogDescription className="text-gray-500 mt-0.5">
                  {isEdit ? '修改部门的基本信息' : '创建一个新的部门'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="space-y-5">
            {/* 部门名称 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                部门名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入部门名称"
                className={`h-10 ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* 部门编码（仅创建时显示） */}
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">
                  部门编码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：sales、hr、tech"
                  className={`h-10 ${errors.code ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {errors.code ? (
                  <p className="text-xs text-red-500">{errors.code}</p>
                ) : (
                  <p className="text-xs text-gray-400">只能包含字母、数字、连字符和下划线</p>
                )}
              </div>
            )}

            {/* 上级部门 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">上级部门</Label>
              <Select
                value={formData.parentId || 'root'}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === 'root' ? null : value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="选择上级部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">无（作为根部门）</SelectItem>
                  {getParentOptions().map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 部门描述 */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                部门描述
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入部门描述（可选）"
                className="h-10"
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <DialogFooter className="pt-6 mt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="min-w-[80px]"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[80px]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '保存修改' : '创建部门'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
