import { useRef } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { UserProfile } from '@/types/profile';

const basicInfoSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号').optional().or(z.literal('')),
  position: z.string().max(50, '职位最多50个字符').optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;

interface BasicInfoTabProps {
  profile: UserProfile | null;
  loading: boolean;
  updateBasicInfo: (data: BasicInfoForm) => Promise<unknown>;
  updateAvatar: (file: File) => Promise<unknown>;
}

export function BasicInfoTab({ profile, loading, updateBasicInfo, updateAvatar }: BasicInfoTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const basicForm = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      position: profile?.position || '',
    },
  });

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

  const handleSubmit = async (data: BasicInfoForm) => {
    try {
      await updateBasicInfo(data);
      toast.success('基础信息已更新');
    } catch {
      toast.error('更新失败，请重试');
    }
  };

  return (
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              <Upload className="h-4 w-4 mr-2" />
              更换头像
            </Button>
            <p className="text-sm text-slate-500">支持 JPG、PNG 格式，最大 5MB</p>
          </div>
        </div>

        <Separator />

        {/* 表单区域 */}
        <form onSubmit={basicForm.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={profile?.username || ''} disabled className="bg-slate-50" />
              <p className="text-xs text-slate-500">用户名不可修改</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">工号</Label>
              <Input id="employeeId" value={profile?.employeeId || ''} disabled className="bg-slate-50" />
              <p className="text-xs text-slate-500">工号由系统分配</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input id="name" {...basicForm.register('name')} defaultValue={profile?.name} />
              {basicForm.formState.errors.name && (
                <p className="text-sm text-red-500">{basicForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input id="email" type="email" {...basicForm.register('email')} defaultValue={profile?.email} />
              {basicForm.formState.errors.email && (
                <p className="text-sm text-red-500">{basicForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input id="phone" {...basicForm.register('phone')} defaultValue={profile?.phone} placeholder="请输入手机号" />
              {basicForm.formState.errors.phone && (
                <p className="text-sm text-red-500">{basicForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">职位</Label>
              <Input id="position" {...basicForm.register('position')} defaultValue={profile?.position} placeholder="请输入职位" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">部门</Label>
              <Input id="department" value={profile?.department || ''} disabled className="bg-slate-50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">角色</Label>
              <Input id="role" value={profile?.role || ''} disabled className="bg-slate-50" />
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
  );
}
