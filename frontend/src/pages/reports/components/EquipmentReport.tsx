import { Settings, TrendingUp, FileText, Clock } from 'lucide-react';
import { StatCard, PieChartWidget, BarChartWidget, DataTableWidget } from '@/components/DashboardWidgets';
import { useEquipmentStats } from '../hooks/useReportData';

const statusColors: Record<string, string> = {
  RUNNING: '#10b981',
  WARNING: '#f59e0b',
  STOPPED: '#ef4444',
  MAINTENANCE: '#3b82f6',
  SCRAPPED: '#6b7280',
};

const statusLabels: Record<string, string> = {
  RUNNING: '运行中',
  WARNING: '预警',
  STOPPED: '停机',
  MAINTENANCE: '保养中',
  SCRAPPED: '已报废',
};

/**
 * 设备利用率报表组件
 */
export function EquipmentReport() {
  const { stats, isLoading } = useEquipmentStats();

  const statusData =
    stats?.byStatus.map((s) => ({
      name: statusLabels[s.status] || s.status,
      value: s.count,
      color: statusColors[s.status] || '#6b7280',
    })) || [];

  const maintenanceColumns = [
    { key: 'code', title: '设备编号' },
    { key: 'equipmentName', title: '设备名称' },
    { key: 'maintenanceCount', title: '保养次数' },
    { key: 'repairCount', title: '维修次数' },
    { key: 'totalCost', title: '总费用', render: (value: number) => `¥${Number(value).toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="设备总数"
          value={stats?.totalEquipment || 0}
          icon={Settings}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="设备利用率"
          value={`${stats?.utilizationRate || 0}%`}
          icon={TrendingUp}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="总采购价值"
          value={`¥${Math.round(stats?.costAnalysis.totalPurchaseValue || 0).toLocaleString()}`}
          icon={FileText}
          color="yellow"
          isLoading={isLoading}
        />
        <StatCard
          title="维护总成本"
          value={`¥${Math.round(stats?.costAnalysis.totalMaintenanceCost || 0).toLocaleString()}`}
          icon={Clock}
          color="red"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PieChartWidget title="设备状态分布" data={statusData} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <BarChartWidget
            title="设备分类统计"
            data={stats?.byCategory || []}
            xKey="category"
            yKey="count"
            color="#3b82f6"
            isLoading={isLoading}
          />
        </div>
      </div>

      <DataTableWidget
        title="设备维修频次统计"
        columns={maintenanceColumns}
        data={stats?.maintenanceFrequency.slice(0, 10) || []}
        isLoading={isLoading}
      />

      <BarChartWidget
        title="分类成本分析"
        data={stats?.costAnalysis.costByCategory || []}
        xKey="category"
        yKey="purchaseCost"
        color="#10b981"
        isLoading={isLoading}
      />
    </div>
  );
}

export default EquipmentReport;
