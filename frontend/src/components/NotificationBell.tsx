import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from './NotificationPanel';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  unreadCount: number;
  wsStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function NotificationBell({ unreadCount, wsStatus = 'connected' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭面板
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // WebSocket 状态颜色
  const wsStatusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  }[wsStatus];

  return (
    <div ref={containerRef} className="relative">
      {/* 铃铛按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-9 w-9 rounded-full hover:bg-gray-100 relative transition-colors',
          isOpen && 'bg-gray-100'
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="通知"
      >
        <Bell className="h-4 w-4 text-gray-600" />

        {/* 未读数量徽章 */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-medium rounded-full px-1 border-2 border-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* WebSocket 连接状态指示器 */}
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white',
            wsStatusColor
          )}
          title={`WebSocket 状态: ${wsStatus}`}
        />
      </Button>

      {/* 通知面板 */}
      <AnimatePresence>
        {isOpen && (
          <NotificationPanel
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
