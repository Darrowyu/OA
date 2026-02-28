import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  CheckCheck,
  Trash2,
  FileCheck,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Wifi,
  WifiOff,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType, WebSocketStatus } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/utils';

interface NotificationPanelProps {
  onClose: () => void;
}

// 通知类型图标
const typeIcons: Record<NotificationType, React.ElementType> = {
  APPROVAL: FileCheck,
  MESSAGE: MessageSquare,
  SYSTEM: AlertCircle,
  TASK: CheckCircle2,
};

// 通知类型颜色
const typeColors: Record<NotificationType, string> = {
  APPROVAL: 'bg-blue-500/10 text-blue-600',
  MESSAGE: 'bg-green-500/10 text-green-600',
  SYSTEM: 'bg-orange-500/10 text-orange-600',
  TASK: 'bg-purple-500/10 text-purple-600',
};

// 通知类型标签
const typeLabels: Record<NotificationType, string> = {
  APPROVAL: '审批',
  MESSAGE: '消息',
  SYSTEM: '系统',
  TASK: '任务',
};

// WebSocket 状态图标
const wsStatusIcons: Record<WebSocketStatus, React.ElementType> = {
  connected: Wifi,
  connecting: Loader2,
  disconnected: WifiOff,
  error: WifiOff,
};

// WebSocket 状态文本
const wsStatusLabels: Record<WebSocketStatus, string> = {
  connected: '已连接',
  connecting: '连接中...',
  disconnected: '已断开',
  error: '连接错误',
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const Icon = typeIcons[notification.type];

  // 获取通知跳转链接
  const getNavigateUrl = (): string | null => {
    const data = notification.data;
    if (!data || typeof data !== 'object') return null;

    // 审批通知跳转到申请详情
    if (notification.type === 'APPROVAL' && 'applicationId' in data) {
      return `/applications/${data.applicationId}`;
    }

    // 任务通知跳转到任务详情
    if (notification.type === 'TASK' && 'taskId' in data) {
      return `/tasks/${data.taskId}`;
    }

    // 消息通知跳转到消息详情或联系人
    if (notification.type === 'MESSAGE' && 'contactId' in data) {
      return `/contacts/${data.contactId}`;
    }

    return null;
  };

  const handleClick = () => {
    const url = getNavigateUrl();
    // 未读通知点击后自动标记为已读
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    if (url) {
      onNavigate(url);
    }
  };

  const url = getNavigateUrl();
  const isClickable = !!url;

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-4 transition-colors hover:bg-gray-50',
        !notification.isRead && 'bg-blue-50/50',
        isClickable && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* 图标 */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          typeColors[notification.type]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium text-gray-900 line-clamp-1',
              !notification.isRead && 'font-semibold'
            )}
          >
            {notification.title}
          </p>
          <span className="text-xs text-gray-400 shrink-0">
            {formatDistanceToNow(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {notification.content}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
              typeColors[notification.type]
            )}
          >
            {typeLabels[notification.type]}
          </span>
          {notification.data && typeof notification.data === 'object' && 'applicationNo' in notification.data && (
            <span className="text-[10px] text-gray-400">
              单号: {String(notification.data.applicationNo)}
            </span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="标记为已读"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 未读指示器 */}
      {!notification.isRead && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
      )}
    </div>
  );
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    wsStatus,
    isLoading,
    hasMore,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    reconnect,
  } = useNotifications();

  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // 处理通知点击跳转
  const handleNavigate = (url: string) => {
    navigate(url);
    onClose();
  };

  // 过滤通知
  const filteredNotifications = notifications.filter((n) =>
    activeTab === 'unread' ? !n.isRead : true
  );

  // 滚动加载更多
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !isLoading) {
      loadMore();
    }
  };

  // WebSocket 状态图标
  const WsIcon = wsStatusIcons[wsStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">消息通知</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* WebSocket 状态 */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 text-xs',
              wsStatus === 'connected' && 'text-green-600',
              wsStatus === 'error' && 'text-red-600',
              wsStatus === 'connecting' && 'text-yellow-600'
            )}
            onClick={reconnect}
            title="点击重连"
          >
            <WsIcon
              className={cn(
                'h-3.5 w-3.5 mr-1',
                wsStatus === 'connecting' && 'animate-spin'
              )}
            />
            {wsStatusLabels[wsStatus]}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-100">
        <button
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'all'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          )}
          onClick={() => setActiveTab('all')}
        >
          全部
          {activeTab === 'all' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
            />
          )}
        </button>
        <button
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'unread'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          )}
          onClick={() => setActiveTab('unread')}
        >
          未读
          {unreadCount > 0 && (
            <span className="ml-1 text-xs text-red-500">({unreadCount})</span>
          )}
          {activeTab === 'unread' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
            />
          )}
        </button>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            全部已读
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={deleteAllRead}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            清除已读
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={refresh}
        >
          刷新
        </Button>
      </div>

      {/* 通知列表 */}
      <ScrollArea
        ref={scrollRef}
        className="h-[400px]"
        onScroll={handleScroll}
      >
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bell className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">
              {activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={handleNavigate}
              />
            ))}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {!hasMore && filteredNotifications.length > 10 && (
              <div className="text-center py-3 text-xs text-gray-400">
                已加载全部通知
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* 底部 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
        <Button
          variant="link"
          size="sm"
          className="text-xs text-gray-500 hover:text-gray-700"
          onClick={() => {
            // 可以导航到通知中心页面
            onClose();
          }}
        >
          查看全部通知
        </Button>
      </div>
    </motion.div>
  );
}
