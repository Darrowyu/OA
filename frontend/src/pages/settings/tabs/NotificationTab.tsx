import { motion } from 'framer-motion';
import {
  Bell,
  MessageSquare,
  Calendar,
  CheckSquare,
  FileText,
  Users,
  Save,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useCallback, useEffect, memo } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

interface NotificationSettings {
  enableInApp: boolean;
  enableSound: boolean;
  enableDesktop: boolean;
  taskReminder: boolean;
  meetingReminder: boolean;
  approvalNotification: boolean;
  announcementNotification: boolean;
  mentionNotification: boolean;
}

const defaultSettings: NotificationSettings = {
  enableInApp: true,
  enableSound: true,
  enableDesktop: false,
  taskReminder: true,
  meetingReminder: true,
  approvalNotification: true,
  announcementNotification: true,
  mentionNotification: true,
};

export const NotificationTab = memo(function NotificationTab() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: NotificationSettings;
        error?: { message: string };
      }>('/settings/notifications');
      if (response.success) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      setError('加载通知设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: { message: string };
      }>('/settings/notifications', settings);
      if (response.success) {
        toast.success('通知设置保存成功');
      } else {
        setError(response.error?.message || '保存失败');
      }
    } catch (err) {
      setError('保存通知设置失败');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="max-w-4xl space-y-6"
    >
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* 通知总开关 */}
      <motion.div variants={itemVariants}>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">应用内通知</h3>
                  <p className="text-sm text-gray-500">接收系统消息和提醒</p>
                </div>
              </div>
              <Switch
                checked={settings.enableInApp}
                onCheckedChange={(checked) => updateSetting('enableInApp', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 通知方式 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <CardTitle>通知方式</CardTitle>
            </div>
            <CardDescription>选择接收通知的方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">提示音</p>
                <p className="text-sm text-gray-500">收到通知时播放提示音</p>
              </div>
              <Switch
                checked={settings.enableSound}
                onCheckedChange={(checked) => updateSetting('enableSound', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">桌面通知</p>
                <p className="text-sm text-gray-500">在桌面显示弹窗通知</p>
              </div>
              <Switch
                checked={settings.enableDesktop}
                onCheckedChange={(checked) => updateSetting('enableDesktop', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 通知类型 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <CardTitle>通知类型</CardTitle>
            </div>
            <CardDescription>选择要接收的通知类型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">任务提醒</p>
                  <p className="text-sm text-gray-500">任务截止前提醒</p>
                </div>
              </div>
              <Switch
                checked={settings.taskReminder}
                onCheckedChange={(checked) => updateSetting('taskReminder', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">会议提醒</p>
                  <p className="text-sm text-gray-500">会议开始前提醒</p>
                </div>
              </div>
              <Switch
                checked={settings.meetingReminder}
                onCheckedChange={(checked) => updateSetting('meetingReminder', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">审批通知</p>
                  <p className="text-sm text-gray-500">有新的审批任务时通知</p>
                </div>
              </div>
              <Switch
                checked={settings.approvalNotification}
                onCheckedChange={(checked) => updateSetting('approvalNotification', checked)}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">公告通知</p>
                  <p className="text-sm text-gray-500">系统公告发布时通知</p>
                </div>
              </div>
              <Switch
                checked={settings.announcementNotification}
                onCheckedChange={(checked) => updateSetting('announcementNotification', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">@提及通知</p>
                  <p className="text-sm text-gray-500">有人在评论中@你时通知</p>
                </div>
              </div>
              <Switch
                checked={settings.mentionNotification}
                onCheckedChange={(checked) => updateSetting('mentionNotification', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 保存按钮 */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving || loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </motion.div>
    </motion.div>
  );
});
