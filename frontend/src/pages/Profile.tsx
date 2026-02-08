import { useState } from 'react';
import { Loader2, User, Lock, Palette, Bell, PenTool, Shield, Monitor } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/pages/equipment/components/PageHeader';
import { useProfile } from '@/hooks/useProfile';
import {
  BasicInfoTab,
  SecurityTab,
  AppearanceTab,
  NotificationsTab,
  SignatureTab,
  PrivacyTab,
  DevicesTab,
} from './profile/index';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('basic');

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

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const tabs = [
    { value: 'basic', label: '基础信息', icon: User, component: BasicInfoTab },
    { value: 'security', label: '账户安全', icon: Lock, component: SecurityTab },
    { value: 'appearance', label: '个性化', icon: Palette, component: AppearanceTab },
    { value: 'notifications', label: '通知', icon: Bell, component: NotificationsTab },
    { value: 'signature', label: '签名', icon: PenTool, component: SignatureTab },
    { value: 'privacy', label: '隐私', icon: Shield, component: PrivacyTab },
    { value: 'devices', label: '设备', icon: Monitor, component: DevicesTab },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="个人设置" description="管理您的个人资料、偏好设置和安全选项" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {activeTab === 'basic' && (
            <BasicInfoTab
              profile={profile}
              loading={loading}
              updateBasicInfo={updateBasicInfo}
              updateAvatar={updateAvatar}
            />
          )}
          {activeTab === 'security' && (
            <SecurityTab
              preference={preference}
              loading={loading}
              changePassword={changePassword}
            />
          )}
          {activeTab === 'appearance' && (
            <AppearanceTab preference={preference} updatePreferences={updatePreferences} />
          )}
          {activeTab === 'notifications' && (
            <NotificationsTab preference={preference} updatePreferences={updatePreferences} />
          )}
          {activeTab === 'signature' && (
            <SignatureTab profile={profile} updateSignature={updateSignature} />
          )}
          {activeTab === 'privacy' && (
            <PrivacyTab preference={preference} updatePreferences={updatePreferences} />
          )}
          {activeTab === 'devices' && (
            <DevicesTab
              devices={devices}
              loading={loading}
              revokeDevice={revokeDevice}
              revokeAllDevices={revokeAllDevices}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
