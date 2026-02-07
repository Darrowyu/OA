import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SignaturePad } from './SignaturePad';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onSignatureSaved?: (signatureData: string) => void;
}

export function SignatureDialog({
  isOpen,
  onClose,
  username,
  onSignatureSaved,
}: SignatureDialogProps) {
  const [currentSignature, setCurrentSignature] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 加载现有签名
  useEffect(() => {
    if (isOpen && username) {
      loadExistingSignature();
    }
  }, [isOpen, username]);

  const loadExistingSignature = async () => {
    try {
      const response = await api.get(`/api/signatures/${username}`);
      if (response.data?.signature) {
        setCurrentSignature(response.data.signature);
      }
    } catch (error) {
      // 如果没有签名，不显示错误
      console.log('未找到现有签名');
    }
  };

  const handleSave = async (signatureData: string) => {
    setIsLoading(true);
    try {
      await api.put(`/api/signatures/${username}`, {
        signature: signatureData,
      });

      // 保存到localStorage缓存
      localStorage.setItem(`signature_${username}`, signatureData);
      localStorage.setItem(`signature_${username}_timestamp`, Date.now().toString());

      setCurrentSignature(signatureData);
      onSignatureSaved?.(signatureData);
      toast.success('签名保存成功');
      onClose();
    } catch (error) {
      console.error('保存签名失败:', error);
      toast.error('保存签名失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentSignature('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>设置电子签名</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            请在下方区域绘制您的签名，签名将用于审批时的身份确认。
          </p>

          <SignaturePad
            onSave={handleSave}
            onClear={handleClear}
            initialSignature={currentSignature}
            width={350}
            height={180}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SignatureDialog;
