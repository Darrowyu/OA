import { motion } from 'framer-motion';
import { Search, Share2, Bell, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { users } from '@/data/mockData';

export function Header() {
  const topUsers = users.slice(1, 4);
  const extraUsers = users.length - 4;

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-transparent"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">智慧OA</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium flex items-center gap-2">
          <LayoutDashboardIcon className="h-4 w-4" />
          工作台
        </span>
      </nav>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索审批、文档、联系人..."
            className="pl-10 bg-white border-gray-200 focus:border-gray-900 focus:ring-0"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">3分钟前更新</span>
        
        {/* User Avatars */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {topUsers.map((user) => (
              <Avatar key={user.id} className="w-8 h-8 border-2 border-white">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          {extraUsers > 0 && (
            <span className="ml-1 text-xs text-gray-500">+{extraUsers}</span>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
          <Share2 className="h-4 w-4 text-gray-600" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 relative">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <Button className="bg-gray-900 hover:bg-gray-800 text-white text-sm">
          <UsersIcon className="h-4 w-4 mr-2" />
          邀请成员
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4 text-gray-600" />
        </Button>
      </div>
    </motion.header>
  );
}

function LayoutDashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
