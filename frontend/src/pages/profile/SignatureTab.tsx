import { useState } from 'react';
import { toast } from 'sonner';
import { PenTool, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignaturePad } from '@/components/SignaturePad';
import type { UserProfile } from '@/types/profile';

interface SignatureTabProps {
  profile: UserProfile | null;
  updateSignature: (data: { signature: string }) => Promise<unknown>;
}

export function SignatureTab({ profile, updateSignature }: SignatureTabProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSignatureSave = async (signature: string) => {
    try {
      await updateSignature({ signature });
      toast.success('签名已保存');
      setShowSignaturePad(false);
    } catch {
      toast.error('签名保存失败');
    }
  };

  return (
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
              <img src={profile.signature} alt="签名预览" className="max-h-32 mx-auto" />
            </div>
          </div>
        )}

        {showSignaturePad ? (
          <div className="space-y-4">
            <SignaturePad onSave={handleSignatureSave} onClear={() => {}} />
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShowSignaturePad(false)}>
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
              <Button variant="outline" onClick={() => updateSignature({ signature: '' })}>
                <Trash2 className="h-4 w-4 mr-2" />
                清除签名
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
