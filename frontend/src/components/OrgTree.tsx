import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DepartmentTreeNode } from '@/services/department';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
} from 'lucide-react';

interface OrgTreeProps {
  departments: DepartmentTreeNode[];
  selectedId?: string;
  onSelect?: (dept: DepartmentTreeNode) => void;
  className?: string;
}

interface TreeNodeProps {
  node: DepartmentTreeNode;
  level: number;
  selectedId?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (dept: DepartmentTreeNode) => void;
}

function TreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(node.id);
    },
    [node.id, onToggle]
  );

  const handleSelect = useCallback(() => {
    onSelect?.(node);
  }, [node, onSelect]);

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-2 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-slate-100',
          isSelected && 'bg-blue-50 hover:bg-blue-100',
          !node.isActive && 'opacity-60'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {/* 展开/折叠按钮 */}
        <button
          onClick={handleToggle}
          className={cn(
            'w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 transition-colors shrink-0',
            !hasChildren && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* 部门图标 */}
        <Building2
          className={cn(
            'w-4 h-4 shrink-0',
            isSelected ? 'text-blue-600' : 'text-slate-400'
          )}
        />

        {/* 部门名称 */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <span
            className={cn(
              'font-medium truncate text-sm',
              isSelected ? 'text-blue-700' : 'text-slate-700'
            )}
          >
            {node.name}
          </span>
        </div>

        {/* 成员数量 */}
        {node.userCount !== undefined && node.userCount > 0 && (
          <span className="flex items-center gap-0.5 shrink-0 text-xs text-slate-400">
            <Users className="w-3 h-3" />
            {node.userCount}
          </span>
        )}
      </div>

      {/* 子部门 */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function OrgTree({
  departments,
  selectedId,
  onSelect,
  className,
}: OrgTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 展开所有
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: DepartmentTreeNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };
    collectIds(departments);
    setExpandedIds(allIds);
  }, [departments]);

  // 折叠所有
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  if (departments.length === 0) {
    return (
      <div className={cn('p-4 text-center text-slate-500', className)}>
        <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">暂无部门数据</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* 操作栏 */}
      <div className="flex items-center justify-end gap-2 px-2 text-xs">
        <button
          onClick={expandAll}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          展开全部
        </button>
        <span className="text-slate-300">|</span>
        <button
          onClick={collapseAll}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          折叠全部
        </button>
      </div>

      {/* 树形结构 */}
      <div className="space-y-0.5">
        {departments.map((dept) => (
          <TreeNode
            key={dept.id}
            node={dept}
            level={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default OrgTree;
