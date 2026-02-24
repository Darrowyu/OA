import { useState } from 'react';
import { Archive, Mail, Monitor, FileText, Database, Settings2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// 各功能模块组件
import { SystemTab } from './tabs/SystemTab';
import { ArchiveTab } from './tabs/ArchiveTab';
import { EmailTab } from './tabs/EmailTab';
import { LogsTab } from './tabs/LogsTab';
import { BackupTab } from './tabs/BackupTab';

const tabs = [
  { value: 'system', label: '系统信息', icon: Monitor },
  { value: 'archive', label: '数据归档', icon: Archive },
  { value: 'email', label: '邮件提醒', icon: Mail },
  { value: 'logs', label: '系统日志', icon: FileText },
  { value: 'backup', label: '备份恢复', icon: Database },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('system');

  return (
    <div className="min-h-screen">
      <Header />

      <main className="p-4 sm:p-6 lg:p-8 pt-20">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">系统设置</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">管理系统配置和系统参数</p>
              </div>
            </div>
          </div>

          {/* Tabs 导航 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-white border border-gray-200 p-1 rounded-lg mb-4 sm:mb-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 border border-transparent rounded-md transition-all whitespace-nowrap text-xs sm:text-sm"
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Tab 内容区 */}
            <TabsContent value="system" className="mt-0">
              <SystemTab />
            </TabsContent>

            <TabsContent value="archive" className="mt-0">
              <ArchiveTab />
            </TabsContent>

            <TabsContent value="email" className="mt-0">
              <EmailTab />
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <LogsTab />
            </TabsContent>

            <TabsContent value="backup" className="mt-0">
              <BackupTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
