import { useMemo, useCallback, useState } from 'react';
import type { Department } from '@/services/departments';

// 部门树节点接口
export interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[];
}

// 构建部门树
function buildDepartmentTree(departments: Department[]): DepartmentTreeNode[] {
  const deptMap = new Map<string, DepartmentTreeNode>();
  departments.forEach((dept) => {
    deptMap.set(dept.id, { ...dept, children: [] });
  });

  const roots: DepartmentTreeNode[] = [];
  deptMap.forEach((dept) => {
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
}

// 过滤部门树 - 只保留匹配的部门及其父部门路径
function filterDepartmentTree(
  tree: DepartmentTreeNode[],
  matchedIds: Set<string>,
  parentIdsToKeep: Set<string>
): DepartmentTreeNode[] {
  const result: DepartmentTreeNode[] = [];

  for (const dept of tree) {
    const isMatch = matchedIds.has(dept.id);
    const shouldKeep = isMatch || parentIdsToKeep.has(dept.id);

    // 递归过滤子部门
    const filteredChildren = dept.children
      ? filterDepartmentTree(dept.children, matchedIds, parentIdsToKeep)
      : [];

    // 如果当前部门匹配，或者有子部门匹配，则保留
    if (shouldKeep || filteredChildren.length > 0) {
      result.push({
        ...dept,
        children: filteredChildren,
      });
    }
  }

  return result;
}

// 查找匹配的部门ID及其所有父部门ID
function findMatchedAndParentIds(
  departments: Department[],
  query: string
): { matchedIds: Set<string>; parentIds: Set<string> } {
  const matchedIds = new Set<string>();
  const parentIds = new Set<string>();

  // 首先找出所有匹配的部门
  departments.forEach((dept) => {
    if (dept.name?.toLowerCase().includes(query.toLowerCase())) {
      matchedIds.add(dept.id);
      // 添加所有父部门到parentIds
      let currentParentId = dept.parentId;
      while (currentParentId) {
        parentIds.add(currentParentId);
        const parent = departments.find((d) => d.id === currentParentId);
        currentParentId = parent?.parentId || null;
      }
    }
  });

  return { matchedIds, parentIds };
}

export function useDepartmentTree(departments: Department[] | undefined) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // 构建完整的部门树
  const fullTree = useMemo<DepartmentTreeNode[]>(() => {
    if (!departments) return [];
    return buildDepartmentTree(departments);
  }, [departments]);

  // 根据搜索查询过滤部门树
  const filteredTree = useMemo<DepartmentTreeNode[]>(() => {
    if (!searchQuery || !departments) return fullTree;

    const { matchedIds, parentIds } = findMatchedAndParentIds(
      departments,
      searchQuery
    );

    return filterDepartmentTree(fullTree, matchedIds, parentIds);
  }, [fullTree, searchQuery, departments]);

  // 获取匹配搜索的部门ID（用于高亮）
  const matchedIds = useMemo<Set<string>>(() => {
    if (!searchQuery || !departments) return new Set();

    const matched = new Set<string>();
    departments.forEach((dept) => {
      if (dept.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        matched.add(dept.id);
      }
    });
    return matched;
  }, [departments, searchQuery]);

  // 切换展开状态
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  // 搜索时自动展开匹配项的父部门
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (query && departments) {
        const { parentIds } = findMatchedAndParentIds(departments, query);
        setExpandedIds((prev) => {
          const newExpanded = new Set(prev);
          parentIds.forEach((id) => newExpanded.add(id));
          return newExpanded;
        });
      }
    },
    [departments]
  );

  return {
    departmentTree: filteredTree,
    expandedIds,
    matchedIds,
    toggleExpanded,
    handleSearch,
  };
}
