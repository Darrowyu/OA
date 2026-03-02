import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Smartphone,
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSecuritySettings } from '../hooks/useSecuritySettings';

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

export function SecurityTab() {
  const { settings, loading, saving, error, updateSetting, saveSettings } =
    useSecuritySettings();

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

      {/* 密码策略 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              <CardTitle>密码策略</CardTitle>
            </div>
            <CardDescription>配置用户密码的安全要求</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passwordMinLength">最小长度</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  min={6}
                  max={32}
                  value={settings.passwordMinLength}
                  onChange={(e) =>
                    updateSetting('passwordMinLength', parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordExpiryDays">密码有效期（天）</Label>
                <Input
                  id="passwordExpiryDays"
                  type="number"
                  min={0}
                  value={settings.passwordExpiryDays}
                  onChange={(e) =>
                    updateSetting('passwordExpiryDays', parseInt(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>密码复杂度要求</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">必须包含大写字母</span>
                  <Switch
                    checked={settings.passwordRequireUppercase}
                    onCheckedChange={(checked) =>
                      updateSetting('passwordRequireUppercase', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">必须包含小写字母</span>
                  <Switch
                    checked={settings.passwordRequireLowercase}
                    onCheckedChange={(checked) =>
                      updateSetting('passwordRequireLowercase', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">必须包含数字</span>
                  <Switch
                    checked={settings.passwordRequireNumbers}
                    onCheckedChange={(checked) =>
                      updateSetting('passwordRequireNumbers', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">必须包含特殊符号</span>
                  <Switch
                    checked={settings.passwordRequireSymbols}
                    onCheckedChange={(checked) =>
                      updateSetting('passwordRequireSymbols', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 登录安全 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <CardTitle>登录安全</CardTitle>
            </div>
            <CardDescription>配置登录保护和会话管理</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">最大尝试次数</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min={3}
                  max={10}
                  value={settings.maxLoginAttempts}
                  onChange={(e) =>
                    updateSetting('maxLoginAttempts', parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lockoutDurationMinutes">锁定时间（分钟）</Label>
                <Input
                  id="lockoutDurationMinutes"
                  type="number"
                  min={5}
                  value={settings.lockoutDurationMinutes}
                  onChange={(e) =>
                    updateSetting('lockoutDurationMinutes', parseInt(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeoutMinutes">会话超时（分钟）</Label>
              <Input
                id="sessionTimeoutMinutes"
                type="number"
                min={5}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) =>
                  updateSetting('sessionTimeoutMinutes', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500">
                用户无操作后自动登出的时间
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">双因素认证</p>
                  <p className="text-sm text-gray-500">
                    启用后用户需使用手机验证登录
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enable2FA}
                onCheckedChange={(checked) => updateSetting('enable2FA', checked)}
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
}
