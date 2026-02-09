/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useCallback, useRef } from 'react';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { useDepartments } from './hooks/useDepartments';
import { DepartmentDetail } from './components/DepartmentDetail';
import type { DepartmentTreeNode } from '@/types';

// 过滤部门列表（搜索）
function useFilteredDepartments(
  departments: DepartmentTreeNode[],
  searchQuery: string
): DepartmentTreeNode[] {
  return useMemo(() => {
    if (!searchQuery.trim()) return departments;

    const filterNodes = (nodes: DepartmentTreeNode[]): DepartmentTreeNode[] => {
      return nodes
        .map((node) => {
          const matches =
            node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.code.toLowerCase().includes(searchQuery.toLowerCase());

          const filteredChildren = node.children ? filterNodes(node.children) : [];

          if (matches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter((node): node is DepartmentTreeNode => node !== null);
    };

    return filterNodes(departments);
  }, [departments, searchQuery]);
}

/**
 * 组织架构管理页面
 */
export default function Departments() {
  const {
    departments,
    selectedDept,
    members,
    isLoading,
    isMembersLoading,
    loadDepartments,
  } = useDepartments();

  const [searchQuery, setSearchQuery] = useState('');
  // 过滤部门列表（搜索结果）
  const filteredRef = useRef(useFilteredDepartments(departments, searchQuery));
  void filteredRef.current;

  const handleAdd = useCallback(() => {
    // TODO: 打开新增部门对话框
  }, []);

  // 部门操作函数（预留供将来使用）
  const handleEdit = useCallback((_dept: DepartmentTreeNode) => {
    // TODO: 打开编辑部门对话框
    void _dept;
  }, []);

  const handleDelete = useCallback((_dept: DepartmentTreeNode) => {
    // TODO: 打开删除确认对话框
    void _dept;
  }, []);

  const handleAddChild = useCallback((_dept: DepartmentTreeNode) => {
    // TODO: 打开添加子部门对话框
    void _dept;
  }, []);

  // 抑制未使用变量警告（这些函数将在后续功能中使用）
  void handleEdit;
  void handleDelete;
  void handleAddChild;

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            组织架构管理
          </h1>
          <p className="text-gray-500 mt-1">管理公司部门结构、设置部门负责人和分配人员</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：部门树 */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">部门结构</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索部门..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1.5 border rounded-md text-sm w-48"
                    />
                  </div>
                  <button
                    onClick={loadDepartments}
                    disabled={isLoading}
                    className="p-2 border rounded-md hover:bg-gray-50"
                  >
                    🔄
                  </button>
                  <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    新增部门
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* 这里需要使用 DepartmentTree 组件 */}
              <div className="min-h-[400px] text-gray-500 text-center py-20">
                部门树组件加载中...
              </div>
            </CardContent>
          </Card>

          {/* 右侧：部门详情 */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">部门详情</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <DepartmentDetail
                department={selectedDept}
                members={members}
                isMembersLoading={isMembersLoading}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
