import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { NotificationFrequency, type UserPreference, type UpdatePreferencesRequest } from '@/types/profile';

interface NotificationsTabProps {
  preference: UserPreference | null;
  updatePreferences: (data: UpdatePreferencesRequest) => Promise<unknown>;
}

export function NotificationsTab({ preference, updatePreferences }: NotificationsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
