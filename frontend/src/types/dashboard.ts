// ============================================
// 工作台模块类型定义
// ============================================

// 工作台统计数据
export interface DashboardStats {
  totalProjects: number;
  pendingTasks: number;
  inProgressApprovals: number;
  completedThisMonth: number;
  trends: {
    projects: string;
    tasks: string;
    approvals: string;
    completed: string;
  };
}

// 日程事件
export interface ScheduleEvent {
  id: string;
  name: string;
  task: string;
  progress: number;
  startTime: string;
  duration: number;
  color: string;
  assignees: string[];
}

// 部门成员
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

// 会议
export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: string[];
  comments: number;
  links: number;
}

// 任务优先级
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 今日任务
export interface TodayTask {
  id: string;
  name: string;
  description: string;
  priority: TaskPriority;
  progress: number;
  assignees: string[];
  comments: number;
  links: number;
}

// 任务统计数据
export interface TaskStatistics {
  data: Array<{
    month: string;
    target: number;
    actual: number;
  }>;
}

// 活动时间范围
export type ActivityTimeRange = '1month' | '3months' | '6months' | '1year';

// 活动
export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
}

// API响应类型
export interface DashboardApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
