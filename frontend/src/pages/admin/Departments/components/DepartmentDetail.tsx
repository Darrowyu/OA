import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { DepartmentTreeNode } from '@/types';

interface DepartmentDetailProps {
  department: DepartmentTreeNode | null;
  members: Array<{
    id: string;
    name: string;
    employeeId: string;
    isActive: boolean;
  }>;
  isMembersLoading: boolean;
}

/**
 * 部门详情组件
 */
export function DepartmentDetail({
  department,
  members,
  isMembersLoading,
}: DepartmentDetailProps) {
  return (
    <AnimatePresence mode="wait">
      {department ? (
        <motion.div
          key={department.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          {/* 基本信息 */}
          <div className="space-y-3">
            <div>
              <Label className="text-gray-500">部门名称</Label>
              <p className="font-medium">{department.name}</p>
            </div>
            <div>
              <Label className="text-gray-500">部门编码</Label>
              <p className="font-mono text-sm">{department.code}</p>
            </div>
            <div>
              <Label className="text-gray-500">层级</Label>
              <p>第 {department.level} 级</p>
            </div>
            <div>
              <Label className="text-gray-500">状态</Label>
              <div className="mt-1">
                {department.isActive ? (
                  <Badge variant="default">启用中</Badge>
                ) : (
                  <Badge variant="secondary">已停用</Badge>
                )}
              </div>
            </div>
            {department.description && (
              <div>
                <Label className="text-gray-500">描述</Label>
                <p className="text-sm text-gray-600">{department.description}</p>
              </div>
            )}
            {department.manager && (
              <div>
                <Label className="text-gray-500">部门负责人</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{department.manager.name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                部门成员
                <Badge variant="secondary">{members.length}</Badge>
              </h3>
            </div>

            {isMembersLoading ? (
              <div className="text-center py-4 text-gray-400">加载中...</div>
            ) : members.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.employeeId}</p>
                    </div>
                    {!member.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        已停用
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">暂无成员</div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-gray-400"
        >
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>选择一个部门查看详情</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DepartmentDetail;
