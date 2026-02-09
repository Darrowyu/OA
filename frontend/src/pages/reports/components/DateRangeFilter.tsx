import { Calendar, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DateRangeFilter as DateRangeFilterType } from '@/types/reports';

interface DateRangeFilterProps {
  filters: DateRangeFilterType;
  onChange: (filters: DateRangeFilterType) => void;
  onRefresh: () => void;
  isLoading: boolean;
  showExport?: boolean;
}

/**
 * 日期范围筛选器组件
 */
export function DateRangeFilter({
  filters,
  onChange,
  onRefresh,
  isLoading,
  showExport = true,
}: DateRangeFilterProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">时间范围:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {showExport && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DateRangeFilter;
