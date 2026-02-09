import { Building2, Search, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DepartmentTree from '@/components/DepartmentTree';
import type { DepartmentTreeNode } from '@/types';

interface DepartmentFormHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  isLoading: boolean;
}

/**
 * 部门表单头部组件
 */
export function DepartmentFormHeader({
  searchQuery,
  onSearchChange,
  onRefresh,
  onAdd,
  isLoading,
}: DepartmentFormHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        部门结构
      </h2>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="搜索部门..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-48"
          />
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          新增部门
        </Button>
      </div>
    </div>
  );
}

interface DepartmentTreeSectionProps {
  departments: DepartmentTreeNode[];
  selectedId?: string;
  onSelect: (dept: DepartmentTreeNode) => void;
  onEdit: (dept: DepartmentTreeNode) => void;
  onDelete: (dept: DepartmentTreeNode) => void;
  onAddChild: (dept: DepartmentTreeNode) => void;
}

/**
 * 部门树展示组件
 */
export function DepartmentTreeSection({
  departments,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
}: DepartmentTreeSectionProps) {
  return (
    <DepartmentTree
      departments={departments}
      selectedId={selectedId}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddChild={onAddChild}
      className="min-h-[400px]"
    />
  );
}

export default { DepartmentFormHeader, DepartmentTreeSection };
