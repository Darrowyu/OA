import { Globe, User, EyeOff, Eye, Database, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ProfileVisibility,
  OnlineStatus,
  type UserPreference,
  type UpdatePreferencesRequest,
} from '@/types/profile';

interface PrivacyTabProps {
  preference: UserPreference | null;
  updatePreferences: (data: UpdatePreferencesRequest) => Promise<unknown>;
}

export function PrivacyTab({ preference, updatePreferences }: PrivacyTabProps) {
  const handleExportData = () => {
    toast.info('正在准备导出数据...');
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
