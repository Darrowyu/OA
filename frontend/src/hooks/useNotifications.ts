import { useState, useEffect, useRef, useCallback } from 'react';
import { Notification, WebSocketStatus } from '@/types';
import { notificationsApi } from '@/services/notifications';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// 导入 socket.io-client
import io from 'socket.io-client';

// Socket.io 服务器地址
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

// 定义 Socket 类型
type Socket = ReturnType<typeof io>;

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getToken = () => localStorage.getItem('accessToken');

  // 清除重连定时器
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connectSocket = useCallback(() => {
    const token = getToken();
    if (!token) {
      setWsStatus('disconnected'); // 无token时设为断开状态
      return;
    }

    if (socketRef.current?.connected) return;

    setWsStatus('connecting');

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'], // 优先polling，避免某些代理问题
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setWsStatus('connected');
      reconnectAttemptsRef.current = 0;
    });

    socket.on('connect_error', (error: unknown) => {
      logger.error('WebSocket 连接错误', { error });
      setWsStatus('error');

      // 自动重连机制
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // 指数退避，最大30秒

        logger.info(`WebSocket 将在 ${delay}ms 后尝试第 ${reconnectAttemptsRef.current} 次重连...`);

        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!socketRef.current?.connected) {
            setWsStatus('connecting');
            socket.connect();
          }
        }, delay);
      } else {
        logger.error(`WebSocket 重连失败次数超过上限 (${maxReconnectAttempts})，停止自动重连`);
      }
    });

    socket.on('disconnect', (reason: string) => {
      setWsStatus('disconnected');
      logger.info(`WebSocket 断开: ${reason}`);

      // 非主动断开时尝试重连
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!socketRef.current?.connected) {
            reconnect();
          }
        }, delay);
      }
    });

    socket.on('notification:new', (notification: unknown) => {
      const newNotification = notification as Notification;
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.info(newNotification.title, {
        description: newNotification.content,
        duration: 5000,
      });
    });

    socket.on('notification:broadcast', (notification: unknown) => {
      const broadcastNotification = notification as Notification;
      setNotifications((prev) => [broadcastNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.info(broadcastNotification.title, {
        description: broadcastNotification.content,
        duration: 5000,
      });
    });

    socket.on('notification:unreadCount', (data: unknown) => {
      const { count } = data as { count: number };
      setUnreadCount(count);
    });

    socket.on('pong', () => {
      // 保持连接活跃
    });

    socketRef.current = socket;
  }, []);

  const disconnectSocket = useCallback((isUnmount = false) => {
    clearReconnectTimeout();
    if (socketRef.current) {
      // 组件卸载时使用静默断开，避免控制台输出错误
      if (isUnmount) {
        const socket = socketRef.current;
        // 移除所有监听器后断开，避免触发错误日志
        socket.on('disconnect', () => {});
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    clearReconnectTimeout();
    disconnectSocket(false);
    reconnectAttemptsRef.current = 0;
    connectSocket();
  }, [connectSocket, disconnectSocket, clearReconnectTimeout]);

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
      logger.error('获取通知列表失败', { error });
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
      logger.error('获取未读数量失败', { error });
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
      logger.error('标记已读失败', { error });
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
      logger.error('标记全部已读失败', { error });
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
      logger.error('删除通知失败', { error });
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
      logger.error('删除已读通知失败', { error });
      toast.error('删除失败，请重试');
    }
  }, []);

  // 防止 React 严格模式下重复请求
  const isMountedRef = useRef(false);

  useEffect(() => {
    // 避免重复请求
    if (isMountedRef.current) return;
    isMountedRef.current = true;

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
      clearReconnectTimeout();
      disconnectSocket(true); // 组件卸载时静默断开
    };
  }, [connectSocket, disconnectSocket, fetchNotifications, fetchUnreadCount, clearReconnectTimeout]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        if (e.newValue) {
          reconnect();
          refresh();
        } else {
          disconnectSocket(false);
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reconnect, refresh, disconnectSocket, clearReconnectTimeout]);

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
