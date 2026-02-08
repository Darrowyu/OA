import { WorkflowStatus, InstanceStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

// 节点类型定义
export type NodeType = 'start' | 'approval' | 'condition' | 'parallel' | 'end'

// 审批人类型
export type AssigneeType = 'user' | 'role' | 'department' | 'applicant'

// 并行审批类型 (会签/或签)
export type ParallelType = 'all' | 'any'

// 流程节点接口
export interface FlowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: {
    label: string
    assignee?: string           // 审批人ID/角色/部门
    assigneeType?: AssigneeType // 审批人类型
    condition?: string          // 条件表达式 (如: amount > 1000)
    parallelType?: ParallelType // 会签(all)或签(any)
    timeout?: number            // 超时时间(小时)
    reminder?: number           // 提醒间隔(小时)
    description?: string        // 节点描述
  }
}

// 流程连线接口
export interface FlowEdge {
  id: string
  source: string      // 源节点ID
  target: string      // 目标节点ID
  label?: string      // 连线标签
  condition?: string  // 条件分支标签 (如: 同意, 驳回, 金额>1000)
}

// 创建/更新工作流数据接口
export interface CreateWorkflowData {
  name: string
  description?: string
  entityType: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface UpdateWorkflowData {
  name?: string
  description?: string
  entityType?: string
  nodes?: FlowNode[]
  edges?: FlowEdge[]
}

// 流程变量接口
export interface WorkflowVariables {
  [key: string]: unknown
}

// 节点历史记录接口
export interface NodeHistory {
  nodeId: string
  nodeName: string
  action: 'enter' | 'complete' | 'reject'
  userId?: string
  username?: string
  comment?: string
  timestamp: string
}

/**
 * 获取所有工作流列表
 */
export async function getWorkflows(entityType?: string): Promise<WorkflowWithCreator[]> {
  const where: Prisma.WorkflowWhereInput = {}
  if (entityType) {
    where.entityType = entityType
  }

  const workflows = await prisma.workflow.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    },
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' }
    ]
  })

  return workflows
}

/**
 * 根据ID获取工作流详情
 */
export async function getWorkflowById(id: string): Promise<WorkflowWithCreator | null> {
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })
  return workflow
}

/**
 * 创建新工作流
 */
export async function createWorkflow(
  data: CreateWorkflowData,
  userId: string
): Promise<WorkflowWithCreator> {
  // 验证流程完整性
  validateWorkflow(data.nodes, data.edges)

  const workflow = await prisma.workflow.create({
    data: {
      name: data.name,
      description: data.description,
      entityType: data.entityType,
      nodes: data.nodes as unknown as Prisma.InputJsonValue,
      edges: data.edges as unknown as Prisma.InputJsonValue,
      createdBy: userId,
      status: WorkflowStatus.DRAFT,
      version: 1
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })

  return workflow
}

/**
 * 更新工作流
 */
export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowData
): Promise<WorkflowWithCreator> {
  const workflow = await prisma.workflow.findUnique({ where: { id } })
  if (!workflow) {
    throw new Error('工作流不存在')
  }

  // 已发布的流程不能编辑，需要创建新版本
  if (workflow.status === WorkflowStatus.PUBLISHED) {
    throw new Error('已发布的流程不能直接编辑，请创建新版本')
  }

  // 如果有节点/边数据，验证流程完整性
  if (data.nodes && data.edges) {
    validateWorkflow(data.nodes, data.edges)
  }

  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      entityType: data.entityType,
      nodes: data.nodes ? (data.nodes as unknown as Prisma.InputJsonValue) : undefined,
      edges: data.edges ? (data.edges as unknown as Prisma.InputJsonValue) : undefined
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })

  return updated
}

/**
 * 发布工作流
 */
