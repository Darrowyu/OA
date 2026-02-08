import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
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
import { startReminderScheduler } from './services/reminder';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeSocket } from './services/socketService';
import notificationRoutes from './routes/notifications';
import { createServer } from 'http';

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
  console.log(`
========================================
  OA系统后端服务已启动
========================================
  环境: ${config.nodeEnv}
  端口: ${config.port}
  时间: ${new Date().toLocaleString()}
========================================
  `);

  // 启动提醒定时任务
  startReminderScheduler();
});

// 优雅关闭处理
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} 信号接收到，开始优雅关闭...`);

  server.close(() => {
    console.log('HTTP服务器已关闭');
    process.exit(0);
  });

  // 超时强制退出
  setTimeout(() => {
    console.error('关闭超时，强制退出');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
