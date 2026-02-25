import { useState } from 'react';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User } from '@/types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
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
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            重置密码
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {user && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p>
                <span className="text-gray-500">用户：</span>
                <span className="font-medium">{user.name}</span>
              </p>
              <p>
                <span className="text-gray-500">用户名：</span>
                <span>{user.username}</span>
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">确认密码</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              密码重置后，用户将需要使用新密码登录。建议提醒用户及时修改为自己的常用密码。
            </AlertDescription>
          </Alert>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认重置
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
