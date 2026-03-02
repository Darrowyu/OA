# 系统设置页面重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构系统设置页面为Tab切换形式，新增安全、界面、通知、存储等设置模块

**Architecture:** 使用React + TypeScript + Tailwind CSS，基于现有的Tabs组件实现导航。后端复用config系统存储设置项，新增专用API接口处理复杂配置。保持现有功能的同时新增4个Tab模块。

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Zod

---

## 准备工作

### Task 0: 创建任务清单

**Files:**
- Create: `docs/plans/settings-tasks.md`

**Step 1: 创建任务追踪文件**

```markdown
# 设置页面重构任务清单

## 待完成
- [ ] Task 1: 重构SettingsPage布局，优化Tab样式
- [ ] Task 2: 创建SecurityTab组件
- [ ] Task 3: 创建AppearanceTab组件
- [ ] Task 4: 创建NotificationTab组件
- [ ] Task 5: 创建StorageTab组件
- [ ] Task 6: 后端新增配置接口
- [ ] Task 7: 联调测试

## 已完成
- [x] Task 0: 创建实施计划
```

---

## Phase 1: 重构现有设置页面

### Task 1: 重构SettingsPage布局和Tab结构

**Files:**
- Modify: `frontend/src/pages/settings/index.tsx`
- Create: `frontend/src/pages/settings/hooks/useSecuritySettings.ts`
- Create: `frontend/src/pages/settings/hooks/useAppearanceSettings.ts`

**Step 1: 读取现有SettingsPage文件**

确认文件路径和当前内容

**Step 2: 重构Tab列表，新增4个Tab**

修改 `frontend/src/pages/settings/index.tsx`:

```typescript
import {
  Monitor,
  Palette,
  Shield,
  Bell,
  Mail,
  Database,
  Archive,
  FileText,
  Settings2,
  HardDrive,
} from 'lucide-react';

// 新增Tab导入
import { SecurityTab } from './tabs/SecurityTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { NotificationTab } from './tabs/NotificationTab';
import { StorageTab } from './tabs/StorageTab';

const tabs = [
  { value: 'system', label: '系统', icon: Monitor },
  { value: 'appearance', label: '界面', icon: Palette },
  { value: 'security', label: '安全', icon: Shield },
  { value: 'notification', label: '通知', icon: Bell },
  { value: 'email', label: '邮件', icon: Mail },
  { value: 'storage', label: '存储', icon: HardDrive },
  { value: 'archive', label: '归档', icon: Archive },
  { value: 'logs', label: '日志', icon: FileText },
  { value: 'backup', label: '备份', icon: Database },
];
```

**Step 3: 在TabsContent中添加新Tab**

```typescript
<TabsContent value="appearance" className="mt-0">
  <AppearanceTab />
</TabsContent>

<TabsContent value="security" className="mt-0">
  <SecurityTab />
</TabsContent>

<TabsContent value="notification" className="mt-0">
  <NotificationTab />
</TabsContent>

<TabsContent value="storage" className="mt-0">
  <StorageTab />
</TabsContent>
```

**Step 4: 优化Tab样式**

调整TabsList样式为更紧凑的设计：

```typescript
<TabsList className="w-full justify-start bg-white border border-gray-200 p-1 rounded-xl mb-6 overflow-x-auto flex-wrap gap-1 h-auto">
  {tabs.map((tab) => {
    const Icon = tab.icon;
    return (
      <TabsTrigger
        key={tab.value}
        value={tab.value}
        className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 border border-transparent rounded-lg transition-all whitespace-nowrap text-sm font-medium"
      >
        <Icon className="h-4 w-4" />
        <span>{tab.label}</span>
      </TabsTrigger>
    );
  })}
</TabsList>
```

**Step 5: 提交变更**

```bash
git add frontend/src/pages/settings/index.tsx
git commit -m "refactor(settings): 重构Tab导航，新增4个设置分类"
```

---

## Phase 2: 创建新的设置Tab组件

### Task 2: 创建SecurityTab（安全设置）

**Files:**
- Create: `frontend/src/pages/settings/tabs/SecurityTab.tsx`
- Create: `frontend/src/pages/settings/hooks/useSecuritySettings.ts`

**Step 1: 创建useSecuritySettings hook**

```typescript
// frontend/src/pages/settings/hooks/useSecuritySettings.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  enable2FA: boolean;
}

const defaultSettings: SecuritySettings = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: false,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 30,
  enable2FA: false,
};

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: SecuritySettings;
        error?: { message: string };
      }>('/settings/security');
      if (response.success) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      setError('加载安全设置失败');
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
      }>('/settings/security', settings);
      if (response.success) {
        toast.success('安全设置保存成功');
      } else {
        setError(response.error?.message || '保存失败');
      }
    } catch (err) {
      setError('保存安全设置失败');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    saveSettings,
    updateSetting,
  };
}
```

**Step 2: 创建SecurityTab组件**

