import { motion } from 'framer-motion';
import {
  Palette,
  Moon,
  Sun,
  Monitor,
  Globe,
  Save,
  AlertCircle,
  Layout,
  PanelLeft,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';
import { cn } from '@/lib/utils';

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

const themes = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
];

const timezones = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)' },
  { value: 'America/New_York', label: '纽约时间 (UTC-5)' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+0)' },
];

const dateFormats = [
  { value: 'YYYY-MM-DD', label: '2024-01-15' },
  { value: 'DD/MM/YYYY', label: '15/01/2024' },
  { value: 'MM/DD/YYYY', label: '01/15/2024' },
  { value: 'YYYY年MM月DD日', label: '2024年01月15日' },
];

export function AppearanceTab() {
  const { settings, loading, saving, error, themeColors, updateSetting, saveSettings } =
    useAppearanceSettings();

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

      {/* 主题设置 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              <CardTitle>主题外观</CardTitle>
            </div>
            <CardDescription>自定义系统视觉风格</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 深浅色模式 */}
            <div className="space-y-3">
              <Label>主题模式</Label>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <button
                      key={theme.value}
                      onClick={() => updateSetting('theme', theme.value as typeof settings.theme)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                        settings.theme === theme.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 主题色 */}
            <div className="space-y-3">
              <Label>主题色</Label>
              <div className="flex gap-3">
                {themeColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => updateSetting('primaryColor', color.value)}
                    className={cn(
                      'w-10 h-10 rounded-full transition-all',
                      color.class,
                      settings.primaryColor === color.value
                        ? 'ring-2 ring-offset-2 ring-gray-400'
                        : 'hover:scale-110'
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 布局设置 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-emerald-600" />
              <CardTitle>布局设置</CardTitle>
            </div>
            <CardDescription>调整界面布局和显示密度</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <PanelLeft className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">默认收起侧边栏</p>
                  <p className="text-sm text-gray-500">登录后侧边栏默认收起状态</p>
                </div>
              </div>
              <Switch
                checked={settings.sidebarCollapsed}
                onCheckedChange={(checked) =>
                  updateSetting('sidebarCollapsed', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layout className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">紧凑模式</p>
                  <p className="text-sm text-gray-500">减小间距以显示更多内容</p>
                </div>
              </div>
              <Switch
                checked={settings.denseMode}
                onCheckedChange={(checked) => updateSetting('denseMode', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 区域设置 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-600" />
              <CardTitle>区域设置</CardTitle>
            </div>
            <CardDescription>配置语言、时区和日期格式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>界面语言</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateSetting('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>时区</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSetting('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>日期格式</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => updateSetting('dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>时间格式</Label>
              <Select
                value={settings.timeFormat}
                onValueChange={(value) =>
                  updateSetting('timeFormat', value as '12h' | '24h')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12小时制 (AM/PM)</SelectItem>
                  <SelectItem value="24h">24小时制</SelectItem>
                </SelectContent>
              </Select>
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
