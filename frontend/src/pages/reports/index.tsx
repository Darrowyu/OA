import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Routes, Route, NavLink } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Settings,
  Users,
  Clock,
  TrendingUp,
  Filter,
  Download,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { reportsApi } from '@/services/reports';
import {
  ApprovalStats,
  EquipmentStats,
  AttendanceStats,
  DateRangeFilter,
} from '@/types/reports';
import {
  StatCard,
  LineChartWidget,
  BarChartWidget,
  PieChartWidget,
  DataTableWidget,
} from '@/components/DashboardWidgets';
import { Header } from '@/components/Header';

// ============================================
// 审批效率分析报表
// ============================================

function ApprovalReport() {
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DateRangeFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getApprovalStats(filters);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取审批统计失败:', error);
      toast.error('获取审批统计失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

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
    { key: 'rejectionRate', title: '驳回率', render: (value: unknown) => `${value}%` },
    { key: 'avgWaitTime', title: '平均等待(小时)', render: (value: unknown) => `${value}h` },
  ];

  const approverColumns = [
    { key: 'approverName', title: '审批人' },
    { key: 'department', title: '部门' },
    { key: 'totalApprovals', title: '审批次数' },
    { key: 'avgResponseTime', title: '平均响应(小时)', render: (value: unknown) => `${value}h` },
  ];

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
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
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 概览统计 */}
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

      {/* 图表区域 */}
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

      {/* 部门审批时长排行 */}
      <BarChartWidget
        title="部门平均审批时长排行"
        data={stats?.avgApprovalTimeByDept.slice(0, 10) || []}
        xKey="department"
        yKey="avgTime"
        color="#3b82f6"
        isLoading={isLoading}
      />

      {/* 表格区域 */}
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

// ============================================
// 设备利用率报表
// ============================================

function EquipmentReport() {
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await reportsApi.getEquipmentStats({});
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('获取设备统计失败:', error);
        toast.error('获取设备统计失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
    { key: 'totalCost', title: '总费用', render: (value: unknown) => `¥${Number(value).toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
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

      {/* 图表区域 */}
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

      {/* 维修频次统计 */}
      <DataTableWidget
        title="设备维修频次统计"
        columns={maintenanceColumns}
        data={stats?.maintenanceFrequency.slice(0, 10) || []}
        isLoading={isLoading}
      />

      {/* 成本分析 */}
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

// ============================================
// 考勤统计报表
// ============================================

function AttendanceReport() {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DateRangeFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getAttendanceStats(filters);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取考勤统计失败:', error);
      toast.error('获取考勤统计失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const departmentColumns = [
    { key: 'departmentName', title: '部门' },
    { key: 'userCount', title: '人数' },
    { key: 'attendanceRate', title: '出勤率', render: (value: unknown) => `${value}%` },
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
      render: (value: unknown) => {
        const v = value as string;
        return (
          <Badge variant="secondary" className={v === 'LATE' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}>
            {v === 'LATE' ? '迟到' : v === 'EARLY_LEAVE' ? '早退' : '缺勤'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
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
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 概览统计 */}
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

      {/* 趋势图 */}
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

      {/* 表格区域 */}
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

// ============================================
// 人员绩效报表
// ============================================

function PerformanceReport() {
  const [performance, setPerformance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await reportsApi.getMyPerformance();
        if (response.success) {
          setPerformance(response.data);
        }
      } catch (error) {
        console.error('获取绩效数据失败:', error);
        toast.error('获取绩效数据失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* 概览 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {performance?.userName || '加载中...'}
              </h3>
              <p className="text-sm text-gray-500">{performance?.department}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">综合评分</p>
              <p className="text-4xl font-bold text-blue-600">{performance?.overallScore || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 绩效详情 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="出勤率"
          value={`${performance?.attendance.attendanceRate || 0}%`}
          icon={Users}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="任务完成率"
          value={`${performance?.tasks.completionRate || 0}%`}
          icon={FileText}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="审批处理"
          value={performance?.approvals.totalProcessed || 0}
          icon={Clock}
          color="yellow"
          isLoading={isLoading}
        />
        <StatCard
          title="会议参与"
          value={performance?.meetings.attendedCount || 0}
          icon={TrendingUp}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* 雷达图 */}
      {performance && (
        <Card>
          <CardHeader>
            <CardTitle>绩效维度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {/* 这里可以使用 recharts 的 RadarChart */}
              <div className="grid grid-cols-5 gap-8">
                {performance.radarData.map((item: any, index: number) => (
                  <div key={index} className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{item.score}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.dimension}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// 报表中心主页面
// ============================================

export default function ReportsCenter() {

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />
      <main className="p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">报表中心</h1>
            <p className="text-gray-500 mt-1">查看和分析系统数据报表</p>
          </div>
        </motion.div>

        <div className="flex gap-6">
          {/* 侧边导航 */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <NavLink
                    to="/reports"
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <BarChart3 className="h-4 w-4" />
                    数据仪表板
                  </NavLink>
                  <NavLink
                    to="/reports/approval"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <FileText className="h-4 w-4" />
                    审批效率分析
                  </NavLink>
                  <NavLink
                    to="/reports/equipment"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Settings className="h-4 w-4" />
                    设备利用率报表
                  </NavLink>
                  <NavLink
                    to="/reports/attendance"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Clock className="h-4 w-4" />
                    考勤统计报表
                  </NavLink>
                  <NavLink
                    to="/reports/performance"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Users className="h-4 w-4" />
                    人员绩效报表
                  </NavLink>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* 内容区域 */}
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<div>请选择报表类型</div>} />
              <Route path="approval" element={<ApprovalReport />} />
              <Route path="equipment" element={<EquipmentReport />} />
              <Route path="attendance" element={<AttendanceReport />} />
              <Route path="performance" element={<PerformanceReport />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
