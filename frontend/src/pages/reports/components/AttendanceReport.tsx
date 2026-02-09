import { useState } from 'react';
import { Users, Clock, TrendingUp, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCard, LineChartWidget, DataTableWidget } from '@/components/DashboardWidgets';
import { DateRangeFilter } from './DateRangeFilter';
import { useAttendanceStats } from '../hooks/useReportData';
import type { DateRangeFilter as DateRangeFilterType } from '@/types/reports';

const defaultFilters: DateRangeFilterType = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
};

/**
 * 考勤统计报表组件
 */
export function AttendanceReport() {
  const [filters, setFilters] = useState<DateRangeFilterType>(defaultFilters);
  const { stats, isLoading, fetchData } = useAttendanceStats(filters);

  const departmentColumns = [
    { key: 'departmentName', title: '部门' },
    { key: 'userCount', title: '人数' },
    { key: 'attendanceRate', title: '出勤率', render: (value: number) => `${value}%` },
    { key: 'lateCount', title: '迟到次数' },
    { key: 'absentCount', title: '缺勤次数' },
  ];

  const abnormalColumns = [
    { key: 'userName', title: '姓名' },
    { key: 'department', title: '部门' },
    { key: 'date', title: '日期' },
    {
      key: 'type',
      title: '类型',
      render: (value: string) => {
        return (
          <Badge variant="secondary" className={value === 'LATE' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}>
            {value === 'LATE' ? '迟到' : value === 'EARLY_LEAVE' ? '早退' : '缺勤'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <DateRangeFilter
        filters={filters}
        onChange={setFilters}
        onRefresh={fetchData}
        isLoading={isLoading}
        showExport={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="平均出勤率"
          value={`${stats?.summary.avgAttendanceRate || 0}%`}
          icon={Users}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="总迟到次数"
          value={stats?.summary.totalLateCount || 0}
          icon={Clock}
          color="yellow"
          isLoading={isLoading}
        />
        <StatCard
          title="总缺勤次数"
          value={stats?.summary.totalAbsentCount || 0}
          icon={TrendingUp}
          color="red"
          isLoading={isLoading}
        />
        <StatCard
          title="平均工时"
          value={`${stats?.summary.avgWorkHoursPerDay || 0}h`}
          icon={FileText}
          color="green"
          isLoading={isLoading}
        />
      </div>

      <LineChartWidget
        title="考勤趋势"
        data={stats?.dailyTrend || []}
        xKey="date"
        yKeys={[
          { key: 'normalCount', name: '正常', color: '#10b981' },
          { key: 'lateCount', name: '迟到', color: '#f59e0b' },
          { key: 'absentCount', name: '缺勤', color: '#ef4444' },
        ]}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTableWidget
          title="部门考勤统计"
          columns={departmentColumns}
          data={stats?.byDepartment || []}
          isLoading={isLoading}
        />
        <DataTableWidget
          title="异常考勤记录"
          columns={abnormalColumns}
          data={stats?.abnormalRecords.slice(0, 10) || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default AttendanceReport;
