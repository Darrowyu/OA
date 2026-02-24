// 归档相关类型
export interface ArchiveStats {
  totalArchives: number;
  totalSize: number;
  lastArchiveDate: string | null;
}

export interface ArchiveFile {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  startDate: string;
  endDate: string;
}

// 邮件设置类型
export interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  taskReminder: boolean;
  meetingReminder: boolean;
  approvalReminder: boolean;
}

// 系统信息类型
export interface SystemInfo {
  version: string;
  uptime: string;
  nodeVersion: string;
  platform?: string;
  arch?: string;
  hostname?: string;
  pid?: number;
  database: {
    type: string;
    version: string;
    size: string;
  };
  memory: {
    used: string;
    total: string;
    usedBytes: number;
    totalBytes: number;
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
