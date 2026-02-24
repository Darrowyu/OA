// 归档相关类型
export interface ArchiveStats {
  activeCount: number;
  archivedCount: number;
  dbSize: string;
  archivableCount: number;
}

export interface ArchiveFile {
  id: string;
  filename: string;
  createdAt: string;
  size: string;
  recordCount: number;
}

// 邮件设置类型
export interface ReminderInterval {
  initialDelay: number; // 初始延迟（小时）
  normalInterval: number; // 正常间隔（小时）
  mediumInterval: number; // 中期间隔（小时）
  urgentInterval: number; // 紧急间隔（小时）
}

export interface EmailSettings {
  urgent: ReminderInterval;
  medium: ReminderInterval;
  normal: ReminderInterval;
  workdayOnly: boolean;
  workdays: number[]; // 0-6 表示周日到周六
  workHoursStart: string; // HH:mm 格式
  workHoursEnd: string; // HH:mm 格式
  skipDates: string[]; // YYYY-MM-DD 格式
}

// 系统信息类型
export interface SystemInfo {
  version: string;
  uptime: string;
  nodeVersion: string;
  database: {
    type: string;
    version: string;
    size: string;
  };
  memory: {
    used: string;
    total: string;
  };
}

// 日志类型
export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

// 备份类型
export interface BackupInfo {
  id: string;
  createdAt: string;
  size: string;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed' | 'in_progress';
}
