import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { UserPreference } from '@/types/profile';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

interface SecurityTabProps {
  preference: UserPreference | null;
  loading: boolean;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<unknown>;
}

export function SecurityTab({ preference, loading, changePassword }: SecurityTabProps) {
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>定期更换密码可以提高账户安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">原密码</Label>
              <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
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
    </div>
  );
}