export async function publishWorkflow(id: string, userId: string): Promise<WorkflowWithCreator> {
  const workflow = await prisma.workflow.findUnique({ where: { id } })
  if (!workflow) {
    throw new Error('工作流不存在')
  }

  // 验证流程完整性
  const nodes = workflow.nodes as unknown as FlowNode[]
  const edges = workflow.edges as unknown as FlowEdge[]
  validateWorkflow(nodes, edges)

  // 如果当前流程是已发布状态，创建新版本
  if (workflow.status === WorkflowStatus.PUBLISHED) {
    // 取消原版本的默认状态
    if (workflow.isDefault) {
      await prisma.workflow.update({
        where: { id },
        data: { isDefault: false }
      })
    }

    // 创建新版本
    const newVersion = await prisma.workflow.create({
      data: {
        name: workflow.name,
        description: workflow.description,
        entityType: workflow.entityType,
        nodes: workflow.nodes as Prisma.InputJsonValue,
        edges: workflow.edges as Prisma.InputJsonValue,
        version: workflow.version + 1,
        status: WorkflowStatus.PUBLISHED,
        isDefault: workflow.isDefault,
        createdBy: userId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    return newVersion as WorkflowWithCreator
  }

  // 发布当前草稿
  const published = await prisma.workflow.update({
    where: { id },
    data: {
      status: WorkflowStatus.PUBLISHED
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })

  return published
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const workflow = await prisma.workflow.findUnique({ where: { id } })
  if (!workflow) {
    throw new Error('工作流不存在')
  }

  // 检查是否有运行中的实例
  const runningInstances = await prisma.workflowInstance.count({
    where: {
      workflowId: id,
      status: InstanceStatus.RUNNING
    }
  })

  if (runningInstances > 0) {
    throw new Error('该工作流有运行中的实例，无法删除')
  }

  await prisma.workflow.delete({ where: { id } })
}

/**
 * 设置默认工作流
 */
export async function setDefaultWorkflow(id: string): Promise<WorkflowWithCreator> {
  const workflow = await prisma.workflow.findUnique({ where: { id } })
  if (!workflow) {
    throw new Error('工作流不存在')
  }

  // 取消同类型的其他默认流程
  await prisma.workflow.updateMany({
    where: {
      entityType: workflow.entityType,
      isDefault: true
    },
    data: { isDefault: false }
  })

  // 设置当前为默认
  const updated = await prisma.workflow.update({
    where: { id },
    data: { isDefault: true },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })

  return updated
}

/**
 * 启动工作流实例
 */
export async function startWorkflow(
  workflowId: string,
  entityId: string,
  entityType: string,
  variables?: WorkflowVariables,
  contextData?: Record<string, unknown>
): Promise<WorkflowInstanceWithWorkflow> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
  if (!workflow) {
    throw new Error('工作流不存在')
  }

  if (workflow.status !== WorkflowStatus.PUBLISHED) {
    throw new Error('只能启动已发布的工作流')
  }

  const nodes = workflow.nodes as unknown as FlowNode[]
  const startNode = nodes.find(n => n.type === 'start')
  if (!startNode) {
    throw new Error('工作流缺少开始节点')
  }

  // 找到开始节点的下一个节点
  const edges = workflow.edges as unknown as FlowEdge[]
  const firstEdge = edges.find(e => e.source === startNode.id)
  const firstNodeId = firstEdge?.target || startNode.id

  const instance = await prisma.workflowInstance.create({
    data: {
      workflowId,
      entityId,
      entityType,
      currentNodeId: firstNodeId,
      status: InstanceStatus.RUNNING,
      variables: variables as unknown as Prisma.InputJsonValue,
      contextData: contextData as unknown as Prisma.InputJsonValue,
      nodeHistory: [{
        nodeId: startNode.id,
        nodeName: startNode.data.label,
        action: 'enter',
        timestamp: new Date().toISOString()
      }, {
        nodeId: firstNodeId,
        nodeName: nodes.find(n => n.id === firstNodeId)?.data.label || '',
        action: 'enter',
        timestamp: new Date().toISOString()
      }] as unknown as Prisma.InputJsonValue
    },
    include: {
      workflow: true
    }
  })

  return instance
}

/**
 * 获取工作流实例详情
 */
export async function getWorkflowInstance(id: string): Promise<WorkflowInstanceWithWorkflow | null> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id },
    include: {
      workflow: true
    }
  })
  return instance
}

