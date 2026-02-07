// 申请状态枚举
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  PENDING_FACTORY = 'PENDING_FACTORY',
  PENDING_DIRECTOR = 'PENDING_DIRECTOR',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_CEO = 'PENDING_CEO',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

// 优先级枚举
export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// 用户角色枚举
export enum UserRole {
  USER = 'USER',
  FACTORY_MANAGER = 'FACTORY_MANAGER',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  CEO = 'CEO',
  ADMIN = 'ADMIN',
  READONLY = 'READONLY',
}

// 审批动作类型
export type ApprovalAction = 'APPROVE' | 'REJECT';

// 用户类型
export interface User {
  id: string;
  username: string;
  employeeId: string;
  name: string;
  role: UserRole;
  department: string;
  email: string;
  canSubmitApplication: boolean;
}

// 审批记录类型
export interface ApprovalRecord {
  id: string;
  applicationId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  action: ApprovalAction;
  comment: string | null;
  createdAt: string;
}

// 申请类型
export interface Application {
  id: string;
  applicationNo: string;
  title: string;
  content: string;
  amount: number | null;
  priority: Priority;
  status: ApplicationStatus;
  submitterId: string;
  submitterName: string;
  submitterDepartment: string;
  factoryManagerIds: string[];
  managerIds: string[];
  skipManager: boolean;
  currentApproverId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  attachments: Attachment[];
  approvals: ApprovalRecord[];
}

// 附件类型
export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
}

// 创建申请请求类型
export interface CreateApplicationRequest {
  title: string;
  content: string;
  amount?: number;
  priority: Priority;
  factoryManagerIds: string[];
  managerIds: string[];
  skipManager: boolean;
}

// 审批申请请求类型
export interface ApproveApplicationRequest {
  action: ApprovalAction;
  comment?: string;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 申请筛选条件
export interface ApplicationFilter {
  status?: ApplicationStatus;
  priority?: Priority;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}
