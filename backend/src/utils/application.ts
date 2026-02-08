import { ApplicationStatus, Priority } from '@prisma/client';

/**
 * 生成申请编号
 * 格式: APP-YYYYMMDD-XXXX (XXXX为4位序号)
 */
export function generateApplicationNo(existingNos: string[] = []): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const prefix = `APP-${dateStr}-`;

  // 获取当天已有的序号
  const todayNumbers = existingNos
    .filter(no => no.startsWith(prefix))
    .map(no => {
      const match = no.match(/-(\d{4})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const maxNum = todayNumbers.length > 0 ? Math.max(...todayNumbers) : 0;
  const nextNum = String(maxNum + 1).padStart(4, '0');

  return `${prefix}${nextNum}`;
}

/**
 * 解析金额字符串为数字
 * 支持格式: "1000", "1,000", "1,000.50", "1000.5"
 */
export function parseAmount(amountStr: string | number | null | undefined): number | null {
  if (amountStr === null || amountStr === undefined) return null;
  if (typeof amountStr === 'number') return amountStr;

  const cleaned = amountStr.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * 格式化金额为显示字符串
 */
export function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 获取下一审批状态
 */
export function getNextStatus(
  currentStatus: ApplicationStatus,
  action: 'APPROVE' | 'REJECT',
  options?: {
    skipManager?: boolean;
    isSpecialManager?: boolean;
  }
): ApplicationStatus {
  if (action === 'REJECT') {
    return ApplicationStatus.REJECTED;
  }

  const statusFlow: Record<ApplicationStatus, ApplicationStatus> = {
    [ApplicationStatus.DRAFT]: ApplicationStatus.PENDING_FACTORY,
    [ApplicationStatus.PENDING_FACTORY]: ApplicationStatus.PENDING_DIRECTOR,
    [ApplicationStatus.PENDING_DIRECTOR]: options?.skipManager
      ? ApplicationStatus.PENDING_CEO
      : ApplicationStatus.PENDING_MANAGER,
    [ApplicationStatus.PENDING_MANAGER]: options?.isSpecialManager
      ? ApplicationStatus.APPROVED
      : ApplicationStatus.PENDING_CEO,
    [ApplicationStatus.PENDING_CEO]: ApplicationStatus.APPROVED,
    [ApplicationStatus.APPROVED]: ApplicationStatus.APPROVED,
    [ApplicationStatus.REJECTED]: ApplicationStatus.REJECTED,
    [ApplicationStatus.ARCHIVED]: ApplicationStatus.ARCHIVED,
  };

  return statusFlow[currentStatus] || currentStatus;
}

/**
 * 检查申请是否需要CEO审批
 * 规则: 金额 > 100000 或 总监未选择跳过经理
 */
export function needsCeoApproval(amount: number | null, skipManager: boolean): boolean {
  if (amount !== null && amount > 100000) return true;
  return !skipManager;
}

export { isSpecialManager } from '../config/special-rules'; // 重新导出配置函数保持向后兼容

/**
 * 获取状态显示文本
 */
export function getStatusText(status: ApplicationStatus): string {
  const statusMap: Record<ApplicationStatus, string> = {
    [ApplicationStatus.DRAFT]: '草稿',
    [ApplicationStatus.PENDING_FACTORY]: '待厂长审批',
    [ApplicationStatus.PENDING_DIRECTOR]: '待总监审批',
    [ApplicationStatus.PENDING_MANAGER]: '待经理审批',
    [ApplicationStatus.PENDING_CEO]: '待CEO审批',
    [ApplicationStatus.APPROVED]: '已通过',
    [ApplicationStatus.REJECTED]: '已拒绝',
    [ApplicationStatus.ARCHIVED]: '已归档',
  };
  return statusMap[status] || status;
}

/**
 * 获取优先级显示文本
 */
export function getPriorityText(priority: Priority): string {
  const priorityMap: Record<Priority, string> = {
    [Priority.LOW]: '低',
    [Priority.NORMAL]: '普通',
    [Priority.HIGH]: '高',
    [Priority.URGENT]: '紧急',
  };
  return priorityMap[priority] || priority;
}

/**
 * 检查用户是否可以审批该申请
 */
export function canApprove(
  userRole: string,
  userId: string,
  application: {
    status: ApplicationStatus;
    factoryManagerIds: string[];
    managerIds: string[];
  }
): boolean {
  switch (application.status) {
    case ApplicationStatus.PENDING_FACTORY:
      return application.factoryManagerIds.includes(userId);
    case ApplicationStatus.PENDING_DIRECTOR:
      return userRole === 'DIRECTOR';
    case ApplicationStatus.PENDING_MANAGER:
      return application.managerIds.includes(userId);
    case ApplicationStatus.PENDING_CEO:
      return userRole === 'CEO';
    default:
      return false;
  }
}

/**
 * 检查申请是否已完成
 */
export function isApplicationFinal(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.APPROVED || status === ApplicationStatus.REJECTED;
}

/**
 * 检查是否需要通知只读用户
 * 规则: 金额 > 100000 且审批通过
 */
export function shouldNotifyReadonly(amount: number | null): boolean {
  return amount !== null && amount > 100000;
}
