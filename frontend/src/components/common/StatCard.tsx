import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

// 趋势类型
type TrendType = 'up' | 'down' | 'neutral';

// StatCard属性
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    type: TrendType;
    label?: string;
  };
  subtitle?: string;
  className?: string;
  iconClassName?: string;
  loading?: boolean;
}

// 趋势配置
const trendConfig: Record<TrendType, { color: string; icon: typeof TrendingUp }> = {
  up: { color: 'text-green-600', icon: TrendingUp },
  down: { color: 'text-red-600', icon: TrendingDown },
  neutral: { color: 'text-gray-500', icon: TrendingUp },
};

/**
 * 统计卡片组件
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  className,
  iconClassName,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-8 rounded-full bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend ? trendConfig[trend.type].icon : null;
  const trendColor = trend ? trendConfig[trend.type].color : '';

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div
          className={cn(
            'h-9 w-9 rounded-full flex items-center justify-center',
            'bg-gray-100 text-gray-600',
            iconClassName
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && TrendIcon && (
            <div className="flex items-center gap-1">
              <TrendIcon
                className={cn(
                  'h-3 w-3',
                  trendColor,
                  trend.type === 'neutral' && 'rotate-90'
                )}
              />
              <span className={cn('text-xs font-medium', trendColor)}>
                {trend.value > 0 && trend.type !== 'down' ? '+' : ''}
                {trend.value}%
              </span>
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend?.label && !subtitle && (
            <p className="text-xs text-gray-500">{trend.label}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 迷你统计卡片
interface MiniStatCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  trend?: number;
  className?: string;
}

/**
 * 迷你统计卡片
 */
export function MiniStatCard({
  value,
  label,
  icon: Icon,
  trend,
  className,
}: MiniStatCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100',
        'hover:border-gray-200 transition-colors',
        className
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
      {trend !== undefined && (
        <div
          className={cn(
            'text-xs font-medium',
            isPositive && 'text-green-600',
            isNegative && 'text-red-600',
            !isPositive && !isNegative && 'text-gray-500'
          )}
        >
          {isPositive && '+'}
          {trend}%
        </div>
      )}
    </div>
  );
}

// 统计卡片组
interface StatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

const columnStyles: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

/**
 * 统计卡片组
 */
export function StatCardGroup({
  children,
  className,
  columns = 4,
}: StatCardGroupProps) {
  return (
    <div className={cn('grid gap-4', columnStyles[columns], className)}>
      {children}
    </div>
  );
}

export type { StatCardProps, MiniStatCardProps, StatCardGroupProps, TrendType };
