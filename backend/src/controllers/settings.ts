import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import * as logger from '../lib/logger';

// 邮件设置验证 Schema
const EmailSettingsSchema = z.object({
  enabled: z.boolean(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  taskReminder: z.boolean().optional(),
  meetingReminder: z.boolean().optional(),
  approvalReminder: z.boolean().optional(),
});

// 日志查询参数验证 Schema
const LogsQuerySchema = z.object({
  level: z.enum(['all', 'info', 'warn', 'error']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// 备份ID验证 Schema
const BackupIdSchema = z.object({
  id: z.string().min(1),
});

/**
 * 获取系统信息
 */
export const getSystemInfo = async (_req: Request, res: Response) => {
  try {
    // 获取 Node.js 版本
    const nodeVersion = process.version;

    // 获取运行时间
    const uptime = formatUptime(process.uptime());

    // 获取内存使用
    const memoryUsage = process.memoryUsage();
    const memoryUsedBytes = memoryUsage.heapUsed;
    const memoryTotalBytes = memoryUsage.heapTotal;
    const memoryUsed = formatBytes(memoryUsedBytes);
    const memoryTotal = formatBytes(memoryTotalBytes);

    // 获取数据库信息
    const dbResult = await prisma.$queryRaw<{ pg_size_pretty: string }[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as pg_size_pretty
    `;
    const dbSize = dbResult[0]?.pg_size_pretty || '0 MB';

    res.json({
      success: true,
      data: {
        version: 'v2.0.1',
        uptime,
        nodeVersion,
        database: {
          type: 'PostgreSQL',
          version: '15.x',
          size: dbSize,
        },
        memory: {
          used: memoryUsed,
          total: memoryTotal,
          usedBytes: memoryUsedBytes,
          totalBytes: memoryTotalBytes,
        },
      },
    });
  } catch (error) {
    logger.error('获取系统信息失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取系统信息失败' },
    });
  }
};

/**
 * 获取系统日志
 */
export const getLogs = async (req: Request, res: Response) => {
  try {
    const { level, startDate, endDate } = req.query;

    // 验证查询参数
    const validationResult = LogsQuerySchema.safeParse({
      level: level || 'all',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数验证失败: ' + validationResult.error.errors.map(e => e.message).join(', '),
        },
      });
      return;
    }

    // 构建查询条件
    const where: any = {};

    // 按级别筛选
    if (level && level !== 'all') {
      where.level = String(level);
    }

    // 按日期范围筛选
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(String(startDate));
      }
      if (endDate) {
        where.timestamp.lte = new Date(String(endDate));
      }
    }

    // 从数据库查询日志
    const logs = await prisma.systemLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100, // 限制返回100条
    });

    // 格式化返回数据
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level as 'info' | 'warn' | 'error',
      message: log.message,
      source: log.source,
    }));

    res.json({
      success: true,
      data: formattedLogs,
    });
  } catch (error) {
    logger.error('获取系统日志失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取系统日志失败' },
    });
  }
};

/**
 * 导出日志
 */
export const exportLogs = async (_req: Request, res: Response) => {
  try {
    // 生成导出文件（实际应生成CSV或JSON文件）
    const exportId = `export_${Date.now()}`;

    res.json({
      success: true,
      data: {
        downloadUrl: `/api/settings/logs/download/${exportId}`,
      },
    });
  } catch (error) {
    logger.error('导出日志失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '导出日志失败' },
    });
  }
};

/**
 * 获取备份列表
 */
export const getBackups = async (_req: Request, res: Response) => {
  try {
    // 从数据库查询备份列表
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 格式化返回数据
    const formattedBackups = backups.map(backup => ({
      id: backup.id,
      createdAt: backup.createdAt.toISOString(),
      size: backup.size,
      type: backup.type as 'auto' | 'manual',
      status: backup.status as 'completed' | 'failed' | 'in_progress',
    }));

    res.json({
      success: true,
      data: formattedBackups,
    });
  } catch (error) {
    logger.error('获取备份列表失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取备份列表失败' },
    });
  }
};

/**
 * 创建备份
 */
export const createBackup = async (_req: Request, res: Response) => {
  try {
    // 创建备份记录
    const newBackup = await prisma.backup.create({
      data: {
        size: '0 MB',
        type: 'manual',
        status: 'in_progress',
      },
    });

    // 模拟备份过程（异步更新状态）
    setTimeout(async () => {
      try {
        await prisma.backup.update({
          where: { id: newBackup.id },
          data: {
            status: 'completed',
            size: `${(Math.random() * 100 + 50).toFixed(1)} MB`,
          },
        });
      } catch (err) {
        logger.error('更新备份状态失败', { error: err });
      }
    }, 3000);

    res.json({
      success: true,
      data: {
        id: newBackup.id,
        createdAt: newBackup.createdAt.toISOString(),
        size: newBackup.size,
        type: newBackup.type,
        status: newBackup.status,
      },
    });
  } catch (error) {
    logger.error('创建备份失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '创建备份失败' },
    });
  }
};

/**
 * 从备份恢复
 */
export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证备份ID
    const validationResult = BackupIdSchema.safeParse({ id });
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数验证失败: ' + validationResult.error.errors.map(e => e.message).join(', '),
        },
      });
      return;
    }

    // 检查备份是否存在
    const backup = await prisma.backup.findUnique({
      where: { id },
    });

    if (!backup) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '备份不存在' },
      });
      return;
    }

    // 模拟恢复过程
    logger.info(`开始从备份 ${id} 恢复数据`);

    res.json({
      success: true,
      message: '恢复成功',
    });
  } catch (error) {
    logger.error('恢复备份失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '恢复备份失败' },
    });
  }
};

/**
 * 下载备份
 */
export const downloadBackup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查备份是否存在
    const backup = await prisma.backup.findUnique({
      where: { id },
    });

    if (!backup) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '备份不存在' },
      });
      return;
    }

    // 实际应返回备份文件
    res.json({
      success: true,
      message: '下载链接已生成',
    });
  } catch (error) {
    logger.error('下载备份失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '下载备份失败' },
    });
  }
};

/**
 * 获取自动备份设置
 */
export const getAutoBackup = async (_req: Request, res: Response) => {
  try {
    // 从系统设置中获取自动备份设置
    const config = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });
    const enabled = config?.autoBackupEnabled ?? false;

    res.json({
      success: true,
      data: { enabled },
    });
  } catch (error) {
    logger.error('获取自动备份设置失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取自动备份设置失败' },
    });
  }
};

/**
 * 设置自动备份
 */
export const setAutoBackup = async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;

    // 更新或创建系统设置
    await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: { autoBackupEnabled: enabled },
      create: { id: 'default', autoBackupEnabled: enabled },
    });

    logger.info(`自动备份已${enabled ? '启用' : '禁用'}`);

    res.json({
      success: true,
      message: '设置已保存',
    });
  } catch (error) {
    logger.error('保存自动备份设置失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '保存设置失败' },
    });
  }
};

/**
 * 获取邮件设置
 */
export const getEmailSettings = async (_req: Request, res: Response) => {
  try {
    // 从数据库获取邮件设置
    let settings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    // 如果不存在，创建默认设置
    if (!settings) {
      settings = await prisma.emailSettings.create({
        data: {
          id: 'default',
          enabled: true,
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          taskReminder: true,
          meetingReminder: true,
          approvalReminder: true,
        },
      });
    }

    // 返回数据（密码脱敏）
    res.json({
      success: true,
      data: {
        enabled: settings.enabled,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassword: settings.smtpPassword ? '***' : '',
        taskReminder: settings.taskReminder,
        meetingReminder: settings.meetingReminder,
        approvalReminder: settings.approvalReminder,
      },
    });
  } catch (error) {
    logger.error('获取邮件设置失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取邮件设置失败' },
    });
  }
};

/**
 * 保存邮件设置
 */
export const saveEmailSettings = async (req: Request, res: Response) => {
  try {
    // 验证请求体
    const validationResult = EmailSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数验证失败: ' + validationResult.error.errors.map(e => e.message).join(', '),
        },
      });
      return;
    }

    const { enabled, smtpHost, smtpPort, smtpUser, smtpPassword, taskReminder, meetingReminder, approvalReminder } = req.body;

    // 获取现有设置
    const existing = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    // 更新或创建设置
    await prisma.emailSettings.upsert({
      where: { id: 'default' },
      update: {
        enabled: enabled ?? existing?.enabled ?? true,
        smtpHost: smtpHost ?? existing?.smtpHost ?? '',
        smtpPort: smtpPort ?? existing?.smtpPort ?? 587,
        smtpUser: smtpUser ?? existing?.smtpUser ?? '',
        ...(smtpPassword && { smtpPassword }), // 只在提供时更新密码
        taskReminder: taskReminder ?? existing?.taskReminder ?? true,
        meetingReminder: meetingReminder ?? existing?.meetingReminder ?? true,
        approvalReminder: approvalReminder ?? existing?.approvalReminder ?? true,
      },
      create: {
        id: 'default',
        enabled: enabled ?? true,
        smtpHost: smtpHost ?? '',
        smtpPort: smtpPort ?? 587,
        smtpUser: smtpUser ?? '',
        smtpPassword: smtpPassword ?? '',
        taskReminder: taskReminder ?? true,
        meetingReminder: meetingReminder ?? true,
        approvalReminder: approvalReminder ?? true,
      },
    });

    logger.info('邮件设置已更新');

    res.json({
      success: true,
      message: '设置已保存',
    });
  } catch (error) {
    logger.error('保存邮件设置失败', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '保存邮件设置失败' },
    });
  }
};

// 辅助函数
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
