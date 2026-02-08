# 任务管理模块实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现任务管理模块，支持个人/团队任务、任务看板（Kanban）、任务提醒和甘特图视图。

**Architecture:** 采用前后端分离架构，后端使用 Prisma ORM + PostgreSQL，前端使用 React + TypeScript + Tailwind CSS。拖拽功能使用 @hello-pangea/dnd 实现看板拖拽，甘特图使用自定义组件实现。

**Tech Stack:** React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, @hello-pangea/dnd, Express

---

## Task 1: 添加 Prisma 模型

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: 在 schema.prisma 文件末尾添加 Task 和 TaskProject 模型**

在文件末尾（after line 1011）添加：

```prisma
// ============================================
// 任务管理模块模型
// ============================================

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Task {
  id          String       @id @default(cuid())
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  assigneeId  String?
  creatorId   String
  projectId   String?
  startDate   DateTime?
  dueDate     DateTime?
  completedAt DateTime?
  tags        Json?        // ["前端", "紧急"]
  parentId    String?      // 子任务支持
  order       Int          @default(0) // 看板排序
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // 关联字段
  assignee User  @relation("AssignedTasks", fields: [assigneeId], references: [id])
  creator  User  @relation("CreatedTasks", fields: [creatorId], references: [id])
  parent   Task? @relation("SubTasks", fields: [parentId], references: [id])
  subTasks Task[] @relation("SubTasks")

  @@index([assigneeId])
  @@index([status])
  @@index([dueDate])
  @@index([creatorId])
  @@index([parentId])
  @@map("tasks")
}

model TaskProject {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?
  ownerId     String
  members     Json?    // 项目成员ID列表
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关联字段
  owner User @relation(fields: [ownerId], references: [id])

  @@index([ownerId])
  @@map("task_projects")
}
```

**Step 2: 更新 User 模型添加任务关联**

在 User 模型中添加：
```prisma
  assignedTasks Task[]      @relation("AssignedTasks") // 被分配的任务
  createdTasks  Task[]      @relation("CreatedTasks")  // 创建的任务
  ownedProjects TaskProject[] // 拥有的项目
```

**Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: 添加任务管理模块 Prisma 模型"
```

---

## Task 2: 创建后端服务层

**Files:**
- Create: `backend/src/services/taskService.ts`
- Create: `backend/src/types/task.ts`

**Step 1: 创建类型定义文件**

```typescript
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
  data: T[]
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
```

**Step 2: 创建 taskService.ts**

```typescript
// backend/src/services/taskService.ts
import { prisma } from '../lib/prisma'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryParams,
  PaginatedTasks,
  TaskWithRelations,
  KanbanColumn,
  GanttTask,
  CreateProjectInput,
  UpdateProjectInput,
  TaskProjectWithOwner,
  TaskStatus,
} from '../types/task'

export class TaskService {
  // 创建任务
  async create(data: CreateTaskInput, userId: string): Promise<TaskWithRelations> {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        assigneeId: data.assigneeId,
        creatorId: userId,
        projectId: data.projectId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        tags: data.tags || [],
        parentId: data.parentId,
        order: await this.getNextOrder(data.status || 'TODO'),
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        subTasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    return this.formatTask(task)
  }

