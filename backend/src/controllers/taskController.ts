// backend/src/controllers/taskController.ts
import type { Request, Response } from 'express'
import { taskService } from '../services/taskService'
import type { TaskStatus, TaskPriority } from '../types/task'

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
        priority: priority as TaskPriority,
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