/**
 * 处理流程节点
 */
export async function processNode(
  instanceId: string,
  action: 'approve' | 'reject',
  userId: string,
  username: string,
  comment?: string
): Promise<WorkflowInstanceWithWorkflow> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { workflow: true }
  })

  if (!instance) {
    throw new Error('流程实例不存在')
  }

  if (instance.status !== InstanceStatus.RUNNING) {
    throw new Error('流程已结束')
  }

  const workflow = instance.workflow
  const nodes = workflow.nodes as unknown as FlowNode[]
  const edges = workflow.edges as unknown as FlowEdge[]
  const currentNode = nodes.find(n => n.id === instance.currentNodeId)

  if (!currentNode) {
    throw new Error('当前节点不存在')
  }

  // 更新历史记录
  const history = (instance.nodeHistory as unknown as NodeHistory[]) || []
  history.push({
    nodeId: currentNode.id,
    nodeName: currentNode.data.label,
    action: action === 'approve' ? 'complete' : 'reject',
    userId,
    username,
    comment,
    timestamp: new Date().toISOString()
  })

  // 如果是驳回，直接结束流程
  if (action === 'reject') {
    const updated = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: InstanceStatus.REJECTED,
        completedAt: new Date(),
        nodeHistory: history as unknown as Prisma.InputJsonValue
      },
      include: { workflow: true }
    })
    return updated
  }

  // 找到下一个节点
  const nextEdge = edges.find(e => {
    if (e.source !== currentNode.id) return false
    // 如果有条件，检查条件是否满足
    if (e.condition && instance.variables) {
      return evaluateCondition(e.condition, instance.variables as WorkflowVariables)
    }
    return true
  })

  if (!nextEdge) {
    // 没有下一个节点，流程结束
    const updated = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: InstanceStatus.COMPLETED,
        completedAt: new Date(),
        nodeHistory: history as unknown as Prisma.InputJsonValue
      },
      include: { workflow: true }
    })
    return updated
  }

  const nextNode = nodes.find(n => n.id === nextEdge.target)
  if (!nextNode) {
    throw new Error('下一个节点不存在')
  }

  // 如果是结束节点
  if (nextNode.type === 'end') {
    history.push({
      nodeId: nextNode.id,
      nodeName: nextNode.data.label,
      action: 'complete',
      timestamp: new Date().toISOString()
    })

    const updated = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: InstanceStatus.COMPLETED,
        completedAt: new Date(),
        nodeHistory: history as unknown as Prisma.InputJsonValue
      },
      include: { workflow: true }
    })
    return updated
  }

  // 继续到下一个节点
  history.push({
    nodeId: nextNode.id,
    nodeName: nextNode.data.label,
    action: 'enter',
    timestamp: new Date().toISOString()
  })

  const updated = await prisma.workflowInstance.update({
    where: { id: instanceId },
    data: {
      currentNodeId: nextNode.id,
      nodeHistory: history as unknown as Prisma.InputJsonValue
    },
    include: { workflow: true }
  })

  return updated
}

/**
 * 模拟工作流执行
 */
