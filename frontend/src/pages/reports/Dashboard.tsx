import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Settings,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Activity,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { reportsApi } from '@/services/reports';
import { DashboardSummary } from '@/types/reports';
import {
  StatCard,
  LineChartWidget,
  PieChartWidget,
  AlertListWidget,
  ActivityListWidget,
} from '@/components/DashboardWidgets';
import { Header } from '@/components/Header';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await reportsApi.getDashboardSummary();
      if (response.success) {
        setSummary(response.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      toast.error('获取仪表板数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // 每5分钟自动刷新
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 格式化数字
  const formatNumber = (num: number) => num.toLocaleString();

  // 活动数据转换
  const activities = summary
    ? [
        {
          title: '今日新申请',
          description: `${formatNumber(summary.recentActivity.newApplicationsToday)} 个新申请待处理`,
          time: '今天',
          icon: FileText,
          color: 'blue' as const,
        },
        {
          title: '今日已审批',
          description: `${formatNumber(summary.recentActivity.approvedToday)} 个申请已通过`,
          time: '今天',
          icon: CheckCircle,
          color: 'green' as const,
        },
        {
          title: '设备维护完成',
          description: `${formatNumber(summary.recentActivity.maintenanceCompletedToday)} 个维护任务已完成`,
          time: '今天',
          icon: Settings,
          color: 'yellow' as const,
        },
        {
          title: '今日会议',
          description: `${formatNumber(summary.recentActivity.meetingsToday)} 个会议已安排`,
          time: '今天',
          icon: Clock,
          color: 'purple' as const,
        },
      ]
    : [];

  // 设备状态颜色映射
  const equipmentStatusColors: Record<string, string> = {
    RUNNING: '#10b981',
    WARNING: '#f59e0b',
    STOPPED: '#ef4444',
    MAINTENANCE: '#3b82f6',
    SCRAPPED: '#6b7280',
  };

  // 设备状态中文映射
  const equipmentStatusLabels: Record<string, string> = {
    RUNNING: '运行中',
    WARNING: '预警',
    STOPPED: '停机',
    MAINTENANCE: '保养中',
    SCRAPPED: '已报废',
  };

  // 转换设备状态数据
  const equipmentStatusData = summary?.charts.equipmentStatus.map((item) => ({
    name: equipmentStatusLabels[item.status] || item.status,
    value: item.count,
    color: equipmentStatusColors[item.status] || '#6b7280',
  })) || [];

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-[#F3F4F6]">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据仪表板</h1>
            <p className="text-gray-500 mt-1">
              最后更新: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchDashboardData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </motion.div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="总用户数"
            value={formatNumber(summary?.overview.totalUsers || 0)}
            icon={Users}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="总申请数"
            value={formatNumber(summary?.overview.totalApplications || 0)}
            icon={FileText}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="设备总数"
            value={formatNumber(summary?.overview.totalEquipment || 0)}
            icon={Settings}
            color="yellow"
            isLoading={isLoading}
          />
          <StatCard
            title="待审批"
            value={formatNumber(summary?.overview.pendingApprovals || 0)}
            icon={Clock}
            color="red"
            trend={{ value: 12, isPositive: false }}
            isLoading={isLoading}
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 申请趋势图 */}
          <div className="lg:col-span-2">
            <LineChartWidget
              title="申请趋势（最近30天）"
              data={summary?.charts.applicationTrend || []}
              xKey="date"
              yKeys={[
                { key: 'submitted', name: '提交数', color: '#3b82f6' },
                { key: 'approved', name: '通过数', color: '#10b981' },
              ]}
              isLoading={isLoading}
            />
          </div>

          {/* 设备状态分布 */}
          <div>
            <PieChartWidget
              title="设备状态分布"
              data={equipmentStatusData}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* 部门工作量和告警 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 部门工作量 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">部门工作量</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="space-y-4">
                  {summary?.charts.departmentWorkload.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{dept.department}</p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            待办任务: {dept.pendingTasks}
                          </span>
                          <span className="text-xs text-gray-500">
                            待审批: {dept.pendingApprovals}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {dept.pendingTasks > 0 && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-600">
                            {dept.pendingTasks} 任务
                          </Badge>
                        )}
                        {dept.pendingApprovals > 0 && (
                          <Badge variant="secondary" className="bg-yellow-50 text-yellow-600">
                            {dept.pendingApprovals} 审批
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 系统告警 */}
          <AlertListWidget
            alerts={summary?.alerts || []}
            isLoading={isLoading}
          />
        </div>

        {/* 考勤概览和最近活动 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 考勤概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">今日考勤概览</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">已打卡</p>
                        <p className="text-xs text-gray-500">
                          {summary?.charts.attendanceOverview.checkedIn || 0} 人
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">未打卡</p>
                        <p className="text-xs text-gray-500">
                          {summary?.charts.attendanceOverview.notCheckedIn || 0} 人
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">请假中</p>
                        <p className="text-xs text-gray-500">
                          {summary?.charts.attendanceOverview.onLeave || 0} 人
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近活动 */}
          <div className="lg:col-span-2">
            <ActivityListWidget
              activities={activities}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </>
  );
}
