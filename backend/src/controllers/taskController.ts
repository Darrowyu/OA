// backend/src/controllers/taskController.ts
import type { Request, Response } from 'express'
import { taskService } from '../services/taskService'
import type { TaskStatus, TaskPriority } from '../types/task'

// 统一响应辅助函数
function successResponse<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data })
}

function errorResponse(res: Response, message: string, status = 400): void {
  res.status(status).json({ success: false, message })
}

// 获取当前用户ID
function getUserId(req: Request): string {
  return req.user?.id as string
}

export class TaskController {
  // 创建任务
  async create(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.create(req.body, getUserId(req))
      successResponse(res, task, 201)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '创建任务失败')
    }
  }

  // 获取任务列表
  async findMany(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize, status, priority, keyword } = req.query

      const result = await taskService.findMany({
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        keyword: keyword as string,
        assigneeId: getUserId(req),
      })

      successResponse(res, result)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '获取任务列表失败')
    }
  }

  // 获取任务详情
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.getById(req.params.id)

      if (!task) {
        errorResponse(res, '任务不存在', 404)
        return
      }

      successResponse(res, task)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '获取任务详情失败')
    }
  }

  // 更新任务
  async update(req: Request, res: Response): Promise<void> {
    try {
      const task = await taskService.update(req.params.id, req.body)
      successResponse(res, task)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '更新任务失败')
    }
  }

  // 更新任务状态（拖拽）
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, order } = req.body
      const task = await taskService.updateStatus(req.params.id, status as TaskStatus, order)
      successResponse(res, task)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '更新任务状态失败')
    }
  }

  // 批量更新任务顺序
  async updateTaskOrders(req: Request, res: Response): Promise<void> {
    try {
      await taskService.updateTaskOrders(req.body.updates)
      res.json({ success: true, message: '更新成功' })
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '更新任务顺序失败')
    }
  }

  // 删除任务
  async delete(req: Request, res: Response): Promise<void> {
    try {
      await taskService.delete(req.params.id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '删除任务失败')
    }
  }

  // 获取看板数据
  async getKanbanBoard(req: Request, res: Response): Promise<void> {
    try {
      const board = await taskService.getKanbanBoard(getUserId(req))
      successResponse(res, board)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '获取看板数据失败')
    }
  }

  // 获取甘特图数据
  async getGanttData(req: Request, res: Response): Promise<void> {
    try {
      const data = await taskService.getGanttData(getUserId(req))
      successResponse(res, data)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '获取甘特图数据失败')
    }
  }

  // 获取我的任务统计
  async getMyTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await taskService.getMyTaskStats(getUserId(req))
      successResponse(res, stats)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '获取任务统计失败')
    }
  }

  // 创建项目
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const project = await taskService.createProject(req.body, getUserId(req))
      successResponse(res, project, 201)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '创建项目失败')
    }
  }

  // 获取项目列表
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await taskService.getProjects(getUserId(req))
      successResponse(res, projects)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '获取项目列表失败')
    }
  }

  // 更新项目
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const project = await taskService.updateProject(req.params.id, req.body)
      successResponse(res, project)
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '更新项目失败')
    }
  }

  // 删除项目
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      await taskService.deleteProject(req.params.id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      errorResponse(res, error instanceof Error ? error.message : '删除项目失败')
    }
  }
}

export const taskController = new TaskController()
