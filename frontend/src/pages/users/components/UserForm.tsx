import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect as Select } from '@/components/ui/select';
import { DepartmentSelect } from './DepartmentSelect';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { ROLE_OPTIONS } from '../config/roleConfig';

interface UserFormData {
  username: string;
  password: string;
  name: string;
  employeeId: string;
  email: string;
  departmentId: string;
  role: UserRole;
}

interface UserFormProps {
  user?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<UserFormData>) => Promise<void>;
  loading?: boolean;
}

const initialFormData: UserFormData = {
  username: '',
  password: '',
  name: '',
  employeeId: '',
  email: '',
  departmentId: '',
  role: UserRole.USER,
};

export function UserForm({ user, open, onOpenChange, onSubmit, loading }: UserFormProps) {
  const isEdit = !!user;
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        employeeId: user.employeeId,
        email: user.email,
        departmentId: user.departmentId || '',
        role: user.role,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [user, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    if (!isEdit) {
      if (!formData.username.trim()) {
        newErrors.username = '请输入用户名';
      } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username)) {
        newErrors.username = '用户名只能包含字母、数字和下划线，长度3-20位';
      }

      if (!formData.password.trim()) {
        newErrors.password = '请输入密码';
      } else if (formData.password.length < 6) {
        newErrors.password = '密码长度至少6位';
      }
    }

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = '请输入工号';
    }

    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData: Partial<UserFormData> = {
      name: formData.name,
      email: formData.email,
      departmentId: formData.departmentId || undefined,
      role: formData.role,
    };

    if (!isEdit) {
      submitData.username = formData.username;
      submitData.password = formData.password;
      submitData.employeeId = formData.employeeId;
    }

    await onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新建用户'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                用户名 {!isEdit && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名"
                disabled={isEdit}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-xs text-red-500">{errors.username}</p>
              )}
              {!isEdit && !errors.username && (
                <p className="text-xs text-gray-400">3-20位字母、数字或下划线</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                密码 {!isEdit && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEdit ? '不修改请留空' : '请输入密码'}
                disabled={isEdit}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入姓名"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">
                工号 {!isEdit && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="请输入工号"
                disabled={isEdit}
                className={errors.employeeId ? 'border-red-500' : ''}
              />
              {errors.employeeId && (
                <p className="text-xs text-red-500">{errors.employeeId}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              邮箱 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="请输入邮箱"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">部门</Label>
              <DepartmentSelect
                value={formData.departmentId}
                onChange={(id) => setFormData({ ...formData, departmentId: id })}
                placeholder="请选择部门"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                角色 <span className="text-red-500">*</span>
              </Label>
              <Select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                options={ROLE_OPTIONS}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
