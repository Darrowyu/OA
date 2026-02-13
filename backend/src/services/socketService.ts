import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { NotificationType, Notification } from '@prisma/client';
import * as logger from '../lib/logger';

// Socket.io 服务器实例
let io: SocketIOServer | null = null;

// 在线用户映射表: userId -> socketId[]
const onlineUsers = new Map<string, string[]>();

// 客户端通知数据类型
export interface ClientNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

/**
 * 初始化 Socket.io 服务
 */
export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  // CORS 动态验证：开发环境允许所有 localhost 端口，生产环境读取配置
  const isDev = process.env.NODE_ENV !== 'production';
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || [];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // 无 origin（如移动端）或开发环境 localhost 自动通过
        if (!origin || (isDev && origin.startsWith('http://localhost:'))) {
          return callback(null, true);
        }
        // 检查配置的允许列表
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error('CORS 策略拒绝'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // 连接认证中间件
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token as string;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.userRole = payload.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // 连接处理
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    logger.info(`用户 ${userId} 已连接`, { socketId: socket.id });

    // 将用户加入专属房间
    socket.join(`user:${userId}`);

    // 记录在线状态
    const userSockets = onlineUsers.get(userId) || [];
    userSockets.push(socket.id);
    onlineUsers.set(userId, userSockets);

    // 通知客户端连接成功
    socket.emit('connected', {
      message: 'WebSocket 连接成功',
      timestamp: new Date().toISOString(),
    });

    // 处理断开连接
    socket.on('disconnect', (reason: string) => {
      logger.info(`用户 ${userId} 已断开连接`, { reason });

      // 从在线列表中移除
      const sockets = onlineUsers.get(userId) || [];
      const updatedSockets = sockets.filter((id) => id !== socket.id);
      if (updatedSockets.length === 0) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, updatedSockets);
      }
    });

    // 处理客户端心跳
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  logger.info('Socket.io 服务已初始化');
  return io;
}

/**
 * 获取 Socket.io 实例
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io 尚未初始化，请先调用 initializeSocket');
  }
  return io;
}

/**
 * 获取在线用户列表
 */
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

/**
 * 检查用户是否在线
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * 转换通知为客户端格式
 */
function toClientNotification(notification: Notification): ClientNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    data: (notification.data as Record<string, unknown>) || undefined,
    isRead: notification.isRead,
    readAt: notification.readAt || undefined,
    createdAt: notification.createdAt,
  };
}

/**
 * 发送通知给指定用户
 */
export async function sendNotificationToUser(
  userId: string,
  notification: Notification
): Promise<boolean> {
  try {
    const ioInstance = getIO();
    const room = `user:${userId}`;

    // 转换通知格式
    const clientNotification = toClientNotification(notification);

    // 发送给该用户的所有连接
    ioInstance.to(room).emit('notification:new', clientNotification);

    logger.info(`通知已发送给用户 ${userId}`, { title: notification.title });
    return true;
  } catch (error) {
    logger.error('发送通知失败', { error });
    return false;
  }
}

/**
 * 发送通知给多个用户
 */
export async function sendNotificationToUsers(
  userIds: string[],
  notification: Notification
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const userId of userIds) {
    const result = await sendNotificationToUser(userId, notification);
    if (result) {
      success.push(userId);
    } else {
      failed.push(userId);
    }
  }

  return { success, failed };
}

/**
 * 广播通知给所有在线用户
 */
export async function broadcastNotification(notification: Notification): Promise<number> {
  try {
    const ioInstance = getIO();
    const clientNotification = toClientNotification(notification);

    ioInstance.emit('notification:broadcast', clientNotification);

    const onlineCount = Array.from(onlineUsers.values()).flat().length;
    logger.info(`广播通知已发送`, { onlineCount });
    return onlineCount;
  } catch (error) {
    logger.error('广播通知失败', { error });
    return 0;
  }
}

/**
 * 通知客户端未读数量更新
 */
export async function updateUnreadCount(userId: string, count: number): Promise<void> {
  try {
    const ioInstance = getIO();
    ioInstance.to(`user:${userId}`).emit('notification:unreadCount', { count });
  } catch (error) {
    logger.error('更新未读数量失败', { error });
  }
}
