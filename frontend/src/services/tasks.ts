// frontend/src/services/tasks.ts
import apiClient from '@/lib/api'
import type { PaginatedResponse } from '@/types'

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  creatorId: string
  projectId: string | null
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  tags: string[]
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
  assignee: {
    id: string
    name: string
    avatar: string | null
  } | null
  creator: {
    id: string
    name: string
    avatar: string | null
  }
  subTasks: {
    id: string
    title: string
    status: TaskStatus
  }[]
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  projectId?: string
  startDate?: string
  dueDate?: string
  tags?: string[]
  parentId?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  projectId?: string | null
  startDate?: string | null
  dueDate?: string | null
  tags?: string[]
  order?: number
}

export interface KanbanColumn {
  id: TaskStatus
  title: string
  tasks: Task[]
}

export interface GanttTask {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
  progress: number
  status: TaskStatus
  priority: TaskPriority
  assignee: {
    id: string
    name: string
    avatar: string | null
  } | null
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  review: number
  done: number
  overdue: number
}

export interface TaskProject {
  id: string
  name: string
  description: string | null
  color: string | null
  ownerId: string
  members: string[]
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    avatar: string | null
  }
  taskCount: number
}

export interface CreateProjectRequest {
  name: string
  description?: string
  color?: string
  members?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  color?: string
  members?: string[]
}

interface TaskResponse {
  success: boolean
  data: Task
}

interface TasksResponse {
  success: boolean
  data: PaginatedResponse<Task>
}

interface KanbanResponse {
  success: boolean
  data: KanbanColumn[]
}

interface GanttResponse {
  success: boolean
  data: GanttTask[]
}

interface StatsResponse {
  success: boolean
  data: TaskStats
}

interface ProjectsResponse {
  success: boolean
  data: TaskProject[]
}

interface ProjectResponse {
  success: boolean
  data: TaskProject
}

export const tasksApi = {
  // 任务 CRUD
  getTasks: (params?: {
    page?: number
    pageSize?: number
    status?: TaskStatus
    priority?: TaskPriority
    keyword?: string
  }): Promise<TasksResponse> => apiClient.get('/tasks', { params }),

  getTask: (id: string): Promise<TaskResponse> =>
    apiClient.get(`/tasks/${id}`),

  createTask: (data: CreateTaskRequest): Promise<TaskResponse> =>
    apiClient.post('/tasks', data),

  updateTask: (id: string, data: UpdateTaskRequest): Promise<TaskResponse> =>
    apiClient.put(`/tasks/${id}`, data),

  updateTaskStatus: (id: string, status: TaskStatus, order?: number): Promise<TaskResponse> =>
    apiClient.patch(`/tasks/${id}/status`, { status, order }),

  updateTaskOrders: (updates: { id: string; order: number; status: TaskStatus }[]): Promise<{ success: boolean }> =>
    apiClient.post('/tasks/reorder', { updates }),

  deleteTask: (id: string): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/tasks/${id}`),

  // 看板和甘特图
  getKanbanBoard: (): Promise<KanbanResponse> =>
    apiClient.get('/tasks/kanban'),

  getGanttData: (): Promise<GanttResponse> =>
    apiClient.get('/tasks/gantt'),

  getStats: (): Promise<StatsResponse> =>
    apiClient.get('/tasks/stats'),

  // 项目管理
  getProjects: (): Promise<ProjectsResponse> =>
    apiClient.get('/tasks/projects'),

  createProject: (data: CreateProjectRequest): Promise<ProjectResponse> =>
    apiClient.post('/tasks/projects', data),

  updateProject: (id: string, data: UpdateProjectRequest): Promise<ProjectResponse> =>
    apiClient.put(`/tasks/projects/${id}`, data),

  deleteProject: (id: string): Promise<{ success: boolean; message: string }> =>
    apiClient.delete(`/tasks/projects/${id}`),
}
