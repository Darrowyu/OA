// backend/src/types/task.ts
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

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  projectId?: string
  startDate?: Date
  dueDate?: Date
  tags?: string[]
  parentId?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  projectId?: string | null
  startDate?: Date | null
  dueDate?: Date | null
  tags?: string[]
  order?: number
}

export interface TaskQueryParams {
  page?: number
  pageSize?: number
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  creatorId?: string
  projectId?: string
  keyword?: string
  dueBefore?: Date
  dueAfter?: Date
}

export interface PaginatedTasks<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TaskWithRelations {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  creatorId: string
  projectId: string | null
  startDate: Date | null
  dueDate: Date | null
  completedAt: Date | null
  tags: string[] | null
  parentId: string | null
  order: number
  createdAt: Date
  updatedAt: Date
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

export interface KanbanColumn {
  id: TaskStatus
  title: string
  tasks: TaskWithRelations[]
}

export interface GanttTask {
  id: string
  title: string
  startDate: Date | null
  endDate: Date | null
  progress: number
  status: TaskStatus
  priority: TaskPriority
  assignee: {
    id: string
    name: string
    avatar: string | null
  } | null
}

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
  members?: string[]
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
  members?: string[]
}

export interface TaskProjectWithOwner {
  id: string
  name: string
  description: string | null
  color: string | null
  ownerId: string
  members: string[] | null
  createdAt: Date
  updatedAt: Date
  owner: {
    id: string
    name: string
    avatar: string | null
  }
  taskCount: number
}
