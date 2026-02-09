import { Users, FileText, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/DashboardWidgets';
import { usePerformance } from '../hooks/useReportData';

interface RadarDataItem {
  dimension: string;
  score: number;
  maxScore: number;
}

/**
 * 人员绩效报表组件
 */
export function PerformanceReport() {
  const { performance, isLoading } = usePerformance();

  return (
    <div className="space-y-6">
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

      {performance && (
        <Card>
          <CardHeader>
            <CardTitle>绩效维度分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="grid grid-cols-5 gap-8">
                {performance.radarData.map((item: RadarDataItem, index: number) => (
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

export default PerformanceReport;
