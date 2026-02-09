import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DepartmentTreeNode } from '@/types';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DepartmentTreeProps {
  departments: DepartmentTreeNode[];
  selectedId?: string;
  onSelect?: (dept: DepartmentTreeNode) => void;
  onEdit?: (dept: DepartmentTreeNode) => void;
  onDelete?: (dept: DepartmentTreeNode) => void;
  onAddChild?: (dept: DepartmentTreeNode) => void;
  className?: string;
  readOnly?: boolean;
}

interface TreeNodeProps {
  node: DepartmentTreeNode;
  level: number;
  selectedId?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (dept: DepartmentTreeNode) => void;
  onEdit?: (dept: DepartmentTreeNode) => void;
  onDelete?: (dept: DepartmentTreeNode) => void;
  onAddChild?: (dept: DepartmentTreeNode) => void;
  readOnly?: boolean;
}

function TreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  readOnly,
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

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(node);
    },
    [node, onEdit]
  );

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddChild?.(node);
    },
    [node, onAddChild]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(node);
    },
    [node, onDelete]
  );

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-2 px-2 rounded-md cursor-pointer transition-colors group',
          'hover:bg-slate-100',
          isSelected && 'bg-blue-50 hover:bg-blue-100',
          !node.isActive && 'opacity-60'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
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
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-medium truncate',
                isSelected ? 'text-blue-700' : 'text-slate-700'
              )}
            >
              {node.name}
            </span>
            {!node.isActive && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded shrink-0">
                已停用
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="truncate">{node.code}</span>
            {node.userCount !== undefined && node.userCount > 0 && (
              <span className="flex items-center gap-0.5 shrink-0">
                <Users className="w-3 h-3" />
                {node.userCount}
              </span>
            )}
          </div>
        </div>

        {/* 负责人 */}
        {node.manager && (
          <span className="text-xs text-slate-500 shrink-0 hidden sm:block truncate max-w-[100px]">
            {node.manager.name}
          </span>
        )}

        {/* 操作按钮组 - 悬停时显示 */}
        {!readOnly && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={handleEdit}
              title="编辑"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={handleAddChild}
              title="添加子部门"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
              disabled={hasChildren}
              title={hasChildren ? '有子部门不可删除' : '删除'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* 子部门 */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function DepartmentTree({
  departments,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  className,
  readOnly = false,
}: DepartmentTreeProps) {
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
        <p>暂无部门数据</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* 操作栏 */}
      <div className="flex items-center justify-end gap-2 px-2">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          展开全部
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          折叠全部
        </Button>
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
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
};

export default DepartmentTree;
