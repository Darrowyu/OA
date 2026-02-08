import apiClient from '@/lib/api';

// 节点类型
export type NodeType = 'start' | 'approval' | 'condition' | 'parallel' | 'end';
export type AssigneeType = 'user' | 'role' | 'department' | 'applicant';
export type ParallelType = 'all' | 'any';

// 流程节点
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    assignee?: string;
    assigneeType?: AssigneeType;
    condition?: string;
    parallelType?: ParallelType;
    timeout?: number;
    reminder?: number;
    description?: string;
  };
}

// 流程连线
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

// 工作流状态
export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// 工作流定义
export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  version: number;
  status: WorkflowStatus;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    username: string;
  };
}

// 实例状态
export type InstanceStatus = 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'SUSPENDED';

// 节点历史
export interface NodeHistory {
  nodeId: string;
  nodeName: string;
  action: 'enter' | 'complete' | 'reject';
  userId?: string;
  username?: string;
  comment?: string;
  timestamp: string;
}

// 工作流实例
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  entityId: string;
  entityType: string;
  currentNodeId: string;
  status: InstanceStatus;
  nodeHistory: NodeHistory[];
  variables: Record<string, unknown>;
  contextData: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  workflow: {
    id: string;
    name: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
}

// 模拟结果
export interface SimulationNode {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  condition?: string;
  timestamp: string;
}

export interface SimulationResult {
  success: boolean;
  errors?: string[];
  path: SimulationNode[];
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 创建工作流数据
export interface CreateWorkflowData {
  name: string;
  description?: string;
  entityType: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// 工作流服务
export const workflowApi = {
  // 获取工作流列表
  getWorkflows: (entityType?: string): Promise<ApiResponse<Workflow[]>> =>
    apiClient.get<ApiResponse<Workflow[]>>('/workflows', { params: { entityType } }),

  // 获取工作流详情
  getWorkflowById: (id: string): Promise<ApiResponse<Workflow>> =>
    apiClient.get<ApiResponse<Workflow>>(`/workflows/${id}`),

  // 创建工作流
  createWorkflow: (data: CreateWorkflowData): Promise<ApiResponse<Workflow>> =>
    apiClient.post<ApiResponse<Workflow>>('/workflows', data),

  // 更新工作流
  updateWorkflow: (id: string, data: Partial<CreateWorkflowData>): Promise<ApiResponse<Workflow>> =>
    apiClient.put<ApiResponse<Workflow>>(`/workflows/${id}`, data),

  // 删除工作流
  deleteWorkflow: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<ApiResponse<void>>(`/workflows/${id}`),

  // 发布工作流
  publishWorkflow: (id: string): Promise<ApiResponse<Workflow>> =>
    apiClient.post<ApiResponse<Workflow>>(`/workflows/${id}/publish`),

  // 设置默认工作流
  setDefaultWorkflow: (id: string): Promise<ApiResponse<Workflow>> =>
    apiClient.post<ApiResponse<Workflow>>(`/workflows/${id}/default`),

  // 模拟工作流
  simulateWorkflow: (id: string, testData: Record<string, unknown>): Promise<ApiResponse<SimulationResult>> =>
    apiClient.post<ApiResponse<SimulationResult>>(`/workflows/${id}/simulate`, { testData }),

  // 启动工作流实例
  startWorkflow: (data: {
    workflowId: string;
    entityId: string;
    entityType: string;
    variables?: Record<string, unknown>;
    contextData?: Record<string, unknown>;
  }): Promise<ApiResponse<WorkflowInstance>> =>
    apiClient.post<ApiResponse<WorkflowInstance>>('/workflows/instances/start', data),

  // 获取工作流实例
  getWorkflowInstance: (id: string): Promise<ApiResponse<WorkflowInstance>> =>
    apiClient.get<ApiResponse<WorkflowInstance>>(`/workflows/instances/${id}`),

  // 处理流程节点
  processNode: (id: string, data: {
    action: 'approve' | 'reject';
    comment?: string;
  }): Promise<ApiResponse<WorkflowInstance>> =>
    apiClient.post<ApiResponse<WorkflowInstance>>(`/workflows/instances/${id}/process`, data),

  // 获取实体的流程实例列表
  getEntityInstances: (entityType: string, entityId: string): Promise<ApiResponse<WorkflowInstance[]>> =>
    apiClient.get<ApiResponse<WorkflowInstance[]>>(`/workflows/instances/entity/${entityType}/${entityId}`),
};