  // 获取下一个排序号
  private async getNextOrder(status: TaskStatus): Promise<number> {
    const lastTask = await prisma.task.findFirst({
      where: { status },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    return (lastTask?.order || 0) + 1
  }

  // 格式化任务数据
  private formatTask(task: unknown): TaskWithRelations {
    const t = task as Record<string, unknown>
    return {
      ...t,
      tags: (t.tags as string[] | null) || [],
      createdAt: new Date(t.createdAt as string),
      updatedAt: new Date(t.updatedAt as string),
      startDate: t.startDate ? new Date(t.startDate as string) : null,
      dueDate: t.dueDate ? new Date(t.dueDate as string) : null,
      completedAt: t.completedAt ? new Date(t.completedAt as string) : null,
    } as TaskWithRelations
  }

  // 获取任务详情
  async getById(id: string): Promise<TaskWithRelations | null> {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        subTasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    if (!task) return null
    return this.formatTask(task)
  }

  // 获取任务列表（支持筛选）
  async findMany(params: TaskQueryParams): Promise<PaginatedTasks<TaskWithRelations>> {
    const {
      page = 1,
      pageSize = 20,
      status,
      priority,
      assigneeId,
      creatorId,
      projectId,
      keyword,
      dueBefore,
      dueAfter,
    } = params

    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (priority) where.priority = priority
    if (assigneeId) where.assigneeId = assigneeId
    if (creatorId) where.creatorId = creatorId
    if (projectId) where.projectId = projectId
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]
    }
    if (dueBefore || dueAfter) {
      where.dueDate = {}
      if (dueBefore) (where.dueDate as Record<string, Date>).lte = dueBefore
      if (dueAfter) (where.dueDate as Record<string, Date>).gte = dueAfter
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          subTasks: {
            select: { id: true, title: true, status: true },
          },
        },
      }),
    ])

    return {
      data: tasks.map(task => this.formatTask(task)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // 更新任务
  async update(id: string, data: UpdateTaskInput): Promise<TaskWithRelations> {
    const updateData: Record<string, unknown> = { ...data }

    // 如果状态变为 DONE，设置 completedAt
    if (data.status === 'DONE') {
      updateData.completedAt = new Date()
    } else if (data.status && data.status !== 'DONE') {
      updateData.completedAt = null
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        subTasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    return this.formatTask(task)
  }

  // 更新任务状态（用于拖拽）
  async updateStatus(id: string, status: TaskStatus, order?: number): Promise<TaskWithRelations> {
    const updateData: Record<string, unknown> = { status }
    if (order !== undefined) updateData.order = order
    if (status === 'DONE') updateData.completedAt = new Date()
    else updateData.completedAt = null

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        subTasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    return this.formatTask(task)
  }

  // 删除任务
  async delete(id: string): Promise<void> {
    await prisma.task.delete({
      where: { id },
    })
  }

  // 批量更新任务顺序
  async updateTaskOrders(updates: { id: string; order: number; status: TaskStatus }[]): Promise<void> {
    await Promise.all(
      updates.map(({ id, order, status }) =>
        prisma.task.update({
          where: { id },
          data: { order, status },
        })
      )
    )
  }

  // 获取看板数据
  async getKanbanBoard(userId: string): Promise<KanbanColumn[]> {
    const columns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
    const columnTitles: Record<TaskStatus, string> = {
      TODO: '待办',
      IN_PROGRESS: '进行中',
      REVIEW: '审核中',
      DONE: '已完成',
    }

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ assigneeId: userId }, { creatorId: userId }],
        parentId: null, // 只看板显示顶级任务
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        subTasks: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    return columns.map(status => ({
      id: status,
      title: columnTitles[status],
      tasks: tasks
        .filter(task => task.status === status)
        .map(task => this.formatTask(task)),
    }))
  }

  // 获取甘特图数据
  async getGanttData(userId: string): Promise<GanttTask[]> {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ assigneeId: userId }, { creatorId: userId }],
      },
      orderBy: { startDate: 'asc' },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    return tasks.map(task => {
      const t = task as Record<string, unknown>
      let progress = 0
      if (t.status === 'DONE') progress = 100
      else if (t.status === 'IN_PROGRESS') progress = 50
      else if (t.status === 'REVIEW') progress = 80

      return {
        id: t.id as string,
        title: t.title as string,
        startDate: t.startDate ? new Date(t.startDate as string) : null,
        endDate: t.dueDate ? new Date(t.dueDate as string) : null,
        progress,
        status: t.status as TaskStatus,
        priority: t.priority as TaskStatus,
        assignee: t.assignee as { id: string; name: string; avatar: string | null } | null,
      }
    })
  }

  // 获取我的任务统计
  async getMyTaskStats(userId: string): Promise<{
    total: number
    todo: number
    inProgress: number
    review: number
    done: number
    overdue: number
  }> {
    const now = new Date()

    const [
      total,
      todo,
      inProgress,
      review,
      done,
      overdue,
    ] = await Promise.all([
      prisma.task.count({
        where: { OR: [{ assigneeId: userId }, { creatorId: userId }] },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: 'TODO',
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: 'IN_PROGRESS',
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: 'REVIEW',
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: 'DONE',
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
      }),
    ])

    return { total, todo, inProgress, review, done, overdue }
  }

  // 创建项目
  async createProject(data: CreateProjectInput, userId: string): Promise<TaskProjectWithOwner> {
    const project = await prisma.taskProject.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color || '#3B82F6',
        ownerId: userId,
        members: data.members || [],
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    const taskCount = await prisma.task.count({
      where: { projectId: project.id },
    })

    return {
      ...project,
      members: (project.members as string[]) || [],
      taskCount,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }
  }

  // 获取项目列表
  async getProjects(userId: string): Promise<TaskProjectWithOwner[]> {
    const projects = await prisma.taskProject.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { array_contains: userId } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    return Promise.all(
      projects.map(async project => {
        const taskCount = await prisma.task.count({
          where: { projectId: project.id },
        })
        return {
          ...project,
          members: (project.members as string[]) || [],
          taskCount,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        }
      })
    )
  }

  // 更新项目
  async updateProject(id: string, data: UpdateProjectInput): Promise<TaskProjectWithOwner> {
    const project = await prisma.taskProject.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    const taskCount = await prisma.task.count({
      where: { projectId: project.id },
    })

    return {
      ...project,
      members: (project.members as string[]) || [],
      taskCount,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }
  }

  // 删除项目
  async deleteProject(id: string): Promise<void> {
    await prisma.taskProject.delete({
      where: { id },
    })
  }
}

