import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import applicationsRoutes from './routes/applications';
import approvalsRoutes from './routes/approvals';
import uploadsRoutes from './routes/uploads';
import signatureRoutes from './routes/signatures';
import statisticsRoutes from './routes/statistics';
import exportRoutes from './routes/export';
import emailRoutes from './routes/email';
import reminderRoutes from './routes/reminders';
import adminRoutes from './routes/admin';
import equipmentRoutes from './routes/equipment';
import profileRoutes from './routes/profile';
import departmentRoutes from './routes/departments';
import auditRoutes from './routes/audit';
import calendarRoutes from './routes/calendar';
import documentRoutes from './routes/documents';
import attendanceRoutes from './routes/attendance';
import announcementRoutes from './routes/announcements';
import taskRoutes from './routes/tasks';
import meetingRoutes from './routes/meetings';
import { startReminderScheduler } from './services/reminder';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeSocket } from './services/socketService';
import notificationRoutes from './routes/notifications';
import workflowRoutes from './routes/workflows';
import reportRoutes from './routes/reports';
import knowledgeRoutes from './routes/knowledge';
import productDevelopmentRoutes from './routes/productDevelopment';
import { createServer } from 'http';
import * as logger from './lib/logger';

// 创建Express应用
const app = express();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production',
  crossOriginEmbedderPolicy: config.nodeEnv === 'production',
}));

// CORS配置
app.use(cors(config.cors));

// 日志中间件
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 压缩响应
app.use(compression());

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));

// 解析URL编码请求体
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting - API限流保护
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP 100请求
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 严格限流 - 用于认证端点
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 5, // 每个IP 5次
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '登录尝试次数过多，请5分钟后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功请求不计入限制
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 健康检查端点
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/settings/reminders', reminderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/product-development', productDevelopmentRoutes);

// 404处理
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 创建HTTP服务器
const server = createServer(app);

// 初始化Socket.io
initializeSocket(server);

// 启动服务器
server.listen(config.port, () => {
  logger.info('OA系统后端服务已启动', {
    environment: config.nodeEnv,
    port: config.port,
    time: new Date().toLocaleString(),
  });

  // 启动提醒定时任务
  startReminderScheduler();
});

// 优雅关闭处理
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} 信号接收到，开始优雅关闭...`);

  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });

  // 超时强制退出
  setTimeout(() => {
    logger.error('关闭超时，强制退出');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
