import { Request, Response } from 'express'
import * as workflowService from '../services/workflowService'
import { prisma } from '../lib/prisma'
import * as logger from '../lib/logger'

// 统一响应辅助函数
function successResponse<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data })
}

function errorResponse(res: Response, message: string, statusCode = 500): void {
  res.status(statusCode).json({ success: false, message })
}

// 获取错误消息
function getErrorMessage(error: unknown, defaultMessage: string): string {
  return error instanceof Error ? error.message : defaultMessage
}

// 验证用户登录
function requireAuth(req: Request, res: Response): { userId: string; username: string } | null {
  const userId = req.user?.id
  const username = req.user?.name || req.user?.username

  if (!userId || !username) {
    errorResponse(res, '未登录', 401)
    return null
  }

  return { userId, username }
}

// 验证必填参数
function validateRequiredParams(
  params: Record<string, unknown>,
  required: string[],
  res: Response
): boolean {
  const missing = required.filter(key => !params[key])
  if (missing.length > 0) {
    errorResponse(res, `缺少必要参数: ${missing.join(', ')}`, 400)
    return false
  }
  return true
}

/**
 * 获取工作流列表
 */
export async function getWorkflows(req: Request, res: Response): Promise<void> {
  try {
    const { entityType } = req.query
    const workflows = await workflowService.getWorkflows(entityType as string | undefined)
    successResponse(res, workflows)
  } catch (error) {
    logger.error('获取工作流列表失败', { error })
    errorResponse(res, '获取工作流列表失败')
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
      errorResponse(res, '工作流不存在', 404)
      return
    }

    successResponse(res, workflow)
  } catch (error) {
    logger.error('获取工作流详情失败', { error })
    errorResponse(res, '获取工作流详情失败')
  }
}

/**
 * 创建工作流
 */
export async function createWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const auth = requireAuth(req, res)
    if (!auth) return

    const { name, description, entityType, nodes, edges } = req.body
    if (!validateRequiredParams({ name, entityType, nodes, edges }, ['name', 'entityType', 'nodes', 'edges'], res)) return

    const workflow = await workflowService.createWorkflow(
      { name, description, entityType, nodes, edges },
      auth.userId
    )

    successResponse(res, workflow, 201)
  } catch (error) {
    logger.error('创建工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '创建工作流失败'), 400)
  }
}

/**
 * 更新工作流
 */
export async function updateWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { name, description, entityType, nodes, edges } = req.body

    const workflow = await workflowService.updateWorkflow(id, { name, description, entityType, nodes, edges })
    successResponse(res, workflow)
  } catch (error) {
    logger.error('更新工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '更新工作流失败'), 400)
  }
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    await workflowService.deleteWorkflow(id)
    successResponse(res, { message: '删除成功' })
  } catch (error) {
    logger.error('删除工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '删除工作流失败'), 400)
  }
}

/**
 * 发布工作流
 */
export async function publishWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const auth = requireAuth(req, res)
    if (!auth) return

    const workflow = await workflowService.publishWorkflow(id, auth.userId)
    successResponse(res, workflow)
  } catch (error) {
    logger.error('发布工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '发布工作流失败'), 400)
  }
}

/**
 * 设置默认工作流
 */
export async function setDefaultWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const workflow = await workflowService.setDefaultWorkflow(id)
    successResponse(res, workflow)
  } catch (error) {
    logger.error('设置默认工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '设置默认工作流失败'), 400)
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
    successResponse(res, result)
  } catch (error) {
    logger.error('模拟工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '模拟工作流失败'), 400)
  }
}

// ==================== 工作流实例相关控制器 ====================

/**
 * 启动工作流实例
 */
export async function startWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId, entityId, entityType, variables, contextData } = req.body
    if (!validateRequiredParams({ workflowId, entityId, entityType }, ['workflowId', 'entityId', 'entityType'], res)) return

    const instance = await workflowService.startWorkflow(
      workflowId, entityId, entityType, variables, contextData
    )

    successResponse(res, instance, 201)
  } catch (error) {
    logger.error('启动工作流失败', { error })
    errorResponse(res, getErrorMessage(error, '启动工作流失败'), 400)
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
      errorResponse(res, '工作流实例不存在', 404)
      return
    }

    successResponse(res, instance)
  } catch (error) {
    logger.error('获取工作流实例失败', { error })
    errorResponse(res, '获取工作流实例失败')
  }
}

/**
 * 处理流程节点 (审批/驳回)
 */
export async function processNode(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { action, comment } = req.body
    const auth = requireAuth(req, res)
    if (!auth) return

    if (!action || !['approve', 'reject'].includes(action)) {
      errorResponse(res, '无效的操作类型', 400)
      return
    }

    const instance = await workflowService.processNode(
      id, action, auth.userId, auth.username, comment
    )

    successResponse(res, instance)
  } catch (error) {
    logger.error('处理流程节点失败', { error })
    errorResponse(res, getErrorMessage(error, '处理流程节点失败'), 400)
  }
}

/**
 * 获取实体的流程实例列表
 */
export async function getEntityInstances(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId } = req.params

    const instances = await prisma.workflowInstance.findMany({
      where: { entityType, entityId },
      include: {
        workflow: {
          select: { id: true, name: true, version: true }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    successResponse(res, instances)
  } catch (error) {
    logger.error('获取流程实例列表失败', { error })
    errorResponse(res, '获取流程实例列表失败')
  }
}
