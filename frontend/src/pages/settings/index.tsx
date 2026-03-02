import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  Mail,
  Monitor,
  FileText,
  Database,
  Settings2,
  Palette,
  Shield,
  Bell,
  HardDrive,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// 各功能模块组件
import { SystemTab } from './tabs/SystemTab';
import { ArchiveTab } from './tabs/ArchiveTab';
import { EmailTab } from './tabs/EmailTab';
import { LogsTab } from './tabs/LogsTab';
import { BackupTab } from './tabs/BackupTab';
import { SecurityTab } from './tabs/SecurityTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { NotificationTab } from './tabs/NotificationTab';
import { StorageTab } from './tabs/StorageTab';

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

const tabs = [
  { value: 'system', label: '系统', icon: Monitor },
  { value: 'appearance', label: '界面', icon: Palette },
  { value: 'security', label: '安全', icon: Shield },
  { value: 'notification', label: '通知', icon: Bell },
  { value: 'email', label: '邮件', icon: Mail },
  { value: 'storage', label: '存储', icon: HardDrive },
  { value: 'archive', label: '归档', icon: Archive },
  { value: 'logs', label: '日志', icon: FileText },
  { value: 'backup', label: '备份', icon: Database },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('system');

  return (
    <div className="min-h-screen">
      <Header />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-4 sm:p-6 lg:p-8 pt-20"
      >
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">系统设置</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">管理系统配置和系统参数</p>
              </div>
            </div>
          </motion.div>

          {/* Tabs 导航 */}
          <motion.div variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-white border border-gray-200 p-1 rounded-xl mb-6 overflow-x-auto flex-wrap gap-1 h-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 border border-transparent rounded-lg transition-all whitespace-nowrap text-sm font-medium"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Tab 内容区 */}
              <TabsContent value="system" className="mt-0">
                <SystemTab />
              </TabsContent>

              <TabsContent value="appearance" className="mt-0">
                <AppearanceTab />
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <SecurityTab />
              </TabsContent>

              <TabsContent value="notification" className="mt-0">
                <NotificationTab />
              </TabsContent>

              <TabsContent value="email" className="mt-0">
                <EmailTab />
              </TabsContent>

              <TabsContent value="storage" className="mt-0">
                <StorageTab />
              </TabsContent>

              <TabsContent value="archive" className="mt-0">
                <ArchiveTab />
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <LogsTab />
              </TabsContent>

              <TabsContent value="backup" className="mt-0">
                <BackupTab />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}

export default SettingsPage;
