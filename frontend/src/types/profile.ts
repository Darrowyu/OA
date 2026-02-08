// 主题类型
export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

// 界面密度类型
export enum InterfaceDensity {
  COMPACT = 'COMPACT',
  DEFAULT = 'DEFAULT',
  COMFORTABLE = 'COMFORTABLE',
}

// 个人资料可见性
export enum ProfileVisibility {
  EVERYONE = 'EVERYONE',
  COLLEAGUES = 'COLLEAGUES',
  DEPARTMENT = 'DEPARTMENT',
}

// 在线状态
export enum OnlineStatus {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
}

// 通知频率
export enum NotificationFrequency {
  INSTANT = 'INSTANT',
  DIGEST = 'DIGEST',
  OFF = 'OFF',
}

// 用户偏好设置
export interface UserPreference {
  id: string;
  userId: string;
  theme: Theme;
  interfaceDensity: InterfaceDensity;
  sidebarCollapsed: boolean;
  emailNotifications: boolean;
  approvalNotifications: NotificationFrequency;
  systemAnnouncements: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  profileVisibility: ProfileVisibility;
  onlineStatus: OnlineStatus;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 登录设备
export interface UserDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  lastActiveAt: string;
  isCurrent: boolean;
  createdAt: string;
}

// 完整个人资料
export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  position?: string;
  employeeId: string;
  avatar?: string;
  signature?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  preference?: UserPreference;
}

// 更新基础信息请求
export interface UpdateBasicInfoRequest {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
}

// 修改密码请求
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 更新偏好设置请求
export interface UpdatePreferencesRequest {
  theme?: Theme;
  interfaceDensity?: InterfaceDensity;
  sidebarCollapsed?: boolean;
  emailNotifications?: boolean;
  approvalNotifications?: NotificationFrequency;
  systemAnnouncements?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  profileVisibility?: ProfileVisibility;
  onlineStatus?: OnlineStatus;
}

// 2FA 设置响应
export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

// 2FA 验证请求
export interface TwoFactorVerifyRequest {
  code: string;
}

// 2FA 禁用请求
export interface TwoFactorDisableRequest {
  password: string;
}

// 更新签名请求
export interface UpdateSignatureRequest {
  signature: string;
}

// 个人数据导出
export interface PersonalDataExport {
  exportDate: string;
  user: {
    username: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    department: string;
    position?: string;
    employeeId: string;
    createdAt: string;
  };
  preferences?: UserPreference;
  applications: Array<{
    applicationNo: string;
    title: string;
    status: string;
    createdAt: string;
    completedAt?: string;
  }>;
  approvals: Array<{
    action: string;
    comment?: string;
    approvedAt?: string;
    application: {
      applicationNo: string;
      title: string;
    };
  }>;
}
