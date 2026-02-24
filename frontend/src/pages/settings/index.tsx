import { useNavigate } from 'react-router-dom';
import {
  Users,
  GitBranch,
  Server,
  FileText,
  Database,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsCard } from './components/SettingsCard';
import { ArchiveModule } from './components/ArchiveModule';
import { EmailModule } from './components/EmailModule';

export function SettingsHome() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return null;
  }

  const externalModules = [
    {
      icon: Users,
      title: '用户管理',
      description: '管理系统用户、角色和权限',
      href: '/users',
      color: 'bg-indigo-600',
      onClick: () => navigate('/users'),
    },
    {
      icon: GitBranch,
      title: '工作流管理',
      description: '配置审批流程和工作流规则',
      href: '/workflow',
      color: 'bg-emerald-600',
      onClick: () => navigate('/workflow'),
    },
  ];

  const comingSoonModules = [
    {
      icon: Server,
      title: '系统信息',
      description: '查看系统版本、运行状态和资源配置',
      href: '/settings/system',
      color: 'bg-cyan-600',
      onClick: () => alert('功能开发中'),
    },
    {
      icon: FileText,
      title: '系统日志',
      description: '查看系统运行日志和错误记录',
      href: '/settings/logs',
      color: 'bg-rose-600',
      onClick: () => alert('功能开发中'),
    },
    {
      icon: Database,
      title: '备份恢复',
      description: '管理系统数据备份和恢复操作',
      href: '/settings/backup',
      color: 'bg-amber-600',
      onClick: () => alert('功能开发中'),
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-500 mt-1">管理系统配置、数据归档和提醒策略</p>
        </div>

        {/* 核心模块 - 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ArchiveModule />
          <EmailModule />
        </div>

        {/* 外部模块入口 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {externalModules.map((module) => (
              <SettingsCard key={module.title} {...module} />
            ))}
          </div>
        </div>

        {/* 即将上线功能 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">高级功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comingSoonModules.map((module) => (
              <SettingsCard key={module.title} {...module} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default SettingsHome;
