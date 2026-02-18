import { useState } from 'react';
import { ChevronRight, ChevronDown, Building2 } from 'lucide-react';
import type { DepartmentTreeNode } from '@/types';

interface DepartmentTreeProps {
  nodes: DepartmentTreeNode[];
  selectedId?: string | null;
  onSelect: (dept: DepartmentTreeNode) => void;
  level?: number;
}

/**
 * 部门树组件 - 递归渲染部门层级结构
 */
function DepartmentTreeNode({
  node,
  selectedId,
  onSelect,
  level = 0,
}: {
  node: DepartmentTreeNode;
  selectedId?: string | null;
  onSelect: (dept: DepartmentTreeNode) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两级
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 py-2 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-600'
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Building2 className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className="flex-1 truncate text-sm">{node.name}</span>
        {node.children && node.children.length > 0 && (
          <span className="text-xs text-gray-400">({node.children.length})</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 部门树容器组件
 */
export function DepartmentTree({
  nodes,
  selectedId,
  onSelect,
}: Omit<DepartmentTreeProps, 'level'>) {
  if (nodes.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无部门数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <DepartmentTreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default DepartmentTree;
