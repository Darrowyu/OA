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

// 货币枚举
export enum Currency {
  CNY = 'CNY',
  USD = 'USD',
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
  createdAt: string;
  updatedAt?: string;
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
  currency: Currency;
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
  currency?: Currency;
  priority: Priority;
  factoryManagerIds: string[];
  managerIds: string[];
  skipManager: boolean;
  attachmentIds?: string[];
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

// ============================================
// 组织架构管理类型
// ============================================

// 部门类型
export interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  managerId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  parent?: {
    id: string;
    name: string;
    code: string;
  } | null;
  children?: Department[];
  userCount?: number;
}

// 部门树节点
export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

// 创建部门请求
export interface CreateDepartmentRequest {
  name: string;
  code: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 更新部门请求
export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

// 部门成员
export interface DepartmentUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  position?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// 通知中心类型定义
// ============================================

// 通知类型枚举
export enum NotificationType {
  APPROVAL = 'APPROVAL',    // 审批通知
  SYSTEM = 'SYSTEM',        // 系统通知
  MESSAGE = 'MESSAGE',      // 消息通知
  TASK = 'TASK',            // 任务通知
}

// 通知数据类型
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// 分页通知响应
export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// WebSocket 连接状态
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// 通知上下文状态
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  wsStatus: WebSocketStatus;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

// ============================================
// 公告通知模块类型定义
// ============================================

// 公告类型枚举
export enum AnnouncementType {
  COMPANY = 'COMPANY',      // 公司公告
  DEPARTMENT = 'DEPARTMENT', // 部门公告
  SYSTEM = 'SYSTEM',        // 系统通知
}

// 公告附件类型
export interface AnnouncementAttachment {
  name: string;
  url: string;
  size: number;
}

// 公告类型
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetDepts?: string[];
  isTop: boolean;
  validFrom: string;
  validUntil?: string;
  attachments?: AnnouncementAttachment[];
  viewCount: number;
  authorId: string;
  authorName?: string;
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 阅读统计用户
export interface ReadUser {
  id: string;
  name: string;
  department: string;
  readAt: string;
}

export interface UnreadUser {
  id: string;
  name: string;
  department: string;
}

// 公告阅读统计
export interface AnnouncementReadStats {
  totalUsers: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
  readUsers: ReadUser[];
  unreadUsers: UnreadUser[];
}
