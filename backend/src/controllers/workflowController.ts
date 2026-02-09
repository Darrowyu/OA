import { Request, Response } from 'express'
import * as workflowService from '../services/workflowService'
import { prisma } from '../lib/prisma'
// import { WorkflowStatus, InstanceStatus } from '@prisma/client'

/**
 * 获取工作流列表
 */
export async function getWorkflows(req: Request, res: Response): Promise<void> {
  try {
    const { entityType } = req.query
    const workflows = await workflowService.getWorkflows(
      entityType as string | undefined
    )
    res.json({ success: true, data: workflows })
  } catch (error) {
    console.error('获取工作流列表失败:', error)
    res.status(500).json({ success: false, message: '获取工作流列表失败' })
  }
}

/**
 * 获取工作流详情
 */
export async function getWorkflowById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const workflow = await workflowService.getWorkflowById(id)

    if (!workflow) {
      res.status(404).json({ success: false, message: '工作流不存在' })
      return
    }

    res.json({ success: true, data: workflow })
  } catch (error) {
    console.error('获取工作流详情失败:', error)
    res.status(500).json({ success: false, message: '获取工作流详情失败' })
  }
}

/**
 * 创建工作流
 */
export async function createWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, message: '未登录' })
      return
    }

    const { name, description, entityType, nodes, edges } = req.body

    if (!name || !entityType || !nodes || !edges) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数: name, entityType, nodes, edges'
      })
      return
    }

    const workflow = await workflowService.createWorkflow(
      { name, description, entityType, nodes, edges },
      userId
    )

    res.status(201).json({ success: true, data: workflow })
  } catch (error) {
    console.error('创建工作流失败:', error)
    const message = error instanceof Error ? error.message : '创建工作流失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 更新工作流
 */
export async function updateWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { name, description, entityType, nodes, edges } = req.body

    const workflow = await workflowService.updateWorkflow(id, {
      name,
      description,
      entityType,
      nodes,
      edges
    })

    res.json({ success: true, data: workflow })
  } catch (error) {
    console.error('更新工作流失败:', error)
    const message = error instanceof Error ? error.message : '更新工作流失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    await workflowService.deleteWorkflow(id)
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除工作流失败:', error)
    const message = error instanceof Error ? error.message : '删除工作流失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 发布工作流
 */
export async function publishWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ success: false, message: '未登录' })
      return
    }

    const workflow = await workflowService.publishWorkflow(id, userId)
    res.json({ success: true, data: workflow })
  } catch (error) {
    console.error('发布工作流失败:', error)
    const message = error instanceof Error ? error.message : '发布工作流失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 设置默认工作流
 */
export async function setDefaultWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const workflow = await workflowService.setDefaultWorkflow(id)
    res.json({ success: true, data: workflow })
  } catch (error) {
    console.error('设置默认工作流失败:', error)
    const message = error instanceof Error ? error.message : '设置默认工作流失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 模拟工作流
 */
export async function simulateWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { testData } = req.body

    const result = await workflowService.simulateWorkflow(id, testData || {})
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('模拟工作流失败:', error)
    const message = error instanceof Error ? error.message : '模拟工作流失败'
    res.status(400).json({ success: false, message })
  }
}

// ==================== 工作流实例相关控制器 ====================

/**
 * 启动工作流实例
 */
export async function startWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId, entityId, entityType, variables, contextData } = req.body

    if (!workflowId || !entityId || !entityType) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数: workflowId, entityId, entityType'
      })
      return
    }

    const instance = await workflowService.startWorkflow(
      workflowId,
      entityId,
      entityType,
      variables,
      contextData
    )

    res.status(201).json({ success: true, data: instance })
  } catch (error) {
    console.error('启动工作流失败:', error)
    const message = error instanceof Error ? error.message : '启动工作流失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 获取工作流实例详情
 */
export async function getWorkflowInstance(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const instance = await workflowService.getWorkflowInstance(id)

    if (!instance) {
      res.status(404).json({ success: false, message: '工作流实例不存在' })
      return
    }

    res.json({ success: true, data: instance })
  } catch (error) {
    console.error('获取工作流实例失败:', error)
    res.status(500).json({ success: false, message: '获取工作流实例失败' })
  }
}

/**
 * 处理流程节点 (审批/驳回)
 */
export async function processNode(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { action, comment } = req.body
    const userId = req.user?.id
    const username = req.user?.name || req.user?.username

    if (!userId || !username) {
      res.status(401).json({ success: false, message: '未登录' })
      return
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, message: '无效的操作类型' })
      return
    }

    const instance = await workflowService.processNode(
      id,
      action,
      userId,
      username,
      comment
    )

    res.json({ success: true, data: instance })
  } catch (error) {
    console.error('处理流程节点失败:', error)
    const message = error instanceof Error ? error.message : '处理流程节点失败'
    res.status(400).json({ success: false, message })
  }
}

/**
 * 获取实体的流程实例列表
 */
export async function getEntityInstances(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId } = req.params

    const instances = await prisma.workflowInstance.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            version: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    res.json({ success: true, data: instances })
  } catch (error) {
    console.error('获取流程实例列表失败:', error)
    res.status(500).json({ success: false, message: '获取流程实例列表失败' })
  }
}
