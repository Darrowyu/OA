/**
 * 安全工具函数
 */

/**
 * 脱敏敏感数据
 * 将敏感数据（如密码）替换为星号
 * @param value 原始值
 * @param visibleLength 可见字符数（默认显示前2后2）
 * @returns 脱敏后的值
 */
export function maskSecret(value: string, visibleLength = 2): string {
  if (!value || value.length <= visibleLength * 2) {
    return '***';
  }

  const prefix = value.slice(0, visibleLength);
  const suffix = value.slice(-visibleLength);
  const maskedLength = value.length - visibleLength * 2;

  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * 判断是否需要脱敏
 * 根据配置键名判断是否为敏感配置
 * @param key 配置键名
 * @returns 是否需要脱敏
 */
export function shouldMaskValue(key: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credential/i,
    /auth/i,
    /private/i,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(key));
}

/**
 * 安全的错误消息
 * 生产环境不暴露内部错误详情
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @returns 安全的错误消息
 */
export function getSafeErrorMessage(
  error: unknown,
  defaultMessage = '操作失败'
): string {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev && error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}

/**
 * 记录安全日志
 * 记录敏感操作但不暴露敏感数据
 * @param action 操作类型
 * @param details 操作详情（敏感数据会被脱敏）
 */
export function logSecurityEvent(
  action: string,
  details: Record<string, unknown>
): void {
  // eslint-disable-next-line no-console
  console.log(`[Security] ${action}`, {
    ...details,
    timestamp: new Date().toISOString(),
  });
}