export async function simulateWorkflow(
  workflowId: string,
  testData: WorkflowVariables
): Promise<SimulationResult> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
  if (!workflow) {
    throw new Error('工作流不存在')
  }

  const nodes = workflow.nodes as unknown as FlowNode[]
  const edges = workflow.edges as unknown as FlowEdge[]

  // 验证流程
  const validationErrors = validateWorkflowDetailed(nodes, edges)
  if (validationErrors.length > 0) {
    return {
      success: false,
      errors: validationErrors,
      path: []
    }
  }

  // 模拟执行路径
  const path: SimulationNode[] = []
  const startNode = nodes.find(n => n.type === 'start')
  if (!startNode) {
    return {
      success: false,
      errors: ['缺少开始节点'],
      path: []
    }
  }

  path.push({
    nodeId: startNode.id,
    nodeName: startNode.data.label,
    nodeType: startNode.type,
    timestamp: new Date().toISOString()
  })

  let currentNodeId = startNode.id
  const visitedNodes = new Set<string>()

  while (currentNodeId) {
    // 防止无限循环
    if (visitedNodes.has(currentNodeId)) {
      return {
        success: false,
        errors: ['检测到流程循环'],
        path
      }
    }
    visitedNodes.add(currentNodeId)

    const currentNode = nodes.find(n => n.id === currentNodeId)
    if (!currentNode) {
      return {
        success: false,
        errors: [`节点 ${currentNodeId} 不存在`],
        path
      }
    }

    // 如果是结束节点
    if (currentNode.type === 'end') {
      path.push({
        nodeId: currentNode.id,
        nodeName: currentNode.data.label,
        nodeType: currentNode.type,
        timestamp: new Date().toISOString()
      })
      break
    }

    // 找到下一个节点
    const nextEdge = edges.find(e => {
      if (e.source !== currentNodeId) return false
      if (e.condition && currentNode.type === 'condition') {
        return evaluateCondition(e.condition, testData)
      }
      return true
    })

    if (!nextEdge) {
      return {
        success: false,
        errors: [`节点 "${currentNode.data.label}" 没有出口`],
        path
      }
    }

    const nextNode = nodes.find(n => n.id === nextEdge.target)
    if (!nextNode) {
      return {
        success: false,
        errors: ['目标节点不存在'],
        path
      }
    }

    path.push({
      nodeId: nextNode.id,
      nodeName: nextNode.data.label,
      nodeType: nextNode.type,
      condition: nextEdge.condition,
      timestamp: new Date().toISOString()
    })

    currentNodeId = nextNode.id
  }

  return {
    success: true,
    path
  }
}

/**
 * 验证工作流完整性
 */
function validateWorkflow(nodes: FlowNode[], edges: FlowEdge[]): void {
  const errors: string[] = []

  // 检查是否有开始节点
  const startNodes = nodes.filter(n => n.type === 'start')
  if (startNodes.length === 0) {
    errors.push('流程必须包含一个开始节点')
  } else if (startNodes.length > 1) {
    errors.push('流程只能有一个开始节点')
  }

  // 检查是否有结束节点
  const endNodes = nodes.filter(n => n.type === 'end')
  if (endNodes.length === 0) {
    errors.push('流程必须包含至少一个结束节点')
  }

  // 检查所有节点是否都有ID和类型
  nodes.forEach((node, index) => {
    if (!node.id) {
      errors.push(`第 ${index + 1} 个节点缺少ID`)
    }
    if (!node.type) {
      errors.push(`节点 ${node.id || index} 缺少类型`)
    }
    if (!node.data?.label) {
      errors.push(`节点 ${node.id || index} 缺少标签`)
    }
  })

  // 检查所有边是否都有源和目标
  edges.forEach((edge, index) => {
    if (!edge.source) {
      errors.push(`第 ${index + 1} 条连线缺少源节点`)
    }
    if (!edge.target) {
      errors.push(`第 ${index + 1} 条连线缺少目标节点`)
    }
    if (edge.source && !nodes.find(n => n.id === edge.source)) {
      errors.push(`连线 ${index + 1} 引用了不存在的源节点`)
    }
    if (edge.target && !nodes.find(n => n.id === edge.target)) {
      errors.push(`连线 ${index + 1} 引用了不存在的目标节点`)
    }
  })

  // 检查是否有孤立的节点
  const connectedNodeIds = new Set<string>()
  edges.forEach(e => {
    connectedNodeIds.add(e.source)
    connectedNodeIds.add(e.target)
  })

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && node.type !== 'start' && node.type !== 'end') {
      errors.push(`节点 "${node.data.label}" 未连接到流程中`)
    }
  })

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

