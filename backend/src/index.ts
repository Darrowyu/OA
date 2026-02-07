import express, { Request, Response, NextFunction } from 'express';
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

// 404处理
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
    },
  });
});

// 全局错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Prisma错误处理
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: unknown };

    // 唯一约束冲突
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '数据已存在',
          details: prismaError.meta,
        },
      });
      return;
    }

    // 外键约束失败
    if (prismaError.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: '关联数据不存在',
        },
      });
      return;
    }

    // 记录未找到
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '记录不存在',
        },
      });
      return;
    }
  }

  // 默认错误响应
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : '服务器内部错误',
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
});

// 启动服务器
const server = app.listen(config.port, () => {
  console.log(`
========================================
  OA系统后端服务已启动
========================================
  环境: ${config.nodeEnv}
  端口: ${config.port}
  时间: ${new Date().toLocaleString()}
========================================
  `);
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
