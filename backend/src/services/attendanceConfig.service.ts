import { configService } from './config.service';
import logger from '../lib/logger';

/**
 * 考勤配置服务
 * 封装从系统配置读取考勤相关配置的接口
 */

export interface WorkSchedule {
  /** 上班时间 */
  workStartTime: string;
  /** 下班时间 */
  workEndTime: string;
  /** 迟到阈值（分钟） */
  lateThresholdMinutes: number;
  /** 早退阈值（分钟） */
  earlyLeaveThresholdMinutes: number;
}

export interface AttendanceThresholds {
  /** 迟到阈值（分钟） */
  lateThresholdMinutes: number;
  /** 早退阈值（分钟） */
  earlyLeaveThresholdMinutes: number;
}

/**
 * 获取完整的工作时间配置
 */
export async function getWorkSchedule(): Promise<WorkSchedule> {
  try {
    const [workStartTime, workEndTime, lateThresholdMinutes, earlyLeaveThresholdMinutes] = await Promise.all([
      configService.getValue<string>('attendance.workStartTime', '09:00'),
      configService.getValue<string>('attendance.workEndTime', '18:00'),
      configService.getValue<number>('attendance.lateThresholdMinutes', 15),
      configService.getValue<number>('attendance.earlyLeaveThresholdMinutes', 15),
    ]);

    return {
      workStartTime,
      workEndTime,
      lateThresholdMinutes,
      earlyLeaveThresholdMinutes,
    };
  } catch (error) {
    logger.error('获取工作时间配置失败', { error });
    // 返回默认值
    return {
      workStartTime: '09:00',
      workEndTime: '18:00',
      lateThresholdMinutes: 15,
      earlyLeaveThresholdMinutes: 15,
    };
  }
}

/**
 * 获取考勤阈值配置
 */
export async function getThresholds(): Promise<AttendanceThresholds> {
  try {
    const [lateThresholdMinutes, earlyLeaveThresholdMinutes] = await Promise.all([
      configService.getValue<number>('attendance.lateThresholdMinutes', 15),
      configService.getValue<number>('attendance.earlyLeaveThresholdMinutes', 15),
    ]);

    return {
      lateThresholdMinutes,
      earlyLeaveThresholdMinutes,
    };
  } catch (error) {
    logger.error('获取考勤阈值失败', { error });
    return {
      lateThresholdMinutes: 15,
      earlyLeaveThresholdMinutes: 15,
    };
  }
}

/**
 * 获取上班时间
 */
export async function getWorkStartTime(): Promise<string> {
  try {
    return await configService.getValue<string>('attendance.workStartTime', '09:00');
  } catch (error) {
    logger.error('获取上班时间失败', { error });
    return '09:00';
  }
}

/**
 * 获取下班时间
 */
export async function getWorkEndTime(): Promise<string> {
  try {
    return await configService.getValue<string>('attendance.workEndTime', '18:00');
  } catch (error) {
    logger.error('获取下班时间失败', { error });
    return '18:00';
  }
}

/**
 * 获取迟到阈值（分钟）
 */
export async function getLateThresholdMinutes(): Promise<number> {
  try {
    return await configService.getValue<number>('attendance.lateThresholdMinutes', 15);
  } catch (error) {
    logger.error('获取迟到阈值失败', { error });
    return 15;
  }
}

/**
 * 获取早退阈值（分钟）
 */
export async function getEarlyLeaveThresholdMinutes(): Promise<number> {
  try {
    return await configService.getValue<number>('attendance.earlyLeaveThresholdMinutes', 15);
  } catch (error) {
    logger.error('获取早退阈值失败', { error });
    return 15;
  }
}

/**
 * 解析时间字符串为分钟数
 * @param timeStr 时间字符串，如 "09:00"
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * 检查是否迟到
 * @param clockInTime 打卡时间（分钟数，如 9:05 = 545）
 */
export async function isLate(clockInTime: number): Promise<boolean> {
  const schedule = await getWorkSchedule();
  const workStartMinutes = parseTimeToMinutes(schedule.workStartTime);
  const threshold = schedule.lateThresholdMinutes;

  // 上班时间 + 阈值后算迟到
  return clockInTime > workStartMinutes + threshold;
}

/**
 * 检查是否早退
 * @param clockOutTime 下班打卡时间（分钟数）
 */
export async function isEarlyLeave(clockOutTime: number): Promise<boolean> {
  const schedule = await getWorkSchedule();
  const workEndMinutes = parseTimeToMinutes(schedule.workEndTime);
  const threshold = schedule.earlyLeaveThresholdMinutes;

  // 下班时间 - 阈值前算早退
  return clockOutTime < workEndMinutes - threshold;
}

/**
 * 计算迟到分钟数
 * @param clockInTime 打卡时间（分钟数）
 */
export async function calculateLateMinutes(clockInTime: number): Promise<number> {
  const schedule = await getWorkSchedule();
  const workStartMinutes = parseTimeToMinutes(schedule.workStartTime);

  if (clockInTime <= workStartMinutes) {
    return 0;
  }

  return clockInTime - workStartMinutes;
}

/**
 * 计算早退分钟数
 * @param clockOutTime 下班打卡时间（分钟数）
 */
export async function calculateEarlyLeaveMinutes(clockOutTime: number): Promise<number> {
  const schedule = await getWorkSchedule();
  const workEndMinutes = parseTimeToMinutes(schedule.workEndTime);

  if (clockOutTime >= workEndMinutes) {
    return 0;
  }

  return workEndMinutes - clockOutTime;
}

/**
 * 获取标准工作时长（小时）
 */
export async function getStandardWorkHours(): Promise<number> {
  const schedule = await getWorkSchedule();
  const startMinutes = parseTimeToMinutes(schedule.workStartTime);
  const endMinutes = parseTimeToMinutes(schedule.workEndTime);

  return (endMinutes - startMinutes) / 60;
}