/**
 * 详细验证工作流
 */
function validateWorkflowDetailed(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const errors: string[] = []

  try {
    validateWorkflow(nodes, edges)
  } catch (error) {
    if (error instanceof Error) {
      errors.push(...error.message.split('\n'))
    }
  }

  // 检查审批节点是否有审批人
  nodes.forEach(node => {
    if (node.type === 'approval' || node.type === 'parallel') {
      if (!node.data.assignee && !node.data.assigneeType) {
        errors.push(`节点 "${node.data.label}" 缺少审批人配置`)
      }
    }
  })

  // 检查条件节点是否有出口分支
  nodes.filter(n => n.type === 'condition').forEach(node => {
    const outEdges = edges.filter(e => e.source === node.id)
    if (outEdges.length < 2) {
      errors.push(`条件节点 "${node.data.label}" 至少需要两个出口分支`)
    }
    const unlabeledEdges = outEdges.filter(e => !e.condition)
    if (unlabeledEdges.length > 1) {
      errors.push(`条件节点 "${node.data.label}" 有多个未标记条件的出口`)
    }
  })

  return errors
}

/**
 * 评估条件表达式
 * 支持简单的条件语法：amount > 1000, status == 'approved', etc.
 */
function evaluateCondition(condition: string, variables: WorkflowVariables): boolean {
  try {
    // 简单的条件表达式解析
    // 支持的运算符: >, <, >=, <=, ==, !=
    const operators = ['>=', '<=', '!=', '==', '>', '<']
    let operator = ''
    let parts: string[] = []

    for (const op of operators) {
      if (condition.includes(op)) {
        operator = op
        parts = condition.split(op).map(p => p.trim())
        break
      }
    }

    if (!operator || parts.length !== 2) {
      // 无法解析条件，默认通过
      return true
    }

    const [left, right] = parts
    const leftValue = variables[left] ?? left
    let rightValue: unknown = right

    // 尝试解析右值为数字
    if (!isNaN(Number(right))) {
      rightValue = Number(right)
    }
    // 解析字符串值（去掉引号）
    else if ((right.startsWith('"') && right.endsWith('"')) ||
             (right.startsWith("'") && right.endsWith("'"))) {
      rightValue = right.slice(1, -1)
    }
    // 解析布尔值
    else if (right === 'true') {
      rightValue = true
    } else if (right === 'false') {
      rightValue = false
    }

    // 执行比较
    switch (operator) {
      case '>':
        return Number(leftValue) > Number(rightValue)
      case '<':
        return Number(leftValue) < Number(rightValue)
      case '>=':
        return Number(leftValue) >= Number(rightValue)
      case '<=':
        return Number(leftValue) <= Number(rightValue)
      case '==':
        return leftValue == rightValue
      case '!=':
        return leftValue != rightValue
      default:
        return true
    }
  } catch {
    // 条件解析失败，默认通过
    return true
  }
}

// 类型定义
export interface WorkflowWithCreator {
  id: string
  name: string
  description: string | null
  entityType: string
  nodes: unknown
  edges: unknown
  version: number
  status: WorkflowStatus
  isDefault: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  creator: {
    id: string
    name: string
    username: string
  }
}

export interface WorkflowInstanceWithWorkflow {
  id: string
  workflowId: string
  entityId: string
  entityType: string
  currentNodeId: string
  status: InstanceStatus
  nodeHistory: unknown
  variables: unknown
  contextData: unknown
  startedAt: Date
  completedAt: Date | null
  workflow: {
    id: string
    name: string
    nodes: unknown
    edges: unknown
  }
}

export interface SimulationNode {
  nodeId: string
  nodeName: string
  nodeType: NodeType
  condition?: string
  timestamp: string
}

export interface SimulationResult {
  success: boolean
  errors?: string[]
  path: SimulationNode[]
}
