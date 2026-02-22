import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================
// 统计卡片组件
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  isLoading?: boolean;
}

const colorVariants = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function StatCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  color = 'blue',
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-12 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-lg ${colorVariants[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            {trend && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// 图表组件
// ============================================

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKeys: Array<{ key: string; name: string; color: string }>;
  title?: string;
  isLoading?: boolean;
}

export function LineChartWidget({ data, xKey, yKeys, title, isLoading }: LineChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {yKeys.map((yKey) => (
              <Line
                key={yKey.key}
                type="monotone"
                dataKey={yKey.key}
                name={yKey.name}
                stroke={yKey.color}
                strokeWidth={2}
                dot={{ fill: yKey.color, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  isLoading?: boolean;
}

export function BarChartWidget({ data, xKey, yKey, title, color = '#3b82f6', isLoading }: BarChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  isLoading?: boolean;
}

const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function PieChartWidget({ data, title, isLoading }: PieChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface RadarChartProps {
  data: Array<{ dimension: string; score: number; maxScore: number }>;
  title?: string;
  isLoading?: boolean;
}

export function RadarChartWidget({ data, title, isLoading }: RadarChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    subject: item.dimension,
    A: item.score,
    fullMark: item.maxScore,
  }));

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="绩效评分"
              dataKey="A"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface AreaChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  isLoading?: boolean;
}

export function AreaChartWidget({ data, xKey, yKey, title, color = '#3b82f6', isLoading }: AreaChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`color${yKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={color}
              fillOpacity={1}
              fill={`url(#color${yKey})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// 数据表格组件
// ============================================

// 数据表格列定义 - 使用泛型支持更灵活的类型
interface DataTableColumn {
  key: string;
  title: string;
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
  title?: string;
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
}

export function DataTableWidget({ columns, data, title, isLoading, pagination }: DataTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((col) => (
                  <th key={col.key} className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={row.id as string || `row-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-sm text-gray-700">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              共 {pagination.total} 条记录
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current === 1}
                onClick={() => pagination.onChange(pagination.current - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current * pagination.pageSize >= pagination.total}
                onClick={() => pagination.onChange(pagination.current + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// 告警列表组件
// ============================================

interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  count?: number;
}

interface AlertListProps {
  alerts: Alert[];
  title?: string;
  isLoading?: boolean;
}

const alertIcons = {
  warning: AlertCircle,
  error: AlertCircle,
  info: Activity,
};

const alertColors = {
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
  info: 'text-blue-600 bg-blue-50',
};

export function AlertListWidget({ alerts, title = '系统告警', isLoading }: AlertListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>暂无告警</span>
            </div>
          ) : (
            alerts.map((alert, index) => {
              const Icon = alertIcons[alert.type];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${alertColors[alert.type]}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-sm">{alert.message}</span>
                  {alert.count && (
                    <Badge variant="secondary" className="bg-white/50">
                      {alert.count}
                    </Badge>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 活动列表组件
// ============================================

interface ActivityItem {
  title: string;
  description?: string;
  time: string;
  icon?: React.ElementType;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

interface ActivityListProps {
  activities: ActivityItem[];
  title?: string;
  isLoading?: boolean;
}

const activityColors = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function ActivityListWidget({ activities, title = '最近活动', isLoading }: ActivityListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Clock className="h-5 w-5 mr-2" />
              <span>暂无活动</span>
            </div>
          ) : (
            activities.map((activity, index) => {
              const Icon = activity.icon || Activity;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className={`p-2 rounded-lg ${activityColors[activity.color || 'blue']}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 进度卡片组件
// ============================================

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  unit?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  isLoading?: boolean;
}

const progressColors = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

export function ProgressCard({ title, current, total, unit = '', color = 'blue', isLoading }: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{title}</p>
          <span className="text-sm font-medium text-gray-900">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-2 rounded-full ${progressColors[color]}`}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {current} / {total} {unit}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================
// 对比卡片组件
// ============================================

interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  unit?: string;
  isLoading?: boolean;
}

export function ComparisonCard({ title, currentValue, previousValue, unit = '', isLoading }: ComparisonCardProps) {
  const diff = currentValue - previousValue;
  const percentChange = previousValue !== 0 ? ((diff / previousValue) * 100) : 0;
  const isPositive = diff >= 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="flex items-end gap-2 mt-2">
          <span className="text-2xl font-bold text-gray-900">
            {currentValue.toLocaleString()}
            {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </span>
          <div
            className={`flex items-center gap-0.5 text-sm mb-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          上期: {previousValue.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
