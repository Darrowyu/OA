import { motion } from 'framer-motion';
import { Plus, LayoutDashboard, FileCheck, Clock, Calendar, FolderOpen, Users, Bell, LayoutGrid, HelpCircle, Receipt } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { currentUser, sidebarNavigation } from '@/data/mockData';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileCheck,
  Clock,
  Calendar,
  FolderOpen,
  Users,
  Bell,
  LayoutGrid,
  Receipt,
};

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-[260px] h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">智慧OA</p>
          <p className="text-xs text-gray-500">企业办公系统</p>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
          <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
          <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
        </div>
      </div>

      {/* Create Task Button */}
      <div className="px-4 pb-4">
        <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新建申请
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* Main Navigation */}
        <ul className="space-y-1">
          {sidebarNavigation.main.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    item.active
                      ? 'bg-gray-100 text-gray-900 font-medium border-l-3 border-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600">
                      {item.badge}
                    </Badge>
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Favourites */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">快捷入口</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          </div>
          <ul className="space-y-1">
            {sidebarNavigation.favourites.map((item) => {
              const Icon = iconMap[item.icon] || LayoutGrid;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Help Center */}
      <div className="p-4 border-t border-gray-200">
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
        >
          <HelpCircle className="h-4 w-4" />
          <span>帮助中心</span>
        </a>
      </div>
    </motion.aside>
  );
}
