// 业务错误码定义
// 格式: 模块_错误描述

// 通用错误 (COMMON)
export const COMMON_ERRORS = {
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '服务器内部错误', status: 500 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: '参数验证失败', status: 400 },
  NOT_FOUND: { code: 'NOT_FOUND', message: '请求的资源不存在', status: 404 },
  DUPLICATE_ENTRY: { code: 'DUPLICATE_ENTRY', message: '数据已存在', status: 409 },
  FOREIGN_KEY_CONSTRAINT: { code: 'FOREIGN_KEY_CONSTRAINT', message: '关联数据不存在', status: 400 },
  MISSING_FIELDS: { code: 'MISSING_FIELDS', message: '缺少必填字段', status: 400 },
  INVALID_FORMAT: { code: 'INVALID_FORMAT', message: '数据格式不正确', status: 400 },
} as const;

// 认证授权错误 (AUTH)
export const AUTH_ERRORS = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: '请先登录', status: 401 },
  TOKEN_EXPIRED: { code: 'TOKEN_EXPIRED', message: '认证令牌已过期', status: 401 },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', message: '无效的认证令牌', status: 401 },
  MISSING_TOKEN: { code: 'MISSING_TOKEN', message: '请提供认证令牌', status: 400 },
  FORBIDDEN: { code: 'FORBIDDEN', message: '您没有权限执行此操作', status: 403 },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误', status: 401 },
  USER_INACTIVE: { code: 'USER_INACTIVE', message: '用户已被禁用', status: 403 },
  INVALID_OLD_PASSWORD: { code: 'INVALID_OLD_PASSWORD', message: '旧密码不正确', status: 400 },
} as const;

// 用户相关错误 (USER)
export const USER_ERRORS = {
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: '用户不存在', status: 404 },
  USERNAME_EXISTS: { code: 'USERNAME_EXISTS', message: '用户名已被使用', status: 409 },
  EMAIL_EXISTS: { code: 'EMAIL_EXISTS', message: '邮箱已被注册', status: 409 },
  EMPLOYEE_ID_EXISTS: { code: 'EMPLOYEE_ID_EXISTS', message: '工号已被使用', status: 409 },
  INVALID_USERNAME: { code: 'INVALID_USERNAME', message: '用户名只能包含字母、数字和下划线，长度3-20位', status: 400 },
  WEAK_PASSWORD: { code: 'WEAK_PASSWORD', message: '密码长度至少为6位', status: 400 },
  INVALID_EMAIL: { code: 'INVALID_EMAIL', message: '邮箱格式不正确', status: 400 },
  CANNOT_DELETE_SELF: { code: 'CANNOT_DELETE_SELF', message: '不能删除当前登录用户', status: 403 },
  TOO_MANY_USERS: { code: 'TOO_MANY_USERS', message: '单次导入用户数量不能超过100', status: 400 },
  INVALID_IMPORT_DATA: { code: 'INVALID_IMPORT_DATA', message: '请提供有效的用户数据数组', status: 400 },
} as const;

// 申请相关错误 (APPLICATION)
export const APPLICATION_ERRORS = {
  APPLICATION_NOT_FOUND: { code: 'APPLICATION_NOT_FOUND', message: '申请不存在', status: 404 },
  INVALID_STATUS: { code: 'INVALID_STATUS', message: '申请状态不正确', status: 400 },
  CANNOT_MODIFY: { code: 'CANNOT_MODIFY', message: '只能修改草稿状态的申请', status: 400 },
  CANNOT_DELETE: { code: 'CANNOT_DELETE', message: '只能删除草稿或已拒绝的申请', status: 400 },
  CANNOT_SUBMIT: { code: 'CANNOT_SUBMIT', message: '只能提交草稿状态的申请', status: 400 },
  NO_APPROVAL_PERMISSION: { code: 'NO_APPROVAL_PERMISSION', message: '无权审批此申请', status: 403 },
  NOT_ASSIGNED_APPROVER: { code: 'NOT_ASSIGNED_APPROVER', message: '您不是该申请的指定审批人', status: 403 },
  INVALID_APPROVAL_ACTION: { code: 'INVALID_APPROVAL_ACTION', message: '无效的审批操作', status: 400 },
  MANAGER_REQUIRED: { code: 'MANAGER_REQUIRED', message: '请选择审批经理', status: 400 },
  FACTORY_MANAGER_REQUIRED: { code: 'FACTORY_MANAGER_REQUIRED', message: '请选择厂长', status: 400 },
  TITLE_REQUIRED: { code: 'TITLE_REQUIRED', message: '标题不能为空', status: 400 },
  CONTENT_REQUIRED: { code: 'CONTENT_REQUIRED', message: '内容不能为空', status: 400 },
  NO_WITHDRAW_PERMISSION: { code: 'NO_WITHDRAW_PERMISSION', message: '无权撤回此审批', status: 403 },
  NO_APPROVAL_RECORD: { code: 'NO_APPROVAL_RECORD', message: '您没有该申请的审批记录', status: 400 },
  CANNOT_WITHDRAW: { code: 'CANNOT_WITHDRAW', message: '当前申请状态不允许撤回审批', status: 400 },
} as const;

