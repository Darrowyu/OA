import { useState, useEffect, useRef, useCallback } from 'react';
import { Notification, WebSocketStatus } from '@/types';
import { notificationsApi } from '@/services/notifications';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Socket = {
  connected: boolean;
  disconnect(): void;
  emit(event: string, ...args: unknown[]): void;
  on(event: string, callback: (...args: any[]) => void): Socket;
  join?(room: string): void;
};

// 动态导入 socket.io-client
let io: (url: string, opts?: Record<string, unknown>) => Socket;
if (typeof window !== 'undefined') {
  io = require('socket.io-client').io;
}

// Socket.io 服务器地址
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  wsStatus: WebSocketStatus;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  reconnect: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getToken = () => localStorage.getItem('accessToken');

  const connectSocket = useCallback(() => {

    const token = getToken();
    if (!token) return;

    if (socketRef.current?.connected) return;

    setWsStatus('connecting');

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('WebSocket 连接成功');
      setWsStatus('connected');
      reconnectAttemptsRef.current = 0;
    });

    socket.on('connect_error', (error: Error) => {
      console.error('WebSocket 连接错误:', error);
      setWsStatus('error');
    });

    socket.on('disconnect', (reason: string) => {
      console.log('WebSocket 断开连接:', reason);
      setWsStatus('disconnected');
    });

    socket.on('connected', (data: unknown) => {
      console.log('服务器确认连接:', data);
    });

    socket.on('notification:new', (notification: Notification) => {
      console.log('收到新通知:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.info(notification.title, {
        description: notification.content,
        duration: 5000,
      });
    });

    socket.on('notification:broadcast', (notification: Notification) => {
      console.log('收到广播通知:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.info(notification.title, {
        description: notification.content,
        duration: 5000,
      });
    });

    socket.on('notification:unreadCount', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on('pong', () => {
      // 保持连接活跃
    });

    socketRef.current = socket;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnectSocket();
    reconnectAttemptsRef.current = 0;
    connectSocket();
  }, [connectSocket, disconnectSocket]);

  const fetchNotifications = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      setIsLoading(true);
      const response = await notificationsApi.getNotifications({
        page: pageNum,
        pageSize: 20,
      });

      if (response.success) {
        const { items, totalPages } = response.data;
        if (isLoadMore) {
          setNotifications((prev) => [...prev, ...items]);
        } else {
          setNotifications(items);
        }
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('获取通知列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('获取未读数量失败:', error);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await fetchNotifications(page + 1, true);
  }, [fetchNotifications, isLoading, hasMore, page]);

  const refresh = useCallback(async () => {
    await fetchNotifications(1, false);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await notificationsApi.markAsRead(id);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('标记已读失败:', error);
      toast.error('操作失败，请重试');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.isRead
              ? n
              : { ...n, isRead: true, readAt: new Date().toISOString() }
          )
        );
        setUnreadCount(0);
        toast.success(`已标记 ${response.data.count} 条通知为已读`);
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
      toast.error('操作失败，请重试');
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await notificationsApi.deleteNotification(id);
      if (response.success) {
        const deletedNotification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        toast.success('通知已删除');
      }
    } catch (error) {
      console.error('删除通知失败:', error);
      toast.error('删除失败，请重试');
    }
  }, [notifications]);

  const deleteAllRead = useCallback(async () => {
    try {
      const response = await notificationsApi.deleteAllRead();
      if (response.success) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        toast.success(`已删除 ${response.data.count} 条已读通知`);
      }
    } catch (error) {
      console.error('删除已读通知失败:', error);
      toast.error('删除失败，请重试');
    }
  }, []);

  useEffect(() => {
    connectSocket();
    fetchNotifications(1, false);
    fetchUnreadCount();

    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        if (e.newValue) {
          reconnect();
          refresh();
        } else {
          disconnectSocket();
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reconnect, refresh, disconnectSocket]);

  return {
    notifications,
    unreadCount,
    wsStatus,
    isLoading,
    hasMore,
    page,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    reconnect,
  };
}
