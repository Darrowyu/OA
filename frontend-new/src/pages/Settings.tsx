import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  Calendar,
  Plus,
  Trash2,
  FileText,
  Database,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

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
  initialDelay: number; // 初始延迟（小时）
  normalInterval: number; // 正常间隔（小时）
  mediumInterval: number; // 中期间隔（小时）
  urgentInterval: number; // 紧急间隔（小时）
}

// 邮件提醒设置
interface EmailSettings {
  urgent: ReminderInterval;
  medium: ReminderInterval;
  normal: ReminderInterval;
  workdayOnly: boolean;
  workdays: number[]; // 0-6 表示周日到周六
  workHoursStart: string; // HH:mm 格式
  workHoursEnd: string; // HH:mm 格式
  skipDates: string[]; // YYYY-MM-DD 格式
}

const weekdays = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const defaultEmailSettings: EmailSettings = {
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
  workdays: [1, 2, 3, 4, 5], // 默认周一到周五
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  skipDates: [],
};

export default function Settings() {
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
  const [showArchiveFiles, setShowArchiveFiles] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // 邮件设置状态
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [newSkipDate, setNewSkipDate] = useState('');
  const [skipDateRangeStart, setSkipDateRangeStart] = useState('');
  const [skipDateRangeEnd, setSkipDateRangeEnd] = useState('');

  // 全局状态
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 权限检查
  useEffect(() => {
    if (!isAdmin) {
      navigate('/applications');
    }
  }, [isAdmin, navigate]);

  // 加载归档统计
  const loadArchiveStats = async () => {
    setArchiveLoading(true);
    try {
      // TODO: 替换为实际API调用
      // const response = await fetch('/api/settings/archive-stats');
      // const data = await response.json();
      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));
      setArchiveStats({
        activeCount: 156,
        archivedCount: 423,
        dbSize: '256.5 MB',
        archivableCount: 45,
      });
    } catch (err) {
      setError('加载归档统计失败');
    } finally {
      setArchiveLoading(false);
    }
  };

  // 加载归档文件列表
  const loadArchiveFiles = async () => {
    try {
      // TODO: 替换为实际API调用
      // const response = await fetch('/api/settings/archive-files');
      // const data = await response.json();
      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 300));
      setArchiveFiles([
        {
          id: '1',
          filename: 'archive_2024_01_15.json',
          createdAt: '2024-01-15 10:30:00',
          size: '12.5 MB',
          recordCount: 89,
        },
        {
          id: '2',
          filename: 'archive_2024_02_20.json',
          createdAt: '2024-02-20 14:15:00',
          size: '8.3 MB',
          recordCount: 56,
        },
        {
          id: '3',
          filename: 'archive_2024_03_10.json',
          createdAt: '2024-03-10 09:45:00',
          size: '15.7 MB',
          recordCount: 112,
        },
      ]);
    } catch (err) {
      setError('加载归档文件列表失败');
    }
  };

  // 执行归档
  const handleArchive = async () => {
    if (!confirm('确定要执行数据归档吗？这将把符合条件的已完成申请归档到文件中。')) {
      return;
    }
    setArchiveLoading(true);
    try {
      // TODO: 替换为实际API调用
      // await fetch('/api/settings/archive', { method: 'POST' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('归档执行成功');
      loadArchiveStats();
    } catch (err) {
      setError('归档执行失败');
    } finally {
      setArchiveLoading(false);
    }
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

  // 添加单个跳过日期
  const addSkipDate = () => {
    if (!newSkipDate) return;
    if (emailSettings.skipDates.includes(newSkipDate)) {
      setError('该日期已存在');
      return;
    }
    setEmailSettings((prev) => ({
      ...prev,
      skipDates: [...prev.skipDates, newSkipDate].sort(),
    }));
    setNewSkipDate('');
  };

  // 批量添加日期范围
  const addSkipDateRange = () => {
    if (!skipDateRangeStart || !skipDateRangeEnd) {
      setError('请选择开始和结束日期');
      return;
    }
    if (skipDateRangeStart > skipDateRangeEnd) {
      setError('开始日期不能晚于结束日期');
      return;
    }

    const start = new Date(skipDateRangeStart);
    const end = new Date(skipDateRangeEnd);
    const newDates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!emailSettings.skipDates.includes(dateStr)) {
        newDates.push(dateStr);
      }
    }

    setEmailSettings((prev) => ({
      ...prev,
      skipDates: [...prev.skipDates, ...newDates].sort(),
    }));
    setSkipDateRangeStart('');
    setSkipDateRangeEnd('');
  };

  // 删除跳过日期
  const removeSkipDate = (date: string) => {
    setEmailSettings((prev) => ({
      ...prev,
      skipDates: prev.skipDates.filter((d) => d !== date),
    }));
  };

  // 保存邮件设置
  const saveEmailSettings = async () => {
    try {
      // TODO: 替换为实际API调用
      // await fetch('/api/settings/email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailSettings),
      // });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess('邮件设置保存成功');
    } catch (err) {
      setError('保存邮件设置失败');
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

  // 展开/收起归档文件列表
  const toggleArchiveFiles = () => {
    if (!showArchiveFiles && archiveFiles.length === 0) {
      loadArchiveFiles();
    }
    setShowArchiveFiles(!showArchiveFiles);
  };

  // 初始加载
  useEffect(() => {
    if (isAdmin) {
      loadArchiveStats();
    }
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
    <div className="container mx-auto py-6 px-4">
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-blue-600" />
              <CardTitle>数据归档管理</CardTitle>
            </div>
            <CardDescription>管理系统数据归档，优化数据库性能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">活跃申请</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {archiveStats.activeCount}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm font-medium">已归档</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {archiveStats.archivedCount}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">主文件大小</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{archiveStats.dbSize}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-sm font-medium">可归档数量</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {archiveStats.archivableCount}
                </div>
              </div>
            </div>

            {/* 归档说明 */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-2">归档说明：</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>归档将已完成的申请数据转移到独立文件</li>
                <li>归档后数据仍可在历史记录中查看</li>
                <li>建议每月执行一次归档以保持系统性能</li>
                <li>归档文件可随时导出或恢复</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={loadArchiveStats}
                disabled={archiveLoading}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${archiveLoading ? 'animate-spin' : ''}`} />
                刷新统计
              </Button>
              <Button
                onClick={handleArchive}
                disabled={archiveLoading || archiveStats.archivableCount === 0}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                执行归档
              </Button>
            </div>

            {/* 归档文件列表 */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={toggleArchiveFiles}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-700">归档文件列表</span>
                {showArchiveFiles ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {showArchiveFiles && (
                <div className="p-4 space-y-2">
                  {archiveFiles.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">暂无归档文件</p>
                  ) : (
                    archiveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {file.createdAt} · {file.size} · {file.recordCount} 条记录
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          下载
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 邮件提醒设置卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>邮件提醒设置</CardTitle>
            </div>
            <CardDescription>配置申请审批的邮件提醒策略</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 按优先级设置 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                提醒间隔设置（小时）
              </h3>

              {/* 紧急申请 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">紧急</Badge>
                  <span className="text-sm text-gray-600">申请提醒间隔</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">初始延迟</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.urgent.initialDelay}
                      onChange={(e) =>
                        updateInterval('urgent', 'initialDelay', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">正常间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.urgent.normalInterval}
                      onChange={(e) =>
                        updateInterval('urgent', 'normalInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">中期间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.urgent.mediumInterval}
                      onChange={(e) =>
                        updateInterval('urgent', 'mediumInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">紧急间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.urgent.urgentInterval}
                      onChange={(e) =>
                        updateInterval('urgent', 'urgentInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 中等申请 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-yellow-500">中等</Badge>
                  <span className="text-sm text-gray-600">申请提醒间隔</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">初始延迟</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.medium.initialDelay}
                      onChange={(e) =>
                        updateInterval('medium', 'initialDelay', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">正常间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.medium.normalInterval}
                      onChange={(e) =>
                        updateInterval('medium', 'normalInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">中期间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.medium.mediumInterval}
                      onChange={(e) =>
                        updateInterval('medium', 'mediumInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">紧急间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.medium.urgentInterval}
                      onChange={(e) =>
                        updateInterval('medium', 'urgentInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 普通申请 */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">普通</Badge>
                  <span className="text-sm text-gray-600">申请提醒间隔</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">初始延迟</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.normal.initialDelay}
                      onChange={(e) =>
                        updateInterval('normal', 'initialDelay', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">正常间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.normal.normalInterval}
                      onChange={(e) =>
                        updateInterval('normal', 'normalInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">中期间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.normal.mediumInterval}
                      onChange={(e) =>
                        updateInterval('normal', 'mediumInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">紧急间隔</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailSettings.normal.urgentInterval}
                      onChange={(e) =>
                        updateInterval('normal', 'urgentInterval', parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 时间控制设置 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                时间控制设置
              </h3>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="workdayOnly"
                  checked={emailSettings.workdayOnly}
                  onCheckedChange={(checked) =>
                    setEmailSettings((prev) => ({ ...prev, workdayOnly: checked as boolean }))
                  }
                />
                <Label htmlFor="workdayOnly" className="text-sm cursor-pointer">
                  仅在工作日和工作时间发送提醒
                </Label>
              </div>

              {emailSettings.workdayOnly && (
                <>
                  {/* 工作日选择 */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">工作日</Label>
                    <div className="flex flex-wrap gap-2">
                      {weekdays.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleWorkday(day.value)}
                          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                            emailSettings.workdays.includes(day.value)
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 工作时间 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">开始时间</Label>
                      <Input
                        type="time"
                        value={emailSettings.workHoursStart}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({ ...prev, workHoursStart: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">结束时间</Label>
                      <Input
                        type="time"
                        value={emailSettings.workHoursEnd}
                        onChange={(e) =>
                          setEmailSettings((prev) => ({ ...prev, workHoursEnd: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 自定义跳过日期 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                自定义跳过日期
              </h3>

              {/* 单个日期添加 */}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newSkipDate}
                  onChange={(e) => setNewSkipDate(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addSkipDate} variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* 日期范围批量添加 */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">开始日期</Label>
                  <Input
                    type="date"
                    value={skipDateRangeStart}
                    onChange={(e) => setSkipDateRangeStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">结束日期</Label>
                  <Input
                    type="date"
                    value={skipDateRangeEnd}
                    onChange={(e) => setSkipDateRangeEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={addSkipDateRange} variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* 已添加日期列表 */}
              {emailSettings.skipDates.length > 0 && (
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {emailSettings.skipDates.map((date) => (
                      <Badge
                        key={date}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        {date}
                        <button
                          onClick={() => removeSkipDate(date)}
                          className="ml-1 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 保存按钮 */}
            <Button onClick={saveEmailSettings} className="w-full">
              保存邮件设置
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