// 审批相关错误 (APPROVAL)
export const APPROVAL_ERRORS = {
  APPROVAL_NOT_FOUND: { code: 'APPROVAL_NOT_FOUND', message: '审批记录不存在', status: 404 },
  INVALID_APPROVAL_LEVEL: { code: 'INVALID_APPROVAL_LEVEL', message: '无效的审批级别', status: 400 },
  ALREADY_APPROVED: { code: 'ALREADY_APPROVED', message: '您已审批过此申请', status: 400 },
} as const;

// 设备相关错误 (EQUIPMENT)
export const EQUIPMENT_ERRORS = {
  EQUIPMENT_NOT_FOUND: { code: 'EQUIPMENT_NOT_FOUND', message: '设备不存在', status: 404 },
  EQUIPMENT_CODE_EXISTS: { code: 'EQUIPMENT_CODE_EXISTS', message: '设备编号已存在', status: 409 },
  INVALID_EQUIPMENT_STATUS: { code: 'INVALID_EQUIPMENT_STATUS', message: '无效的设备状态', status: 400 },
  RECORD_NOT_FOUND: { code: 'RECORD_NOT_FOUND', message: '记录不存在', status: 404 },
  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', message: '计划不存在', status: 404 },
  TEMPLATE_NOT_FOUND: { code: 'TEMPLATE_NOT_FOUND', message: '模板不存在', status: 404 },
} as const;

// 配件相关错误 (PART)
export const PART_ERRORS = {
  PART_NOT_FOUND: { code: 'PART_NOT_FOUND', message: '配件不存在', status: 404 },
  PART_CODE_EXISTS: { code: 'PART_CODE_EXISTS', message: '配件编号已存在', status: 409 },
  INSUFFICIENT_STOCK: { code: 'INSUFFICIENT_STOCK', message: '库存不足', status: 400 },
  USAGE_NOT_FOUND: { code: 'USAGE_NOT_FOUND', message: '领用申请不存在', status: 404 },
  SCRAP_NOT_FOUND: { code: 'SCRAP_NOT_FOUND', message: '报废申请不存在', status: 404 },
  LIFECYCLE_NOT_FOUND: { code: 'LIFECYCLE_NOT_FOUND', message: '生命周期记录不存在', status: 404 },
} as const;

// 文件相关错误 (FILE)
export const FILE_ERRORS = {
  FILE_NOT_FOUND: { code: 'FILE_NOT_FOUND', message: '文件不存在', status: 404 },
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', message: '文件大小超过限制', status: 400 },
  INVALID_FILE_TYPE: { code: 'INVALID_FILE_TYPE', message: '不支持的文件类型', status: 400 },
  UPLOAD_FAILED: { code: 'UPLOAD_FAILED', message: '文件上传失败', status: 500 },
} as const;

// 导出相关错误 (EXPORT)
export const EXPORT_ERRORS = {
  EXPORT_FAILED: { code: 'EXPORT_FAILED', message: '导出失败', status: 500 },
  NO_DATA_TO_EXPORT: { code: 'NO_DATA_TO_EXPORT', message: '没有可导出的数据', status: 400 },
} as const;

// 归档相关错误 (ARCHIVE)
export const ARCHIVE_ERRORS = {
  ARCHIVE_FAILED: { code: 'ARCHIVE_FAILED', message: '归档失败', status: 500 },
  ALREADY_ARCHIVED: { code: 'ALREADY_ARCHIVED', message: '申请已归档', status: 400 },
  CANNOT_ARCHIVE: { code: 'CANNOT_ARCHIVE', message: '当前状态无法归档', status: 400 },
  REVERT_FAILED: { code: 'REVERT_FAILED', message: '撤销审批失败', status: 500 },
  CANNOT_REVERT: { code: 'CANNOT_REVERT', message: '只能撤回已通过的申请', status: 400 },
} as const;

// 合并所有错误码
export const ERROR_CODES = {
  ...COMMON_ERRORS,
  ...AUTH_ERRORS,
  ...USER_ERRORS,
  ...APPLICATION_ERRORS,
  ...APPROVAL_ERRORS,
  ...EQUIPMENT_ERRORS,
  ...PART_ERRORS,
  ...FILE_ERRORS,
  ...EXPORT_ERRORS,
  ...ARCHIVE_ERRORS,
} as const;

// 错误码类型
export type ErrorCode = keyof typeof ERROR_CODES;
export type ErrorInfo = typeof ERROR_CODES[ErrorCode];

// 获取错误信息
export function getErrorInfo(code: ErrorCode): ErrorInfo {
  return ERROR_CODES[code] || COMMON_ERRORS.INTERNAL_ERROR;
}