```typescript
// frontend/src/pages/settings/tabs/SecurityTab.tsx
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Clock,
  AlertTriangle,
  Key,
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
```

**Step 3: 提交变更**

```bash
git add frontend/src/pages/settings/tabs/SecurityTab.tsx

git add frontend/src/pages/settings/hooks/useSecuritySettings.ts
git commit -m "feat(settings): 新增安全设置Tab组件"
```

---

### Task 3: 创建AppearanceTab（界面设置）

**Files:**
- Create: `frontend/src/pages/settings/tabs/AppearanceTab.tsx`
- Create: `frontend/src/pages/settings/hooks/useAppearanceSettings.ts`

**Step 1: 创建useAppearanceSettings hook**

```typescript
// frontend/src/pages/settings/hooks/useAppearanceSettings.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  sidebarCollapsed: boolean;
  denseMode: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

const defaultSettings: AppearanceSettings = {
  theme: 'system',
  primaryColor: 'blue',
  sidebarCollapsed: false,
  denseMode: false,
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
};

const themeColors = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'emerald', label: '绿色', class: 'bg-emerald-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'rose', label: '红色', class: 'bg-rose-500' },
];

export function useAppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: AppearanceSettings;
        error?: { message: string };
      }>('/settings/appearance');
      if (response.success) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      setError('加载界面设置失败');
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
      }>('/settings/appearance', settings);
      if (response.success) {
        toast.success('界面设置保存成功');
        // 应用主题设置
        applyThemeSettings(settings);
      } else {
        setError(response.error?.message || '保存失败');
      }
    } catch (err) {
      setError('保存界面设置失败');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyThemeSettings = useCallback((s: AppearanceSettings) => {
    // 应用深色/浅色模式
    if (s.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (s.theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
    // 其他设置保存到localStorage
    localStorage.setItem('appearanceSettings', JSON.stringify(s));
  }, []);

  useEffect(() => {
    loadSettings();
    // 从localStorage加载已保存的设置
    const saved = localStorage.getItem('appearanceSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
        applyThemeSettings({ ...defaultSettings, ...parsed });
      } catch {
        // 忽略解析错误
      }
    }
  }, [loadSettings, applyThemeSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    themeColors,
    loadSettings,
    saveSettings,
    updateSetting,
  };
}
```

**Step 2: 创建AppearanceTab组件**

```typescript
// frontend/src/pages/settings/tabs/AppearanceTab.tsx
import { motion } from 'framer-motion';
import {
  Palette,
  Moon,
  Sun,
  Monitor,
  Clock,
  Globe,
  Calendar,
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
```

**Step 3: 提交变更**

```bash
git add frontend/src/pages/settings/tabs/AppearanceTab.tsx
git add frontend/src/pages/settings/hooks/useAppearanceSettings.ts
git commit -m "feat(settings): 新增界面设置Tab组件"
```

---

（因篇幅限制，NotificationTab和StorageTab类似实现，详见完整代码...）

---

## Phase 3: 后端API开发

### Task 6: 新增设置API接口

**Files:**
- Modify: `backend/src/controllers/settings.ts`
- Modify: `backend/src/routes/settings.ts`

**Step 1: 在settings controller中添加新接口**

添加安全、界面、通知、存储设置的读写方法。

**Step 2: 更新路由**

```typescript
// 安全设置
router.get('/security', getSecuritySettings);
router.post('/security', saveSecuritySettings);

// 界面设置
router.get('/appearance', getAppearanceSettings);
router.post('/appearance', saveAppearanceSettings);

// 通知设置
router.get('/notifications', getNotificationSettings);
router.post('/notifications', saveNotificationSettings);

// 存储设置
router.get('/storage', getStorageSettings);
router.post('/storage', saveStorageSettings);
```

**Step 3: 提交变更**

```bash
git add backend/src/controllers/settings.ts backend/src/routes/settings.ts
git commit -m "feat(settings): 新增安全/界面/通知/存储设置API"
```

---

## Phase 4: 测试与验证

### Task 7: 联调测试

**Step 1: 验证所有Tab切换正常**

1. 访问 `/settings` 页面
2. 点击每个Tab验证切换
3. 验证页面加载无报错

**Step 2: 验证数据保存**

1. 在每个Tab修改设置
2. 点击保存
3. 刷新页面验证设置已保存
4. 检查后端数据库数据

**Step 3: 提交最终变更**

```bash
git commit -m "feat(settings): 完成设置页面重构，新增4个设置模块"
```

---

## 附录：测试检查清单

- [ ] Tab导航正常
- [ ] 系统Tab显示正常
- [ ] 界面Tab主题切换生效
- [ ] 安全Tab保存成功
- [ ] 通知Tab开关正常
- [ ] 存储Tab显示正常
- [ ] 邮件Tab原有功能正常
- [ ] 归档Tab原有功能正常
- [ ] 日志Tab原有功能正常
- [ ] 备份Tab原有功能正常
