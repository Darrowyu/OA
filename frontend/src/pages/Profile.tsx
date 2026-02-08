import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Lock,
  Palette,
  Bell,
  PenTool,
  Shield,
  Monitor,
  Database,
  Upload,
  Smartphone,
  Globe,
  Trash2,
  Download,
  Check,
  X,
  Loader2,
  Laptop,
  Tablet,
  Moon,
  Sun,
  Monitor as MonitorIcon,
  Eye,
  EyeOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/pages/equipment/components/PageHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { useProfile } from '@/hooks/useProfile';
import {
  Theme,
  InterfaceDensity,
  ProfileVisibility,
  OnlineStatus,
  NotificationFrequency,
  type UpdatePreferencesRequest,
} from '@/types/profile';

// 基础信息表单验证
const basicInfoSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional().or(z.literal('')),
  position: z.string().max(50, '职位最多50个字符').optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;

// 密码修改表单验证
const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function Profile() {
  const [activeTab, setActiveTab] = useState('basic');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    profile,
    preference,
    devices,
    loading,
    error,
    updateBasicInfo,
    updateAvatar,
    changePassword,
    updatePreferences,
    revokeDevice,
    revokeAllDevices,
    updateSignature,
  } = useProfile();

  // 基础信息表单
  const basicForm = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      position: profile?.position || '',
    },
  });

  // 密码表单
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('头像文件大小不能超过 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    try {
      await updateAvatar(file);
      toast.success('头像上传成功');
    } catch {
      toast.error('头像上传失败');
    }
  };

  // 处理基础信息保存
  const handleBasicInfoSubmit = async (data: BasicInfoForm) => {
    try {
      await updateBasicInfo(data);
      toast.success('基础信息已更新');
    } catch {
      toast.error('更新失败，请重试');
    }
  };

  // 处理密码修改
  const handlePasswordSubmit = async (data: PasswordForm) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('密码修改成功');
      passwordForm.reset();
    } catch {
      toast.error('密码修改失败，请检查原密码');
    }
  };

  // 处理签名保存
  const handleSignatureSave = async (signature: string) => {
    try {
      await updateSignature({ signature });
      toast.success('签名已保存');
      setShowSignaturePad(false);
    } catch {
      toast.error('签名保存失败');
    }
  };

  // 处理设备踢出
  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await revokeDevice(deviceId);
      toast.success('设备已踢出');
    } catch {
      toast.error('操作失败');
    }
  };

  // 处理踢出所有设备
  const handleRevokeAllDevices = async () => {
    try {
      await revokeAllDevices();
      toast.success('其他设备已踢出');
    } catch {
      toast.error('操作失败');
    }
  };

  // 处理导出数据
  const handleExportData = () => {
    // 实际项目中应该调用 API
    toast.info('正在准备导出数据...');
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="个人设置"
        description="管理您的个人资料、偏好设置和安全选项"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="basic" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">基础信息</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">账户安全</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">个性化</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">通知</span>
          </TabsTrigger>
          <TabsTrigger value="signature" className="gap-2">
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">签名</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">隐私</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">设备</span>
          </TabsTrigger>
        </TabsList>

        {/* 基础信息 */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基础信息</CardTitle>
              <CardDescription>更新您的个人基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 头像区域 */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback className="text-2xl bg-slate-200">
                    {profile?.name?.[0] || profile?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    更换头像
                  </Button>
                  <p className="text-sm text-slate-500">支持 JPG、PNG 格式，最大 5MB</p>
                </div>
              </div>

              <Separator />

              {/* 表单区域 */}
              <form onSubmit={basicForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      value={profile?.username || ''}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">用户名不可修改</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeId">工号</Label>
                    <Input
                      id="employeeId"
                      value={profile?.employeeId || ''}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">工号由系统分配</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">姓名 *</Label>
                    <Input
                      id="name"
                      {...basicForm.register('name')}
                      defaultValue={profile?.name}
                    />
                    {basicForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{basicForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱 *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...basicForm.register('email')}
                      defaultValue={profile?.email}
                    />
                    {basicForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{basicForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <Input
                      id="phone"
                      {...basicForm.register('phone')}
                      defaultValue={profile?.phone}
                      placeholder="请输入手机号"
                    />
                    {basicForm.formState.errors.phone && (
                      <p className="text-sm text-red-500">{basicForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">职位</Label>
                    <Input
                      id="position"
                      {...basicForm.register('position')}
                      defaultValue={profile?.position}
                      placeholder="请输入职位"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">部门</Label>
                    <Input
                      id="department"
                      value={profile?.department || ''}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">角色</Label>
                    <Input
                      id="role"
                      value={profile?.role || ''}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    保存修改
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 账户安全 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>定期更换密码可以提高账户安全性</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">原密码</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register('currentPassword')}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">新密码</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register('newPassword')}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认新密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  修改密码
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>双因素认证 (2FA)</CardTitle>
              <CardDescription>启用 2FA 可以为您的账户提供额外保护</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Smartphone className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">双因素认证</p>
                    <p className="text-sm text-slate-500">
                      {preference?.twoFactorEnabled ? '已启用' : '未启用'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preference?.twoFactorEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      toast.info('2FA 设置功能开发中');
                    } else {
                      toast.info('2FA 禁用功能开发中');
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 个性化设置 */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>主题设置</CardTitle>
              <CardDescription>选择您喜欢的界面主题</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: Theme.LIGHT, label: '浅色', icon: Sun },
                  { value: Theme.DARK, label: '深色', icon: Moon },
                  { value: Theme.SYSTEM, label: '跟随系统', icon: MonitorIcon },
                ].map((theme) => (
                  <div
                    key={theme.value}
                    className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      preference?.theme === theme.value
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => updatePreferences({ theme: theme.value })}
                  >
                    <theme.icon className="h-8 w-8 text-slate-600" />
                    <span className="font-medium">{theme.label}</span>
                    {preference?.theme === theme.value && (
                      <Check className="h-5 w-5 text-slate-900" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>界面密度</CardTitle>
              <CardDescription>调整界面元素的紧凑程度</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: InterfaceDensity.COMPACT, label: '紧凑', desc: '更小的间距，显示更多内容' },
                  { value: InterfaceDensity.DEFAULT, label: '默认', desc: '标准间距' },
                  { value: InterfaceDensity.COMFORTABLE, label: '舒适', desc: '更大的间距，更易阅读' },
                ].map((density) => (
                  <div
                    key={density.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      preference?.interfaceDensity === density.value
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => updatePreferences({ interfaceDensity: density.value })}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{density.label}</span>
                      {preference?.interfaceDensity === density.value && (
                        <Check className="h-5 w-5 text-slate-900" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{density.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>侧边栏设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">默认收起侧边栏</p>
                  <p className="text-sm text-slate-500">登录后侧边栏默认处于收起状态</p>
                </div>
                <Switch
                  checked={preference?.sidebarCollapsed}
                  onCheckedChange={(checked) => updatePreferences({ sidebarCollapsed: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>邮件通知</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用邮件通知</p>
                  <p className="text-sm text-slate-500">接收系统发送的邮件通知</p>
                </div>
                <Switch
                  checked={preference?.emailNotifications}
                  onCheckedChange={(checked) => updatePreferences({ emailNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="font-medium">审批提醒</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: NotificationFrequency.INSTANT, label: '即时通知' },
                    { value: NotificationFrequency.DIGEST, label: '每日摘要' },
                    { value: NotificationFrequency.OFF, label: '关闭' },
                  ].map((freq) => (
                    <div
                      key={freq.value}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                        preference?.approvalNotifications === freq.value
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => updatePreferences({ approvalNotifications: freq.value })}
                    >
                      {freq.label}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>其他通知</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'systemAnnouncements', label: '系统公告', desc: '接收系统更新和重要公告' },
                { key: 'weeklyReport', label: '周报订阅', desc: '每周一接收工作周报' },
                { key: 'monthlyReport', label: '月报订阅', desc: '每月初接收工作月报' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={preference?.[item.key as keyof typeof preference] as boolean}
                    onCheckedChange={(checked) =>
                      updatePreferences({ [item.key]: checked } as UpdatePreferencesRequest)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 签名设置 */}
        <TabsContent value="signature" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>审批签名</CardTitle>
              <CardDescription>设置您的审批签名，将用于审批流程中的签名确认</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile?.signature && !showSignaturePad && (
                <div className="space-y-2">
                  <Label>当前签名</Label>
                  <div className="border rounded-lg p-4 bg-slate-50 max-w-md">
                    <img
                      src={profile.signature}
                      alt="签名预览"
                      className="max-h-32 mx-auto"
                    />
                  </div>
                </div>
              )}

              {showSignaturePad ? (
                <div className="space-y-4">
                  <SignaturePad
                    onSave={handleSignatureSave}
                    onClear={() => {}}
                  />
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignaturePad(false)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={() => setShowSignaturePad(true)}>
                    <PenTool className="h-4 w-4 mr-2" />
                    {profile?.signature ? '重新签名' : '创建签名'}
                  </Button>
                  {profile?.signature && (
                    <Button
                      variant="outline"
                      onClick={() => updateSignature({ signature: '' })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      清除签名
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 隐私设置 */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>隐私设置</CardTitle>
              <CardDescription>管理您的个人资料可见性和在线状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-3">个人资料可见性</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: ProfileVisibility.EVERYONE, label: '所有人', icon: Globe },
                      { value: ProfileVisibility.COLLEAGUES, label: '仅同事', icon: User },
                      { value: ProfileVisibility.DEPARTMENT, label: '仅部门', icon: EyeOff },
                    ].map((visibility) => (
                      <div
                        key={visibility.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          preference?.profileVisibility === visibility.value
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => updatePreferences({ profileVisibility: visibility.value })}
                      >
                        <visibility.icon className="h-5 w-5 text-slate-600" />
                        <span>{visibility.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {preference?.onlineStatus === OnlineStatus.VISIBLE ? (
                        <Eye className="h-5 w-5 text-slate-600" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">在线状态</p>
                      <p className="text-sm text-slate-500">
                        {preference?.onlineStatus === OnlineStatus.VISIBLE ? '显示在线状态' : '隐藏在线状态'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preference?.onlineStatus === OnlineStatus.VISIBLE}
                    onCheckedChange={(checked) =>
                      updatePreferences({
                        onlineStatus: checked ? OnlineStatus.VISIBLE : OnlineStatus.HIDDEN,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>数据管理</CardTitle>
              <CardDescription>导出或管理您的个人数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Database className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">导出个人数据</p>
                    <p className="text-sm text-slate-500">下载包含您所有个人数据的 JSON 文件</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  导出数据
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 设备管理 */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>登录设备</CardTitle>
                  <CardDescription>管理您的登录设备</CardDescription>
                </div>
                <Button variant="outline" onClick={handleRevokeAllDevices}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  踢出其他设备
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">暂无设备记录</p>
                ) : (
                  devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          {device.deviceType === 'mobile' ? (
                            <Smartphone className="h-6 w-6 text-slate-600" />
                          ) : device.deviceType === 'tablet' ? (
                            <Tablet className="h-6 w-6 text-slate-600" />
                          ) : (
                            <Laptop className="h-6 w-6 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{device.deviceName}</span>
                            {device.isCurrent && (
                              <Badge variant="secondary" className="text-xs">当前设备</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {device.browser} · {device.os}
                            {device.ipAddress && ` · ${device.ipAddress}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            最后活跃: {new Date(device.lastActiveAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!device.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeDevice(device.deviceId)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
