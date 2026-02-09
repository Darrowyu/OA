import { Badge } from '@/components/ui/badge';
import { ApplicationStatus, Priority } from '@/types';
import { cn } from '@/lib/utils';

// 状态Badge尺寸
export type BadgeSize = 'sm' | 'md' | 'lg';

// 状态Badge变体
export type BadgeVariant = 'solid' | 'outline' | 'soft';

// 申请状态配置
const statusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  [ApplicationStatus.DRAFT]: {
    label: '草稿',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  [ApplicationStatus.PENDING_FACTORY]: {
    label: '待厂长审批',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [ApplicationStatus.PENDING_DIRECTOR]: {
    label: '待总监审批',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  [ApplicationStatus.PENDING_MANAGER]: {
    label: '待经理审批',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  [ApplicationStatus.PENDING_CEO]: {
    label: '待CEO审批',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [ApplicationStatus.APPROVED]: {
    label: '已通过',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  [ApplicationStatus.REJECTED]: {
    label: '已驳回',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  [ApplicationStatus.ARCHIVED]: {
    label: '已归档',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
};

// 优先级配置
const priorityConfig: Record<
  Priority,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  [Priority.LOW]: {
    label: '低',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  [Priority.NORMAL]: {
    label: '普通',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [Priority.HIGH]: {
    label: '高',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [Priority.URGENT]: {
    label: '紧急',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

// 通用状态配置（用于字符串状态）
const commonStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  active: {
    label: '启用',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  inactive: {
    label: '禁用',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  pending: {
    label: '待处理',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  processing: {
    label: '处理中',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  completed: {
    label: '已完成',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  cancelled: {
    label: '已取消',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

// 尺寸配置
const sizeConfig: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-xs',
  md: 'h-6 px-2 text-xs',
  lg: 'h-7 px-2.5 text-sm',
};

// 变体样式配置
const variantStyles: Record<BadgeVariant, (config: typeof statusConfig[ApplicationStatus]) => string> = {
  solid: (config) => cn(config.bgColor, config.color, 'border-transparent'),
  outline: (config) => cn('bg-transparent', config.color, config.borderColor, 'border'),
  soft: (config) => cn(config.bgColor, config.color, config.borderColor, 'border'),
};

// 申请状态Badge属性
interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: BadgeSize;
  variant?: BadgeVariant;
  className?: string;
}

// 优先级Badge属性
interface PriorityBadgeProps {
  priority: Priority;
  size?: BadgeSize;
  variant?: BadgeVariant;
  className?: string;
}

// 通用状态Badge属性
interface CommonStatusBadgeProps {
  status: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
  className?: string;
  customConfig?: typeof commonStatusConfig[string];
}

/**
 * 申请状态Badge组件
 */
export function ApplicationStatusBadge({
  status,
  size = 'md',
  variant = 'soft',
  className,
}: ApplicationStatusBadgeProps) {
  const config = statusConfig[status];
  const styles = variantStyles[variant](config);

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium transition-colors',
        sizeConfig[size],
        styles,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

/**
 * 优先级Badge组件
 */
export function PriorityBadge({
  priority,
  size = 'md',
  variant = 'soft',
  className,
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const styles = variantStyles[variant](config as typeof statusConfig[ApplicationStatus]);

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium transition-colors',
        sizeConfig[size],
        styles,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

/**
 * 通用状态Badge组件
 */
export function StatusBadge({
  status,
  size = 'md',
  variant = 'soft',
  className,
  customConfig,
}: CommonStatusBadgeProps) {
  const config = customConfig || commonStatusConfig[status] || commonStatusConfig.inactive;
  const styles = variantStyles[variant](config as typeof statusConfig[ApplicationStatus]);

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium transition-colors',
        sizeConfig[size],
        styles,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

/**
 * 数量Badge组件（用于显示消息数、待办数等）
 */
interface CountBadgeProps {
  count: number;
  max?: number;
  size?: BadgeSize;
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  size = 'sm',
  className,
}: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'h-4 min-w-4 px-1 text-[10px]',
    md: 'h-5 min-w-5 px-1.5 text-xs',
    lg: 'h-6 min-w-6 px-2 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-red-500 text-white font-medium',
        sizeStyles[size],
        className
      )}
    >
      {displayCount}
    </span>
  );
}

// 导出配置供外部使用
export { statusConfig, priorityConfig, commonStatusConfig };
