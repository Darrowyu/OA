import { User } from '@/types';

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: unknown, user: User) => string;
}

// 默认导出列配置
export const DEFAULT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'username', label: '用户名' },
  { key: 'name', label: '姓名' },
  { key: 'employeeId', label: '工号' },
  { key: 'department', label: '部门', formatter: (v) => (v as string) || '' },
  { key: 'role', label: '角色' },
  { key: 'email', label: '邮箱' },
  { key: 'isActive', label: '状态', formatter: (v) => (v !== false ? '启用' : '禁用') },
];

// 角色映射
const ROLE_LABELS: Record<string, string> = {
  USER: '普通用户',
  READONLY: '只读用户',
  FINANCE: '财务',
  FACTORY_MANAGER: '厂长',
  DIRECTOR: '总监',
  MANAGER: '经理',
  CEO: 'CEO',
  ADMIN: '管理员',
};

interface ExportUsersOptions {
  filename?: string;
  columns?: ExportColumn[];
  roleLabels?: Record<string, string>;
}

/**
 * 导出用户数据为 CSV 文件
 */
export function exportUsersToCSV(
  users: User[],
  options: ExportUsersOptions = {}
): { success: boolean; message?: string } {
  const {
    filename = `用户列表_${new Date().toISOString().split('T')[0]}.csv`,
    columns = DEFAULT_EXPORT_COLUMNS,
    roleLabels = ROLE_LABELS,
  } = options;

  if (users.length === 0) {
    return { success: false, message: '没有数据可导出' };
  }

  try {
    // 构建表头
    const headers = columns.map((col) => col.label);

    // 构建数据行
    const rows = users.map((user) =>
      columns.map((col) => {
        let value: unknown;

        // 获取值
        if (col.key === 'role') {
          value = roleLabels[user.role] || user.role;
        } else if (col.key in user) {
          value = user[col.key as keyof User];
        } else {
          value = '';
        }

        // 应用格式化器
        if (col.formatter) {
          value = col.formatter(value, user);
        }

        // 转义CSV特殊字符
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
    );

    // 构建CSV内容
    const csvContent = '\ufeff' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // 创建下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    // 清理
    URL.revokeObjectURL(link.href);

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '导出失败' };
  }
}

/**
 * 导出用户数据为 JSON 文件
 */
export function exportUsersToJSON(
  users: User[],
  filename?: string
): { success: boolean; message?: string } {
  if (users.length === 0) {
    return { success: false, message: '没有数据可导出' };
  }

  try {
    const content = JSON.stringify(users, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || `用户列表_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(link.href);

    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '导出失败' };
  }
}
