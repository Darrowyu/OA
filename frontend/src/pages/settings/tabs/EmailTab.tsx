import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Bell, Clock, Save, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmailSettings } from '../hooks/useEmailSettings';

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

export function EmailTab() {
  const { settings, loading, error, loadSettings, saveSettings, updateSetting } = useEmailSettings();

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
      {/* 错误提示 */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* 总开关 */}
      <motion.div variants={itemVariants}>
        <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">邮件通知总开关</h3>
                <p className="text-sm text-gray-500">控制所有邮件提醒功能</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* SMTP 配置 */}
      <motion.div variants={itemVariants}>
        <Card>
        <CardHeader>
          <CardTitle>SMTP 配置</CardTitle>
          <CardDescription>配置邮件服务器连接信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP 服务器</Label>
              <Input
                id="smtpHost"
                value={settings.smtpHost}
                onChange={(e) => updateSetting('smtpHost', e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">端口</Label>
              <Input
                id="smtpPort"
                type="number"
                value={settings.smtpPort}
                onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value))}
                placeholder="587"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpUser">用户名</Label>
            <Input
              id="smtpUser"
              value={settings.smtpUser}
              onChange={(e) => updateSetting('smtpUser', e.target.value)}
              placeholder="noreply@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPassword">密码</Label>
            <Input
              id="smtpPassword"
              type="password"
              value={settings.smtpPassword}
              onChange={(e) => updateSetting('smtpPassword', e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* 提醒策略 */}
      <motion.div variants={itemVariants}>
        <Card>
        <CardHeader>
          <CardTitle>提醒策略</CardTitle>
          <CardDescription>配置各类邮件提醒的发送规则</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">待办任务提醒</p>
                <p className="text-sm text-gray-500">任务到期前发送邮件提醒</p>
              </div>
            </div>
            <Switch
              checked={settings.taskReminder}
              onCheckedChange={(checked) => updateSetting('taskReminder', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">会议提醒</p>
                <p className="text-sm text-gray-500">会议开始前发送邮件提醒</p>
              </div>
            </div>
            <Switch
              checked={settings.meetingReminder}
              onCheckedChange={(checked) => updateSetting('meetingReminder', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">审批提醒</p>
                <p className="text-sm text-gray-500">有新审批任务时发送邮件</p>
              </div>
            </div>
            <Switch
              checked={settings.approvalReminder}
              onCheckedChange={(checked) => updateSetting('approvalReminder', checked)}
            />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* 保存按钮 */}
      <motion.div variants={itemVariants} className="flex justify-end">
        <Button onClick={saveSettings} disabled={loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          保存设置
        </Button>
      </motion.div>
    </motion.div>
  );
}