export const taskService = new TaskService()
```

**Step 3: Commit**

```bash
git add backend/src/services/taskService.ts backend/src/types/task.ts
git commit -m "feat: 创建任务管理服务层"
```

---

## Task 3: 创建后端控制器和路由

**Files:**
- Create: `backend/src/controllers/taskController.ts`
- Create: `backend/src/routes/tasks.ts`

**Step 1: 创建控制器**

```typescript
// backend/src/controllers/taskController.ts
import type { Request, Response } from 'express'
import { taskService } from '../services/taskService'
import type { TaskStatus } from '../types/task'

export class TaskController {
  // 创建任务
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const task = await taskService.create(req.body, userId)
      res.status(201).json({ success: true, data: task })
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建任务失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 获取任务列表
  async findMany(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const { page, pageSize, status, priority, keyword } = req.query

      const result = await taskService.findMany({
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        status: status as TaskStatus,
        priority: priority as TaskStatus,
        keyword: keyword as string,
        assigneeId: userId,
      })

      res.json({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取任务列表失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 获取任务详情
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const task = await taskService.getById(id)

      if (!task) {
        res.status(404).json({ success: false, message: '任务不存在' })
        return
      }

      res.json({ success: true, data: task })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取任务详情失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 更新任务
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const task = await taskService.update(id, req.body)
      res.json({ success: true, data: task })
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新任务失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 更新任务状态（拖拽）
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { status, order } = req.body
      const task = await taskService.updateStatus(id, status as TaskStatus, order)
      res.json({ success: true, data: task })
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新任务状态失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 批量更新任务顺序
  async updateTaskOrders(req: Request, res: Response): Promise<void> {
    try {
      const { updates } = req.body
      await taskService.updateTaskOrders(updates)
      res.json({ success: true, message: '更新成功' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新任务顺序失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 删除任务
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      await taskService.delete(id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除任务失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 获取看板数据
  async getKanbanBoard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const board = await taskService.getKanbanBoard(userId)
      res.json({ success: true, data: board })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取看板数据失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 获取甘特图数据
  async getGanttData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const data = await taskService.getGanttData(userId)
      res.json({ success: true, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取甘特图数据失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 获取我的任务统计
  async getMyTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const stats = await taskService.getMyTaskStats(userId)
      res.json({ success: true, data: stats })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取任务统计失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 创建项目
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const project = await taskService.createProject(req.body, userId)
      res.status(201).json({ success: true, data: project })
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建项目失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 获取项目列表
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id as string
      const projects = await taskService.getProjects(userId)
      res.json({ success: true, data: projects })
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取项目列表失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 更新项目
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const project = await taskService.updateProject(id, req.body)
      res.json({ success: true, data: project })
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新项目失败'
      res.status(400).json({ success: false, message })
    }
  }

  // 删除项目
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      await taskService.deleteProject(id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除项目失败'
      res.status(400).json({ success: false, message })
    }
  }
}

export const taskController = new TaskController()
```

**Step 2: 创建路由**

```typescript
// backend/src/routes/tasks.ts
import { Router } from 'express'
import { taskController } from '../controllers/taskController'
import { auth } from '../middleware/auth'

const router = Router()

// 任务路由
router.post('/', auth, taskController.create.bind(taskController))
router.get('/', auth, taskController.findMany.bind(taskController))
router.get('/stats', auth, taskController.getMyTaskStats.bind(taskController))
router.get('/kanban', auth, taskController.getKanbanBoard.bind(taskController))
router.get('/gantt', auth, taskController.getGanttData.bind(taskController))
router.get('/projects', auth, taskController.getProjects.bind(taskController))
router.post('/projects', auth, taskController.createProject.bind(taskController))
router.put('/projects/:id', auth, taskController.updateProject.bind(taskController))
router.delete('/projects/:id', auth, taskController.deleteProject.bind(taskController))
router.get('/:id', auth, taskController.getById.bind(taskController))
router.put('/:id', auth, taskController.update.bind(taskController))
router.patch('/:id/status', auth, taskController.updateStatus.bind(taskController))
router.post('/reorder', auth, taskController.updateTaskOrders.bind(taskController))
router.delete('/:id', auth, taskController.delete.bind(taskController))

export default router
```

**Step 3: 更新主应用路由文件**

修改 `backend/src/index.ts` 添加任务路由：

```typescript
// 在 imports 中添加
import taskRoutes from './routes/tasks'

// 在路由注册处添加
app.use('/api/tasks', taskRoutes)
```

**Step 4: Commit**

```bash
git add backend/src/controllers/taskController.ts backend/src/routes/tasks.ts
git commit -m "feat: 创建任务管理控制器和路由"
```

---

## Task 4: 运行数据库迁移

**Files:**
- N/A

**Step 1: 执行迁移**

```bash
cd backend
npx prisma migrate dev --name add_task_management
```

**Step 2: 生成 Prisma 客户端**

```bash
npx prisma generate
```

**Step 3: Commit**

```bash
git add backend/prisma/migrations/
git commit -m "feat: 数据库迁移 - 添加任务管理表"
```

---

## Task 5: 创建前端类型和 API 服务

**Files:**
- Create: `frontend/src/services/tasks.ts`

**Step 1: 创建前端 API 服务**

```typescript
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
```

**Step 2: Commit**

```bash
git add frontend/src/services/tasks.ts
git commit -m "feat: 创建前端任务管理 API 服务"
```

---

## Task 6: 安装拖拽库

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装 @hello-pangea/dnd**

```bash
cd frontend
npm install @hello-pangea/dnd date-fns
npm install -D @types/react-beautiful-dnd
```

**Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: 安装拖拽库 @hello-pangea/dnd 和 date-fns"
```

---

## Task 7: 创建任务卡片组件

**Files:**
- Create: `frontend/src/components/TaskCard.tsx`

**Step 1: 创建 TaskCard 组件**

```tsx
// frontend/src/components/TaskCard.tsx
import { memo } from 'react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, MessageSquare, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Task, TaskPriority, TaskStatus } from '@/services/tasks'

interface TaskCardProps {
  task: Task
  onClick?: (task: Task) => void
  isDragging?: boolean
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  LOW: { label: '低', color: 'text-green-600', bg: 'bg-green-50' },
  MEDIUM: { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  HIGH: { label: '高', color: 'text-orange-600', bg: 'bg-orange-50' },
  URGENT: { label: '紧急', color: 'text-red-600', bg: 'bg-red-50' },
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  TODO: { label: '待办', color: 'text-gray-500' },
  IN_PROGRESS: { label: '进行中', color: 'text-blue-500' },
  REVIEW: { label: '审核中', color: 'text-purple-500' },
  DONE: { label: '已完成', color: 'text-green-500' },
}

function TaskCardComponent({ task, onClick, isDragging }: TaskCardProps) {
  const priority = priorityConfig[task.priority]

  // 格式化截止日期显示
  const formatDueDate = (dateStr: string | null): { text: string; isOverdue: boolean } => {
    if (!dateStr) return { text: '', isOverdue: false }
    const date = new Date(dateStr)
    const isOverdue = isPast(date) && !isToday(date) && task.status !== 'DONE'

    if (isToday(date)) return { text: '今天', isOverdue }
    if (isTomorrow(date)) return { text: '明天', isOverdue }
    return { text: format(date, 'MM/dd', { locale: zhCN }), isOverdue }
  }

  const dueDate = formatDueDate(task.dueDate)
  const hasSubTasks = task.subTasks && task.subTasks.length > 0
  const completedSubTasks = hasSubTasks
    ? task.subTasks.filter(st => st.status === 'DONE').length
    : 0

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`
        group bg-white rounded-lg border border-gray-200 p-3 cursor-pointer
        hover:shadow-md hover:border-gray-300 transition-all duration-200
        ${isDragging ? 'shadow-lg rotate-2' : ''}
      `}
    >
      {/* 拖拽手柄 */}
      <div className="flex items-start gap-2">
        <div className="pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
            {task.title}
          </h4>

          {/* 标签 */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 bg-gray-100 text-gray-600"
                >
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 优先级 */}
              <Badge
                variant="secondary"
                className={`text-xs px-1.5 py-0 ${priority.bg} ${priority.color}`}
              >
                {priority.label}
              </Badge>

              {/* 截止日期 */}
              {dueDate.text && (
                <div
                  className={`
                    flex items-center gap-1 text-xs
                    ${dueDate.isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}
                  `}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{dueDate.text}</span>
                </div>
              )}

              {/* 子任务数 */}
              {hasSubTasks && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MessageSquare className="w-3 h-3" />
                  <span>{completedSubTasks}/{task.subTasks.length}</span>
                </div>
              )}
            </div>

            {/* 负责人头像 */}
            {task.assignee ? (
              <Avatar className="w-6 h-6">
                <AvatarImage src={task.assignee.avatar || undefined} />
                <AvatarFallback className="text-xs bg-gray-200">
                  {task.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-400">-</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const TaskCard = memo(TaskCardComponent)
```

**Step 2: Commit**

```bash
git add frontend/src/components/TaskCard.tsx
git commit -m "feat: 创建任务卡片组件 TaskCard"
```

---

## Task 8: 创建看板组件

**Files:**
- Create: `frontend/src/components/KanbanBoard.tsx`

**Step 1: 创建 KanbanBoard 组件**

```tsx
// frontend/src/components/KanbanBoard.tsx
import { useState, useCallback } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DroppableProvided,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableStateSnapshot,
} from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import type { Task, KanbanColumn as KanbanColumnType, TaskStatus } from '@/services/tasks'

interface KanbanBoardProps {
  columns: KanbanColumnType[]
  onDragEnd: (result: DropResult) => void
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  isLoading?: boolean
}

const columnConfig: Record<TaskStatus, { title: string; color: string; bg: string }> = {
  TODO: { title: '待办', color: 'text-gray-700', bg: 'bg-gray-50' },
  IN_PROGRESS: { title: '进行中', color: 'text-blue-700', bg: 'bg-blue-50' },
  REVIEW: { title: '审核中', color: 'text-purple-700', bg: 'bg-purple-50' },
  DONE: { title: '已完成', color: 'text-green-700', bg: 'bg-green-50' },
}

export function KanbanBoard({
  columns,
  onDragEnd,
  onTaskClick,
  onAddTask,
  isLoading,
}: KanbanBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  const handleDragStart = useCallback(() => {
    if (typeof window !== 'undefined') {
      document.body.style.cursor = 'grabbing'
    }
  }, [])

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      document.body.style.cursor = 'default'
      setDraggingTaskId(null)
      onDragEnd(result)
    },
    [onDragEnd]
  )

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((status) => (
          <div key={status} className="flex-1 min-w-[280px] max-w-[400px]">
            <div className="bg-gray-50 rounded-lg p-3 h-full">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-2">
        {columns.map((column) => {
          const config = columnConfig[column.id]
          return (
            <div
              key={column.id}
              className="flex-1 min-w-[280px] max-w-[400px] flex flex-col"
            >
              {/* 列标题 */}
              <div className={`${config.bg} rounded-t-lg px-3 py-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${config.color}`}>{config.title}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {column.tasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAddTask(column.id)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 任务列表 */}
              <Droppable droppableId={column.id}>
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      flex-1 ${config.bg} rounded-b-lg p-2 space-y-2
                      min-h-[200px] transition-colors
                      ${snapshot.isDraggingOver ? 'bg-opacity-80 ring-2 ring-inset ring-blue-300' : ''}
                    `}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(
                          dragProvided: DraggableProvided,
                          dragSnapshot: DraggableStateSnapshot
                        ) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                            }}
                          >
                            <TaskCard
                              task={task}
                              onClick={onTaskClick}
                              isDragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* 快速添加按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-gray-500 hover:text-gray-700 hover:bg-white/50 border border-dashed border-gray-300"
                      onClick={() => onAddTask(column.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加任务
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/KanbanBoard.tsx
git commit -m "feat: 创建看板组件 KanbanBoard"
```

---

## Task 9: 创建甘特图组件

**Files:**
- Create: `frontend/src/components/GanttChart.tsx`

**Step 1: 创建 GanttChart 组件**

```tsx
// frontend/src/components/GanttChart.tsx
import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addDays,
  differenceInDays,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { GanttTask, TaskPriority, TaskStatus } from '@/services/tasks'

interface GanttChartProps {
  tasks: GanttTask[]
  onTaskClick?: (task: GanttTask) => void
  isLoading?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-green-400',
  MEDIUM: 'bg-yellow-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-red-400',
}

const statusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-300',
  IN_PROGRESS: 'bg-blue-400',
  REVIEW: 'bg-purple-400',
  DONE: 'bg-green-500',
}

export function GanttChart({ tasks, onTaskClick, isLoading }: GanttChartProps) {
  // 计算时间范围
  const { days, startDate, endDate } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date()
      const start = startOfMonth(today)
      const end = endOfMonth(today)
      return {
        days: eachDayOfInterval({ start, end }),
        startDate: start,
        endDate: end,
      }
    }

    const dates = tasks
      .flatMap(t => [t.startDate, t.endDate])
      .filter((d): d is string => !!d)
      .map(d => new Date(d))

    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date()

    // 添加一些缓冲
    const start = startOfDay(addDays(minDate, -3))
    const end = endOfDay(addDays(maxDate, 7))

    return {
      days: eachDayOfInterval({ start, end }),
      startDate: start,
      endDate: end,
    }
  }, [tasks])

  // 计算任务在时间轴上的位置
  const getTaskPosition = (task: GanttTask) => {
    const taskStart = task.startDate ? new Date(task.startDate) : startDate
    const taskEnd = task.endDate ? new Date(task.endDate) : addDays(taskStart, 1)

    const startOffset = Math.max(0, differenceInDays(taskStart, startDate))
    const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1)

    return {
      left: startOffset * 40, // 每天40px
      width: duration * 40 - 8, // 减去间距
    }
  }

  // 按周分组
  const weeks = useMemo(() => {
    const result: { days: Date[]; weekStart: Date }[] = []
    let currentWeek: Date[] = []

    days.forEach((day, idx) => {
      if (idx === 0 || day.getDay() === 1) {
        if (currentWeek.length > 0) {
          result.push({ days: currentWeek, weekStart: currentWeek[0] })
        }
        currentWeek = [day]
      } else {
        currentWeek.push(day)
      }
    })

    if (currentWeek.length > 0) {
      result.push({ days: currentWeek, weekStart: currentWeek[0] })
    }

    return result
  }, [days])

  if (isLoading) {
    return (
      <div className="h-96 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* 表头 - 周 */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 flex-shrink-0 p-3 font-medium text-gray-700 border-r border-gray-200">
              任务名称
            </div>
            <div className="flex">
              {weeks.map((week) => (
                <div
                  key={week.weekStart.toISOString()}
                  className="w-[280px] flex-shrink-0 p-2 text-center border-r border-gray-200 text-sm text-gray-600"
                >
                  {format(week.weekStart, 'MM月第w周', { locale: zhCN })}
                </div>
              ))}
            </div>
          </div>

          {/* 表头 - 天 */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 flex-shrink-0 border-r border-gray-200" />
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`
                    w-10 flex-shrink-0 p-1 text-center text-xs border-r border-gray-100
                    ${isToday(day) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500'}
                  `}
                >
                  <div>{format(day, 'EEE', { locale: zhCN })}</div>
                  <div>{format(day, 'd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 任务行 */}
          <div className="divide-y divide-gray-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                暂无任务数据
              </div>
            ) : (
              tasks.map((task) => {
                const position = getTaskPosition(task)
                return (
                  <div key={task.id} className="flex hover:bg-gray-50">
                    {/* 任务信息 */}
                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`w-2 h-2 p-0 rounded-full ${priorityColors[task.priority]}`}
                        />
                        <span className="text-sm text-gray-900 truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.assignee ? (
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={task.assignee.avatar || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {task.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="text-xs text-gray-400">未分配</span>
                        )}
                      </div>
                    </div>

                    {/* 时间轴 */}
                    <div className="flex relative h-12">
                      {days.map((day) => (
                        <div
                          key={day.toISOString()}
                          className={`
                            w-10 flex-shrink-0 border-r border-gray-100
                            ${isToday(day) ? 'bg-blue-50/30' : ''}
                          `}
                        />
                      ))}

                      {/* 任务条 */}
                      {task.startDate && task.endDate && (
                        <div
                          className={`
                            absolute top-2 h-8 rounded-md cursor-pointer
                            ${statusColors[task.status]} opacity-80 hover:opacity-100
                            transition-opacity flex items-center px-2
                          `}
                          style={{
                            left: position.left,
                            width: position.width,
                          }}
                          onClick={() => onTaskClick?.(task)}
                        >
                          {/* 进度条 */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-black/10 rounded-l-md"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="relative text-xs text-white font-medium truncate">
                            {task.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/GanttChart.tsx
git commit -m "feat: 创建甘特图组件 GanttChart"
```

---

## Task 10: 创建任务管理主页面

**Files:**
- Create: `frontend/src/pages/tasks/index.tsx`

**Step 1: 创建任务管理主页面**

```tsx
// frontend/src/pages/tasks/index.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { DropResult } from '@hello-pangea/dnd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { KanbanBoard } from '@/components/KanbanBoard'
import { GanttChart } from '@/components/GanttChart'
import { tasksApi, type Task, type KanbanColumn, type GanttTask, TaskStatus } from '@/services/tasks'
import { Plus, Layout, List, BarChart3, Calendar } from 'lucide-react'

export function TasksPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('kanban')
  const [isLoading, setIsLoading] = useState(false)
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([])
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([])
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0,
    overdue: 0,
  })

  // 加载看板数据
  const loadKanbanData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await tasksApi.getKanbanBoard()
      if (response.success) {
        setKanbanColumns(response.data)
      }
    } catch (error) {
      toast.error('加载看板数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载甘特图数据
  const loadGanttData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await tasksApi.getGanttData()
      if (response.success) {
        setGanttTasks(response.data)
      }
    } catch (error) {
      toast.error('加载甘特图数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const response = await tasksApi.getStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('加载统计失败', error)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadKanbanData()
    loadGanttData()
    loadStats()
  }, [loadKanbanData, loadGanttData, loadStats])

  // 处理拖拽结束
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const sourceStatus = source.droppableId as TaskStatus
    const destStatus = destination.droppableId as TaskStatus

    // 乐观更新
    const newColumns = [...kanbanColumns]
    const sourceCol = newColumns.find(col => col.id === sourceStatus)
    const destCol = newColumns.find(col => col.id === destStatus)

    if (!sourceCol || !destCol) return

    const [movedTask] = sourceCol.tasks.splice(source.index, 1)
    movedTask.status = destStatus
    destCol.tasks.splice(destination.index, 0, movedTask)

    setKanbanColumns(newColumns)

    // 发送请求到后端
    try {
      await tasksApi.updateTaskStatus(draggableId, destStatus, destination.index)
      toast.success('任务状态已更新')
      loadStats()
    } catch (error) {
      toast.error('更新失败，请重试')
      loadKanbanData() // 刷新数据
    }
  }

  // 点击任务
  const handleTaskClick = (task: Task) => {
    // TODO: 打开任务详情侧边栏
    toast.info(`打开任务: ${task.title}`)
  }

  // 添加任务
  const handleAddTask = (status: TaskStatus) => {
    // TODO: 打开新建任务对话框
    toast.info(`在 ${status} 列添加任务`)
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />

      <main className="p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
            <p className="text-gray-500 mt-1">管理个人和团队任务，追踪工作进度</p>
          </div>
          <Button onClick={() => handleAddTask(TaskStatus.TODO)}>
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">总任务</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">待办</div>
            <div className="text-2xl font-bold text-gray-600">{stats.todo}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">进行中</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">审核中</div>
            <div className="text-2xl font-bold text-purple-600">{stats.review}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">已完成</div>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500">已逾期</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </div>
        </div>

        {/* 视图切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="kanban" className="gap-2">
              <Layout className="w-4 h-4" />
              看板视图
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              列表视图
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              甘特图
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              日历
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-[calc(100vh-380px)]">
              <KanbanBoard
                columns={kanbanColumns}
                onDragEnd={handleDragEnd}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              列表视图开发中...
            </div>
          </TabsContent>

          <TabsContent value="gantt" className="mt-4">
            <GanttChart
              tasks={ganttTasks}
              onTaskClick={handleTaskClick}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              日历视图开发中...
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default TasksPage
```

**Step 2: Commit**

```bash
git add frontend/src/pages/tasks/index.tsx
git commit -m "feat: 创建任务管理主页面"
```

---

## Task 11: 注册路由和菜单

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

**Step 1: 更新 App.tsx 添加任务路由**

在 imports 中添加：
```typescript
import TasksPage from '@/pages/tasks'
```

在路由中添加（在考勤路由后）：
```tsx
      {/* 任务管理模块 */}
      <Route
        path="/tasks/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TasksPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
```

**Step 2: 更新 Sidebar.tsx 添加任务菜单**

在 imports 中添加 KanbanSquare 图标：
```typescript
import {
  // ... other imports
  KanbanSquare,
} from "lucide-react"
```

在 iconMap 中添加：
```typescript
const iconMap: Record<string, React.ElementType> = {
  // ... existing icons
  KanbanSquare,
}
```

在导航菜单中添加任务管理（在主导航列表中）：
```typescript
const mainNavItems = [
  { path: "/dashboard", name: "工作台", icon: "LayoutGrid", active: location.pathname === "/dashboard" },
  { path: "/tasks", name: "任务管理", icon: "KanbanSquare" },
  { path: "/documents", name: "文档中心", icon: "FolderOpen" },
  // ... rest
]
```

**Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat: 注册任务管理路由和菜单"
```

---

## Task 12: 类型检查和构建验证

**Files:**
- N/A

**Step 1: 运行类型检查**

```bash
cd frontend
npm run type-check
```

**Step 2: 构建前端**

```bash
npm run build
```

**Step 3: 最终 Commit**

```bash
git add .
git commit -m "feat: 实现任务管理模块 - 完成所有功能"
```

---

## 测试清单

- [ ] 数据库迁移成功执行
- [ ] 任务 API 接口正常
- [ ] 看板视图显示正确
- [ ] 任务卡片拖拽正常
- [ ] 甘特图显示正确
- [ ] 菜单和路由正常
- [ ] 类型检查通过
- [ ] 构建成功
