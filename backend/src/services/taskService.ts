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
  TaskPriority,
} from '../types/task'
import { TaskStatus as TaskStatusEnum } from '../types/task'

export class TaskService {
  // 创建任务
  async create(data: CreateTaskInput, userId: string): Promise<TaskWithRelations> {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || TaskStatusEnum.TODO,
        priority: data.priority || 'MEDIUM',
        assigneeId: data.assigneeId,
        creatorId: userId,
        projectId: data.projectId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        tags: data.tags || [],
        parentId: data.parentId,
        order: await this.getNextOrder(data.status || TaskStatusEnum.TODO),
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
      items: tasks.map(task => this.formatTask(task)),
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
    if (data.status === TaskStatusEnum.DONE) {
      updateData.completedAt = new Date()
    } else if (data.status) {
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
    if (status === TaskStatusEnum.DONE) updateData.completedAt = new Date()
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

  // 批量更新任务顺序（使用事务保证原子性）
  async updateTaskOrders(updates: { id: string; order: number; status: TaskStatus }[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const { id, order, status } of updates) {
        await tx.task.update({
          where: { id },
          data: { order, status },
        })
      }
    })
  }

  // 获取看板数据
  async getKanbanBoard(userId: string): Promise<KanbanColumn[]> {
    const columns: TaskStatus[] = [TaskStatusEnum.TODO, TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.REVIEW, TaskStatusEnum.DONE]
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
      if (t.status === TaskStatusEnum.DONE) progress = 100
      else if (t.status === TaskStatusEnum.IN_PROGRESS) progress = 50
      else if (t.status === TaskStatusEnum.REVIEW) progress = 80

      return {
        id: t.id as string,
        title: t.title as string,
        startDate: t.startDate ? new Date(t.startDate as string) : null,
        endDate: t.dueDate ? new Date(t.dueDate as string) : null,
        progress,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
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
          status: TaskStatusEnum.TODO,
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: TaskStatusEnum.IN_PROGRESS,
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: TaskStatusEnum.REVIEW,
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: TaskStatusEnum.DONE,
        },
      }),
      prisma.task.count({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          status: { not: TaskStatusEnum.DONE },
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
    // 先查询用户负责的项目
    const ownedProjects = await prisma.taskProject.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
    })

    // 再查询所有项目（用于内存过滤成员）
    // 注意：由于Prisma JSON字段不支持数组包含查询，需要内存过滤
    const allProjects = await prisma.taskProject.findMany({
      where: { ownerId: { not: userId } }, // 排除已查询的
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
    })

    // 过滤成员包含当前用户的项目
    const memberProjects = allProjects.filter(project => {
      const members = project.members as string[] | null
      return members?.includes(userId) || false
    })

    // 合并结果
    const allFilteredProjects = [...ownedProjects, ...memberProjects]

    return allFilteredProjects.map(project => ({
      ...project,
      members: (project.members as string[]) || [],
      taskCount: project._count.tasks,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }))
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

  // 获取项目详情
  async getProjectById(id: string): Promise<(TaskProjectWithOwner & { members: string[] }) | null> {
    const project = await prisma.taskProject.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    if (!project) return null

    return {
      ...project,
      members: (project.members as string[]) || [],
      taskCount: await prisma.task.count({ where: { projectId: project.id } }),
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
