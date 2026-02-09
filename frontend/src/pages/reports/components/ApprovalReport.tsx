import { FileText, TrendingUp, Clock, Filter } from 'lucide-react';
import { StatCard, LineChartWidget, PieChartWidget, BarChartWidget, DataTableWidget } from '@/components/DashboardWidgets';
import { DateRangeFilter } from './DateRangeFilter';
import { useApprovalStats } from '../hooks/useReportData';
import type { DateRangeFilter as DateRangeFilterType } from '@/types/reports';
import { useState } from 'react';

const defaultFilters: DateRangeFilterType = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
};

/**
 * 审批效率分析报表组件
 */
export function ApprovalReport() {
  const [filters, setFilters] = useState<DateRangeFilterType>(defaultFilters);
  const { stats, isLoading, fetchData } = useApprovalStats(filters);

  const approvalStatusData = stats
    ? [
        { name: '已通过', value: stats.approvedCount, color: '#10b981' },
        { name: '已驳回', value: stats.rejectedCount, color: '#ef4444' },
        { name: '待审批', value: stats.pendingCount, color: '#f59e0b' },
        { name: '草稿', value: stats.draftCount, color: '#6b7280' },
      ]
    : [];

  const bottleneckColumns = [
    { key: 'stage', title: '审批阶段' },
    { key: 'pendingCount', title: '待处理数' },
    { key: 'rejectionRate', title: '驳回率', render: (value: number) => `${value}%` },
    { key: 'avgWaitTime', title: '平均等待(小时)', render: (value: number) => `${value}h` },
  ];

  const approverColumns = [
    { key: 'approverName', title: '审批人' },
    { key: 'department', title: '部门' },
    { key: 'totalApprovals', title: '审批次数' },
    { key: 'avgResponseTime', title: '平均响应(小时)', render: (value: number) => `${value}h` },
  ];

  return (
    <div className="space-y-6">
      <DateRangeFilter
        filters={filters}
        onChange={setFilters}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总申请数"
          value={stats?.totalApplications || 0}
          icon={FileText}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="审批通过率"
          value={`${stats?.approvalRate || 0}%`}
          icon={TrendingUp}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="平均审批时长"
          value={`${stats?.avgProcessTime || 0}h`}
          icon={Clock}
          color="yellow"
          isLoading={isLoading}
        />
        <StatCard
          title="待审批数"
          value={stats?.pendingCount || 0}
          icon={Filter}
          color="red"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChartWidget
          title="审批趋势"
          data={stats?.trendData || []}
          xKey="date"
          yKeys={[
            { key: 'submitted', name: '提交', color: '#3b82f6' },
            { key: 'approved', name: '通过', color: '#10b981' },
            { key: 'rejected', name: '驳回', color: '#ef4444' },
          ]}
          isLoading={isLoading}
        />
        <PieChartWidget title="申请状态分布" data={approvalStatusData} isLoading={isLoading} />
      </div>

      <BarChartWidget
        title="部门平均审批时长排行"
        data={stats?.avgApprovalTimeByDept.slice(0, 10) || []}
        xKey="department"
        yKey="avgTime"
        color="#3b82f6"
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTableWidget
          title="审批瓶颈分析"
          columns={bottleneckColumns}
          data={stats?.bottleneckAnalysis || []}
          isLoading={isLoading}
        />
        <DataTableWidget
          title="审批人响应时间排行"
          columns={approverColumns}
          data={stats?.approverRanking.slice(0, 10) || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default ApprovalReport;
