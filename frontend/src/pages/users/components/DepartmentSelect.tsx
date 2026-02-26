import { useState, useMemo } from 'react';
import { Check, ChevronRight, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDepartments } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import type { Department } from '@/services/departments';

interface DepartmentSelectProps {
  value?: string;
  onChange: (value: string, department?: Department) => void;
  placeholder?: string;
  disabled?: boolean;
  showAllOption?: boolean;
}

interface DepartmentWithChildren extends Department {
  children?: DepartmentWithChildren[];
}

// 部门树节点组件
function DepartmentTreeNode({
  department,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  searchQuery,
}: {
  department: DepartmentWithChildren;
  level: number;
  selectedId?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (dept: Department) => void;
  searchQuery: string;
}) {
  const hasChildren = department.children && department.children.length > 0;
  const isExpanded = expandedIds.has(department.id);
  const isSelected = selectedId === department.id;
  const isMatch = searchQuery && department.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-gray-100',
          isSelected && 'bg-blue-50 hover:bg-blue-100',
          isMatch && !isSelected && 'bg-yellow-50'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(department)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(department.id);
            }}
          >
            <ChevronRight
              className={cn('h-3.5 w-3.5 text-gray-500 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Building2 className={cn('h-4 w-4 mr-1.5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
        <span className={cn('flex-1 text-sm', isSelected ? 'text-blue-700 font-medium' : 'text-gray-700')}>
          {department.name}
        </span>
        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {department.children!.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              department={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = '请选择部门',
  disabled,
  showAllOption,
}: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { data: departments, isLoading } = useDepartments();

  // 构建部门树
  const departmentTree = useMemo(() => {
    if (!departments) return [];
    const deptMap = new Map<string, DepartmentWithChildren>(
      departments.map((d: Department) => [d.id, { ...d, children: [] }])
    );
    const roots: DepartmentWithChildren[] = [];
    deptMap.forEach((dept: DepartmentWithChildren) => {
      if (dept.parentId && deptMap.has(dept.parentId)) {
        const parent = deptMap.get(dept.parentId);
        if (parent && parent.children) {
          parent.children.push(dept);
        }
      } else {
        roots.push(dept);
      }
    });
    return roots;
  }, [departments]);

  // 查找选中的部门
  const selectedDepartment = useMemo(() => {
    if (!value || !departments) return undefined;
    return departments.find((d: Department) => d.id === value);
  }, [value, departments]);

  // 展开包含匹配项的父节点
  const expandMatchingParents = (query: string) => {
    if (!query || !departments) return;
    const newExpanded = new Set(expandedIds);
    departments.forEach((dept: Department) => {
      if (dept.name.toLowerCase().includes(query.toLowerCase()) && dept.parentId) {
        newExpanded.add(dept.parentId);
      }
    });
    setExpandedIds(newExpanded);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    expandMatchingParents(query);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleSelect = (department: Department) => {
    onChange(department.id, department);
    setOpen(false);
    setSearchQuery('');
  };

  const handleSelectAll = () => {
    onChange('', undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || isLoading}
        >
          <span className={cn('truncate', !selectedDepartment && 'text-gray-400')}>
            {selectedDepartment?.name || (showAllOption && !value ? '全部部门' : placeholder)}
          </span>
          <Building2 className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索部门..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {showAllOption && (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100',
                !value && 'bg-blue-50'
              )}
              onClick={handleSelectAll}
            >
              <Building2 className={cn('h-4 w-4', !value ? 'text-blue-600' : 'text-gray-400')} />
              <span className={cn('flex-1 text-sm', !value ? 'text-blue-700 font-medium' : 'text-gray-700')}>
                全部部门
              </span>
              {!value && <Check className="h-4 w-4 text-blue-600" />}
            </div>
          )}
          {departmentTree.map((dept) => (
            <DepartmentTreeNode
              key={dept.id}
              department={dept}
              level={0}
              selectedId={value}
              expandedIds={expandedIds}
              onToggle={toggleExpanded}
              onSelect={handleSelect}
              searchQuery={searchQuery}
            />
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
