import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import {
  ArchiveSettings,
  UserManagementCard,
  WorkflowManagementCard,
  EmailSettings,
} from './components';

// 归档统计接口
interface ArchiveStats {
  activeCount: number;
  archivedCount: number;
  dbSize: string;
  archivableCount: number;
}

// 归档文件接口
interface ArchiveFile {
  id: string;
  filename: string;
  createdAt: string;
  size: string;
  recordCount: number;
}

// 提醒间隔配置
interface ReminderInterval {
  initialDelay: number;
  normalInterval: number;
  mediumInterval: number;
  urgentInterval: number;
}

// 邮件提醒设置
interface EmailSettingsData {
  urgent: ReminderInterval;
  medium: ReminderInterval;
  normal: ReminderInterval;
  workdayOnly: boolean;
  workdays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  skipDates: string[];
}

const defaultEmailSettings: EmailSettingsData = {
  urgent: {
    initialDelay: 2,
    normalInterval: 4,
    mediumInterval: 2,
    urgentInterval: 1,
  },
  medium: {
    initialDelay: 4,
    normalInterval: 8,
    mediumInterval: 4,
    urgentInterval: 2,
  },
  normal: {
    initialDelay: 8,
    normalInterval: 24,
    mediumInterval: 12,
    urgentInterval: 4,
  },
  workdayOnly: true,
  workdays: [1, 2, 3, 4, 5],
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  skipDates: [],
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // 归档相关状态
  const [archiveStats, setArchiveStats] = useState<ArchiveStats>({
    activeCount: 0,
    archivedCount: 0,
    dbSize: '0 MB',
    archivableCount: 0,
  });
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // 邮件设置状态
  const [emailSettings, setEmailSettings] = useState<EmailSettingsData>(defaultEmailSettings);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isLoadingEmailSettings, setIsLoadingEmailSettings] = useState(false);

  // 全局状态
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 防止 React 严格模式下重复请求
  const isMountedRef = useRef(false);

  // 权限检查
  useEffect(() => {
    if (!isAdmin) {
      navigate('/approval');
    }
  }, [isAdmin, navigate]);

  // 加载归档统计
  const loadArchiveStats = async () => {
    setArchiveLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ArchiveStats;
        error?: { code: string; message: string };
      }>('/admin/archive-stats');
      if (response.success) {
        setArchiveStats(response.data);
      } else {
        setError(response.error?.message || '加载归档统计失败');
      }
    } catch (err) {
      setError('加载归档统计失败');
    } finally {
      setArchiveLoading(false);
    }
  };

  // 加载归档文件列表
  const loadArchiveFiles = async () => {
    setArchiveLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ArchiveFile[];
        error?: { code: string; message: string };
      }>('/admin/archive-files');
      if (response.success) {
        setArchiveFiles(response.data);
      } else {
        setError(response.error?.message || '加载归档文件列表失败');
      }
    } catch (err) {
      setError('加载归档文件列表失败');
    } finally {
      setArchiveLoading(false);
    }
  };

  // 执行归档
  const handleArchive = async () => {
    if (!confirm('确定要执行数据归档吗？这将把符合条件的已完成申请归档到文件中。')) {
      return;
    }
    setArchiveLoading(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: { archivedCount: number };
        error?: { code: string; message: string };
      }>('/admin/archive');
      if (response.success) {
        setSuccess(`归档执行成功，共归档 ${response.data?.archivedCount || 0} 条记录`);
        loadArchiveStats();
      } else {
        setError(response.error?.message || '归档执行失败');
      }
    } catch (err) {
      setError('归档执行失败');
    } finally {
      setArchiveLoading(false);
    }
  };

  // 加载邮件提醒设置
  const loadEmailSettings = async () => {
    setIsLoadingEmailSettings(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: EmailSettingsData;
        error?: { code: string; message: string };
      }>('/settings/reminders');
      if (response.success) {
        setEmailSettings((prev) => ({ ...prev, ...response.data }));
      } else {
        setError(response.error?.message || '加载邮件设置失败');
      }
    } catch (err) {
      setError('加载邮件设置失败');
    } finally {
      setIsLoadingEmailSettings(false);
    }
  };

  // 更新提醒间隔
  const updateInterval = (
    priority: 'urgent' | 'medium' | 'normal',
    field: keyof ReminderInterval,
    value: number
  ) => {
    setEmailSettings((prev) => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        [field]: value,
      },
    }));
  };

  // 切换工作日
  const toggleWorkday = (day: number) => {
    setEmailSettings((prev) => ({
      ...prev,
      workdays: prev.workdays.includes(day)
        ? prev.workdays.filter((d) => d !== day)
        : [...prev.workdays, day].sort(),
    }));
  };

  // 更新邮件设置
  const updateEmailSettings = (settings: Partial<EmailSettingsData>) => {
    setEmailSettings((prev) => ({ ...prev, ...settings }));
  };

  // 保存邮件设置
  const saveEmailSettings = async () => {
    setIsSavingEmail(true);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { code: string; message: string };
      }>('/settings/reminders', emailSettings);
      if (response.success) {
        setSuccess('邮件设置保存成功');
      } else {
        setError(response.error?.message || '保存邮件设置失败');
      }
    } catch (err) {
      setError('保存邮件设置失败');
    } finally {
      setIsSavingEmail(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (!isAdmin || isMountedRef.current) return;
    isMountedRef.current = true;

    loadArchiveStats();
    loadEmailSettings();
  }, [isAdmin]);

  // 自动清除消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen overflow-auto">
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-500 mt-1">管理系统配置、数据归档和提醒策略</p>
        </div>

        {/* 消息提示 */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 数据归档管理卡片 */}
          <ArchiveSettings
            archiveStats={archiveStats}
            archiveFiles={archiveFiles}
            archiveLoading={archiveLoading}
            onRefreshStats={loadArchiveStats}
            onExecuteArchive={handleArchive}
            onLoadArchiveFiles={loadArchiveFiles}
          />

          {/* 用户管理卡片 */}
          <UserManagementCard />

          {/* 工作流管理卡片 */}
          <WorkflowManagementCard />

          {/* 邮件提醒设置卡片 */}
          <EmailSettings
            emailSettings={emailSettings}
            isSaving={isSavingEmail}
            isLoading={isLoadingEmailSettings}
            onUpdateInterval={updateInterval}
            onToggleWorkday={toggleWorkday}
            onUpdateSettings={updateEmailSettings}
            onSave={saveEmailSettings}
          />
        </div>
      </main>
    </div>
  );
}
