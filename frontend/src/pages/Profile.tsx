import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, User, Lock, Palette, Bell, PenTool, Shield, Monitor } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

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
    <>
      <Header />
      <main className="p-4 md:p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto space-y-6"
        >
          {/* 页面标题 */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>
            <p className="text-gray-500 mt-1">管理您的个人资料、偏好设置和安全选项</p>
          </motion.div>

          {error && (
            <motion.div variants={itemVariants} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tabs 导航 - 响应式水平滚动 */}
              <div className="bg-white rounded-lg border p-1">
                <TabsList className="w-full h-auto bg-transparent p-0 flex flex-wrap gap-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 min-w-[80px] gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white"
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

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
          </motion.div>
        </motion.div>
      </main>
    </>
  );
}
