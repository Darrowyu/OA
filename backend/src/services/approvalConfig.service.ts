import { configService } from './config.service';
import logger from '../lib/logger';

/**
 * 审批配置服务
 * 封装从系统配置读取审批相关配置的接口
 */

export interface ApprovalConfig {
  /** 默认审批流是否启用 */
  defaultFlowEnabled: boolean;
  /** CEO审批金额阈值（元） */
  ceoApprovalThreshold: number;
  /** 审批超时时间（小时） */
  timeoutHours: number;
}

/**
 * 获取审批配置
 */
export async function getApprovalConfig(): Promise<ApprovalConfig> {
  try {
    const [defaultFlowEnabledRaw, ceoApprovalThresholdRaw, timeoutHoursRaw] = await Promise.all([
      configService.getValue<boolean>('approval.defaultFlowEnabled', true),
      configService.getValue<number>('approval.ceoApprovalThreshold', 100000),
      configService.getValue<number>('approval.timeoutHours', 48),
    ]);

    return {
      defaultFlowEnabled: defaultFlowEnabledRaw ?? true,
      ceoApprovalThreshold: ceoApprovalThresholdRaw ?? 100000,
      timeoutHours: timeoutHoursRaw ?? 48,
    };
  } catch (error) {
    logger.error('获取审批配置失败', { error });
    // 返回默认值
    return {
      defaultFlowEnabled: true,
      ceoApprovalThreshold: 100000,
      timeoutHours: 48,
    };
  }
}

/**
 * 获取CEO审批金额阈值
 * 超过此金额的申请需要CEO审批
 */
export async function getCEOApprovalThreshold(): Promise<number> {
  try {
    const value = await configService.getValue<number>('approval.ceoApprovalThreshold', 100000);
    return value ?? 100000;
  } catch (error) {
    logger.error('获取CEO审批阈值失败', { error });
    return 100000; // 默认10万元
  }
}

/**
 * 获取审批超时时间（小时）
 */
export async function getApprovalTimeoutHours(): Promise<number> {
  try {
    const value = await configService.getValue<number>('approval.timeoutHours', 48);
    return value ?? 48;
  } catch (error) {
    logger.error('获取审批超时时间失败', { error });
    return 48; // 默认48小时
  }
}

/**
 * 获取默认审批流是否启用
 */
export async function isDefaultFlowEnabled(): Promise<boolean> {
  try {
    const value = await configService.getValue<boolean>('approval.defaultFlowEnabled', true);
    return value ?? true;
  } catch (error) {
    logger.error('获取默认审批流配置失败', { error });
    return true;
  }
}

/**
 * 检查金额是否需要CEO审批
 * @param amount 申请金额（元）
 */
export async function requiresCEOApproval(amount: number): Promise<boolean> {
  const threshold = await getCEOApprovalThreshold();
  return amount >= threshold;
}

/**
 * 计算审批截止时间
 * @param startTime 审批开始时间
 */
export async function calculateApprovalDeadline(startTime: Date = new Date()): Promise<Date> {
  const timeoutHours = await getApprovalTimeoutHours();
  const deadline = new Date(startTime);
  deadline.setHours(deadline.getHours() + timeoutHours);
  return deadline;
}

/**
 * 检查审批是否超时
 * @param startTime 审批开始时间
 */
export async function isApprovalTimeout(startTime: Date): Promise<boolean> {
  const timeoutHours = await getApprovalTimeoutHours();
  if (timeoutHours === 0) return false; // 0表示不限制

  const deadline = new Date(startTime);
  deadline.setHours(deadline.getHours() + timeoutHours);
  return new Date() > deadline;
}
