import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { departmentApi } from '@/services/department';
import type { DepartmentTreeNode } from '@/types';

interface UseDepartmentsReturn {
  departments: DepartmentTreeNode[];
  selectedDept: DepartmentTreeNode | null;
  members: Array<{
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    employeeId: string;
    position?: string;
    phone?: string;
    isActive: boolean;
  }>;
  isLoading: boolean;
  isMembersLoading: boolean;
  setSelectedDept: (dept: DepartmentTreeNode | null) => void;
  loadDepartments: () => Promise<void>;
}

/**
 * 部门数据Hook
 */
export function useDepartments(): UseDepartmentsReturn {
  const [departments, setDepartments] = useState<DepartmentTreeNode[]>([]);
  const [selectedDept, setSelectedDept] = useState<DepartmentTreeNode | null>(null);
  const [members, setMembers] = useState<UseDepartmentsReturn['members']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await departmentApi.getDepartmentTree();
      if (response.success) {
        setDepartments(response.data);
      } else {
        toast.error(response.error?.message || '加载部门数据失败');
      }
    } catch {
      toast.error('加载部门数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载部门成员
  const loadMembers = useCallback(async (deptId: string) => {
    setIsMembersLoading(true);
    try {
      const response = await departmentApi.getDepartmentUsers(deptId);
      if (response.success) {
        setMembers(response.data);
      } else {
        toast.error(response.error?.message || '加载成员数据失败');
      }
    } catch {
      toast.error('加载成员数据失败');
    } finally {
      setIsMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (selectedDept) {
      loadMembers(selectedDept.id);
    } else {
      setMembers([]);
    }
  }, [selectedDept, loadMembers]);

  return {
    departments,
    selectedDept,
    members,
    isLoading,
    isMembersLoading,
    setSelectedDept,
    loadDepartments,
  };
}

export default useDepartments;
