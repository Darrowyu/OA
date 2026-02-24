import { ConfigValueType } from '@prisma/client';

/**
 * 默认配置数据
 * 系统初始化时自动加载这些配置项
 */

export interface DefaultConfig {
  categoryCode: string;
  key: string;
  value: string;
  defaultValue?: string;
  valueType: ConfigValueType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: unknown }>;
  validation?: Record<string, unknown>;
  isSecret?: boolean;
  isSystem?: boolean;
  sortOrder?: number;
}

/**
 * 系统基础配置
 */
const systemConfigs: DefaultConfig[] = [
  {
    categoryCode: 'system',
    key: 'system.name',
    value: 'OA办公系统',
    valueType: ConfigValueType.STRING,
    label: '系统名称',
    description: '显示在页面标题和登录页的系统名称',
    sortOrder: 1,
  },
  {
    categoryCode: 'system',
    key: 'system.logo',
    value: '/logo.png',
    valueType: ConfigValueType.STRING,
    label: '系统Logo',
    description: '系统Logo图片地址',
    sortOrder: 2,
  },
  {
    categoryCode: 'system',
    key: 'system.sessionTimeout',
    value: '30',
    defaultValue: '30',
    valueType: ConfigValueType.NUMBER,
    label: '会话超时时间',
    description: '用户无操作后自动登出的时间（分钟）',
    placeholder: '30',
    validation: { required: true, min: 5, max: 1440 },
    sortOrder: 3,
  },
  {
    categoryCode: 'system',
    key: 'system.timezone',
    value: 'Asia/Shanghai',
    defaultValue: 'Asia/Shanghai',
    valueType: ConfigValueType.STRING,
    label: '系统时区',
    description: '系统默认时区设置',
    options: [
      { label: '北京时间', value: 'Asia/Shanghai' },
      { label: '东京时间', value: 'Asia/Tokyo' },
      { label: '纽约时间', value: 'America/New_York' },
      { label: '伦敦时间', value: 'Europe/London' },
    ],
    sortOrder: 4,
  },
];

/**
 * 安全设置配置
 */
const securityConfigs: DefaultConfig[] = [
  {
    categoryCode: 'security',
    key: 'security.password.minLength',
    value: '8',
    defaultValue: '8',
    valueType: ConfigValueType.NUMBER,
    label: '密码最小长度',
    description: '用户密码的最小字符数',
    validation: { required: true, min: 6, max: 32 },
    sortOrder: 1,
  },
  {
    categoryCode: 'security',
    key: 'security.password.requireComplexity',
    value: 'true',
    defaultValue: 'true',
    valueType: ConfigValueType.BOOLEAN,
    label: '要求密码复杂度',
    description: '是否要求密码包含大小写字母、数字和特殊字符',
    sortOrder: 2,
  },
  {
    categoryCode: 'security',
    key: 'security.password.expiryDays',
    value: '90',
    defaultValue: '90',
    valueType: ConfigValueType.NUMBER,
    label: '密码过期天数',
    description: '密码多少天后必须更换（0表示永不过期）',
    validation: { min: 0, max: 365 },
    sortOrder: 3,
  },
  {
    categoryCode: 'security',
    key: 'security.login.maxAttempts',
    value: '5',
    defaultValue: '5',
    valueType: ConfigValueType.NUMBER,
    label: '登录失败次数',
    description: '连续登录失败多少次后锁定账号',
    validation: { required: true, min: 3, max: 10 },
    sortOrder: 4,
  },
  {
    categoryCode: 'security',
    key: 'security.login.lockDuration',
    value: '30',
    defaultValue: '30',
    valueType: ConfigValueType.NUMBER,
    label: '账号锁定时间',
    description: '账号锁定后多少分钟自动解锁',
    validation: { required: true, min: 5, max: 1440 },
    sortOrder: 5,
  },
];

/**
 * 邮件通知配置
 */
const notificationConfigs: DefaultConfig[] = [
  {
    categoryCode: 'notification',
    key: 'email.enabled',
    value: 'true',
    defaultValue: 'true',
    valueType: ConfigValueType.BOOLEAN,
    label: '启用邮件通知',
    description: '是否启用系统邮件通知功能',
    sortOrder: 1,
  },
  {
    categoryCode: 'notification',
    key: 'email.smtp.host',
    value: '',
    valueType: ConfigValueType.STRING,
    label: 'SMTP服务器',
    description: '邮件服务器地址',
    placeholder: 'smtp.example.com',
    sortOrder: 2,
  },
  {
    categoryCode: 'notification',
    key: 'email.smtp.port',
    value: '587',
    defaultValue: '587',
    valueType: ConfigValueType.NUMBER,
    label: 'SMTP端口',
    description: '邮件服务器端口',
    options: [
      { label: '25', value: 25 },
      { label: '465 (SSL)', value: 465 },
      { label: '587 (TLS)', value: 587 },
    ],
    sortOrder: 3,
  },
  {
    categoryCode: 'notification',
    key: 'email.smtp.user',
    value: '',
    valueType: ConfigValueType.STRING,
    label: '发件人邮箱',
    description: '系统发件邮箱地址',
    placeholder: 'noreply@company.com',
    validation: { email: true },
    sortOrder: 4,
  },
  {
    categoryCode: 'notification',
    key: 'email.smtp.password',
    value: '',
    valueType: ConfigValueType.STRING,
    label: '邮箱密码/授权码',
    description: '邮箱密码或SMTP授权码',
    isSecret: true,
    sortOrder: 5,
  },
];

/**
 * 审批流程配置
 */
