import { useState, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// 排序方向
type SortDirection = 'asc' | 'desc' | null;

// 表格列定义
interface Column<T> {
  key: string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

// DataTable属性
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T) => string);
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

// 排序配置
interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

/**
 * 通用数据表格组件
 *
 * 支持排序、加载状态、空状态、点击行等特性
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={[
 *     { key: 'name', title: '姓名', render: (user) => user.name },
 *     { key: 'email', title: '邮箱' },
 *   ]}
 *   loading={isLoading}
 *   onRowClick={(user) => navigate(`/users/${user.id}`)}
 * />
 * ```
 */
export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  emptyText = '暂无数据',
  rowKey,
  onRowClick,
  sortable = false,
  className,
  tableClassName,
  headerClassName,
  rowClassName,
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: '',
    direction: null,
  });

  // 处理排序
  const handleSort = useCallback(
    (column: Column<T>) => {
      if (!sortable || !column.sortable) return;

      setSortConfig((current) => {
        let direction: SortDirection = 'asc';
        if (current.key === column.key) {
          if (current.direction === 'asc') direction = 'desc';
          else if (current.direction === 'desc') direction = null;
        }
        return { key: column.key, direction };
      });
    },
    [sortable]
  );

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // 获取行唯一键
  const getRowKey = useCallback(
    (row: T, index: number): string => {
      if (typeof rowKey === 'function') return rowKey(row);
      if (typeof rowKey === 'string') return String(row[rowKey] ?? index);
      return String(row.id ?? index);
    },
    [rowKey]
  );

  // 获取行样式
  const getRowClassName = useCallback(
    (row: T): string => {
      if (typeof rowClassName === 'function') return rowClassName(row);
      return rowClassName ?? '';
    },
    [rowClassName]
  );

  // 渲染排序图标
  const renderSortIcon = (column: Column<T>) => {
    if (!sortable || !column.sortable) return null;

    const isActive = sortConfig.key === column.key;
    const direction = isActive ? sortConfig.direction : null;

    if (direction === 'asc') {
      return <ChevronUp className="h-4 w-4 text-gray-900" />;
    }
    if (direction === 'desc') {
      return <ChevronDown className="h-4 w-4 text-gray-900" />;
    }
    return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
  };

  // 加载状态骨架屏
  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className={cn('rounded-lg border', bordered ? 'border-gray-200' : 'border-transparent')}>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {columns.map((_, j) => (
                  <Skeleton key={j} className="h-10 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 空状态
  if (data.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div
          className={cn(
            'rounded-lg border border-dashed',
            bordered ? 'border-gray-200' : 'border-gray-200',
            'p-8 text-center'
          )}
        >
          <p className="text-gray-500">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-auto', className)}>
      <Table
        className={cn(
          bordered && 'border rounded-lg',
          tableClassName
        )}
      >
        <TableHeader>
          <TableRow
            className={cn(
              'bg-gray-50 hover:bg-gray-50',
              headerClassName
            )}
          >
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'font-semibold text-gray-700 whitespace-nowrap',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.headerClassName,
                  compact ? 'py-2 px-3' : 'py-3 px-4',
                  sortable && column.sortable && 'cursor-pointer select-none',
                  sortable && column.sortable && 'hover:bg-gray-100'
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div
                  className={cn(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}
                >
                  {column.title}
                  {renderSortIcon(column)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={getRowKey(row, index)}
              className={cn(
                striped && index % 2 === 1 && 'bg-gray-50',
                hoverable && 'hover:bg-gray-50',
                onRowClick && 'cursor-pointer',
                compact ? 'py-2 px-3' : 'py-3 px-4',
                getRowClassName(row)
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <TableCell
                  key={`${getRowKey(row, index)}-${column.key}`}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(row, index)
                    : String(row[column.key as keyof T] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 导出类型
export type { Column, SortDirection, DataTableProps, SortConfig };
