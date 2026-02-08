import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Theme, InterfaceDensity, type UserPreference, type UpdatePreferencesRequest } from '@/types/profile';

interface AppearanceTabProps {
  preference: UserPreference | null;
  updatePreferences: (data: UpdatePreferencesRequest) => Promise<unknown>;
}

export function AppearanceTab({ preference, updatePreferences }: AppearanceTabProps) {
  return (
    <div className="space-y-6">
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
              { value: Theme.SYSTEM, label: '跟随系统', icon: Monitor },
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
    </div>
  );
}