const approvalConfigs: DefaultConfig[] = [
  {
    categoryCode: 'approval',
    key: 'approval.defaultFlowEnabled',
    value: 'true',
    defaultValue: 'true',
    valueType: ConfigValueType.BOOLEAN,
    label: '启用默认审批流',
    description: '是否启用系统默认审批流程',
    sortOrder: 1,
  },
  {
    categoryCode: 'approval',
    key: 'approval.ceoApprovalThreshold',
    value: '100000',
    defaultValue: '100000',
    valueType: ConfigValueType.NUMBER,
    label: 'CEO审批金额阈值',
    description: '超过此金额需要CEO审批（元）',
    validation: { min: 0 },
    sortOrder: 2,
  },
  {
    categoryCode: 'approval',
    key: 'approval.timeoutHours',
    value: '48',
    defaultValue: '48',
    valueType: ConfigValueType.NUMBER,
    label: '审批超时时间',
    description: '审批人需在多少小时内处理（0表示不限制）',
    validation: { min: 0 },
    sortOrder: 3,
  },
];

/**
 * 考勤管理配置
 */
const attendanceConfigs: DefaultConfig[] = [
  {
    categoryCode: 'attendance',
    key: 'attendance.workStartTime',
    value: '09:00',
    defaultValue: '09:00',
    valueType: ConfigValueType.STRING,
    label: '上班时间',
    description: '标准上班时间',
    placeholder: '09:00',
    sortOrder: 1,
  },
  {
    categoryCode: 'attendance',
    key: 'attendance.workEndTime',
    value: '18:00',
    defaultValue: '18:00',
    valueType: ConfigValueType.STRING,
    label: '下班时间',
    description: '标准下班时间',
    placeholder: '18:00',
    sortOrder: 2,
  },
  {
    categoryCode: 'attendance',
    key: 'attendance.lateThresholdMinutes',
    value: '15',
    defaultValue: '15',
    valueType: ConfigValueType.NUMBER,
    label: '迟到阈值',
    description: '晚于上班时间多少分钟算迟到',
    validation: { min: 0, max: 120 },
    sortOrder: 3,
  },
  {
    categoryCode: 'attendance',
    key: 'attendance.earlyLeaveThresholdMinutes',
    value: '15',
    defaultValue: '15',
    valueType: ConfigValueType.NUMBER,
    label: '早退阈值',
    description: '早于下班时间多少分钟算早退',
    validation: { min: 0, max: 120 },
    sortOrder: 4,
  },
];

/**
 * 任务管理配置
 */
const taskConfigs: DefaultConfig[] = [
  {
    categoryCode: 'task',
    key: 'task.defaultPriority',
    value: 'medium',
    defaultValue: 'medium',
    valueType: ConfigValueType.STRING,
    label: '默认优先级',
    description: '新建任务的默认优先级',
    options: [
      { label: '高', value: 'high' },
      { label: '中', value: 'medium' },
      { label: '低', value: 'low' },
    ],
    sortOrder: 1,
  },
  {
    categoryCode: 'task',
    key: 'task.reminderBeforeHours',
    value: '24',
    defaultValue: '24',
    valueType: ConfigValueType.NUMBER,
    label: '任务提醒时间',
    description: '截止前多少小时发送提醒',
    validation: { min: 1, max: 168 },
    sortOrder: 2,
  },
];

/**
 * 设备管理配置
 */
const equipmentConfigs: DefaultConfig[] = [
  {
    categoryCode: 'equipment',
    key: 'equipment.maintenanceReminderDays',
    value: '7',
    defaultValue: '7',
    valueType: ConfigValueType.NUMBER,
    label: '保养提醒天数',
    description: '保养到期前多少天发送提醒',
    validation: { min: 1, max: 30 },
    sortOrder: 1,
  },
  {
    categoryCode: 'equipment',
    key: 'equipment.lowStockThreshold',
    value: '10',
    defaultValue: '10',
    valueType: ConfigValueType.NUMBER,
    label: '库存预警阈值',
    description: '配件库存低于此数量时预警',
    validation: { min: 1 },
    sortOrder: 2,
  },
];

/**
 * 文档管理配置
 */
const documentConfigs: DefaultConfig[] = [
  {
    categoryCode: 'document',
    key: 'document.maxFileSizeMB',
    value: '50',
    defaultValue: '50',
    valueType: ConfigValueType.NUMBER,
    label: '单文件大小限制',
    description: '上传文件的单个大小限制（MB）',
    validation: { min: 1, max: 500 },
    sortOrder: 1,
  },
  {
    categoryCode: 'document',
    key: 'document.allowedFileTypes',
    value: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar',
    defaultValue: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar',
    valueType: ConfigValueType.STRING,
    label: '允许的文件类型',
    description: '允许上传的文件扩展名，逗号分隔',
    placeholder: 'pdf,doc,docx,xls,xlsx',
    sortOrder: 2,
  },
  {
    categoryCode: 'document',
    key: 'document.userStorageQuotaMB',
    value: '1024',
    defaultValue: '1024',
    valueType: ConfigValueType.NUMBER,
    label: '用户存储配额',
    description: '每个用户的存储空间配额（MB）',
    validation: { min: 100 },
    sortOrder: 3,
  },
];

/**
 * 获取所有默认配置
 */
export function getDefaultConfigs(): DefaultConfig[] {
  return [
    ...systemConfigs,
    ...securityConfigs,
    ...notificationConfigs,
    ...approvalConfigs,
    ...attendanceConfigs,
    ...taskConfigs,
    ...equipmentConfigs,
    ...documentConfigs,
  ];
}
