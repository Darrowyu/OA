import { useState } from 'react';
import { Lock, Loader2, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { ROLE_CONFIG } from '../config/roleConfig';

interface ResetPasswordDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string, newPassword: string) => Promise<void>;
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('请输入新密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await onConfirm(user.id, password);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: '弱', color: 'bg-red-500' };
    if (strength <= 4) return { strength, label: '中', color: 'bg-yellow-500' };
    return { strength, label: '强', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <Dialog open={open} onOpenChange={handleClose} closeOnOverlayClick={false}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        {/* 头部 - 系统默认配色 */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <Lock className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <DialogTitle className="text-xl text-gray-900 font-semibold">
                  重置密码
                </DialogTitle>
                <DialogDescription className="text-gray-500 mt-0.5">
                  为用户设置新的登录密码
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          {/* 用户信息卡片 */}
          {user && (
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-medium">
                    {user.name?.charAt(0) || user.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {ROLE_CONFIG[user.role]?.label || user.role}
                </Badge>
              </div>
            </div>
          )}

          {success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">密码重置成功</h3>
              <p className="text-sm text-gray-500">用户可以使用新密码登录系统了</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {/* 新密码 */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  新密码 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入新密码（至少6位）"
                    className="h-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* 密码强度指示器 */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      密码强度：<span className={passwordStrength.color.replace('bg-', 'text-')}>
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* 确认密码 */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  确认密码 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="h-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    密码一致
                  </p>
                )}
              </div>

              {/* 提示信息 */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs text-blue-700">
                  密码重置后，用户将需要使用新密码登录。建议提醒用户及时修改为自己的常用密码。
                </AlertDescription>
              </Alert>

              {/* 底部按钮 */}
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="min-w-[80px]"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="min-w-[100px]"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  确认重置
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
