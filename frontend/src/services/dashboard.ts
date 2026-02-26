import apiClient from '@/lib/api';
import {
  DashboardStats,
  ScheduleEvent,
  TeamMember,
  Meeting,
  TodayTask,
  TaskStatistics,
  Activity,
  ActivityTimeRange,
  DashboardApiResponse,
} from '@/types/dashboard';

// 工作台API服务
export const dashboardApi = {
  // 获取工作台统计数据
  getStats: (): Promise<DashboardApiResponse<DashboardStats>> =>
    apiClient.get<DashboardApiResponse<DashboardStats>>('/dashboard/stats'),

  // 获取今日日程
  getSchedule: (): Promise<DashboardApiResponse<{ events: ScheduleEvent[] }>> =>
    apiClient.get<DashboardApiResponse<{ events: ScheduleEvent[] }>>('/dashboard/schedule'),

  // 获取部门成员
  getTeamMembers: (): Promise<DashboardApiResponse<{ members: TeamMember[] }>> =>
    apiClient.get<DashboardApiResponse<{ members: TeamMember[] }>>('/dashboard/team-members'),

  // 获取即将开始的会议
  getUpcomingMeetings: (): Promise<DashboardApiResponse<{ meetings: Meeting[] }>> =>
    apiClient.get<DashboardApiResponse<{ meetings: Meeting[] }>>('/dashboard/upcoming-meetings'),

  // 获取今日任务
  getTodayTasks: (): Promise<DashboardApiResponse<{ tasks: TodayTask[] }>> =>
    apiClient.get<DashboardApiResponse<{ tasks: TodayTask[] }>>('/dashboard/today-tasks'),

  // 获取任务完成统计
  getTaskStatistics: (range?: ActivityTimeRange): Promise<DashboardApiResponse<TaskStatistics>> =>
    apiClient.get<DashboardApiResponse<TaskStatistics>>('/dashboard/task-statistics', {
      params: { range },
    }),

  // 获取最新动态
  getActivities: (): Promise<DashboardApiResponse<{ activities: Activity[] }>> =>
    apiClient.get<DashboardApiResponse<{ activities: Activity[] }>>('/dashboard/activities'),
};
