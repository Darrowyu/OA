import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
};

const int = (val: string | undefined, def: string) => parseInt(val || def, 10);

export const config = {
  port: int(process.env.PORT, '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: { url: process.env.DATABASE_URL || '' },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: int(process.env.SMTP_PORT, '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    from: process.env.EMAIL_FROM || 'OA System <oa@example.com>',
    retryDelay: int(process.env.EMAIL_RETRY_DELAY, '3000'),
    maxRetries: int(process.env.EMAIL_MAX_RETRIES, '3'),
  },

  server: {
    url: process.env.SERVER_URL || `http://localhost:${int(process.env.PORT, '3001')}`,
  },

  upload: {
    maxFileSize: int(process.env.MAX_FILE_SIZE, '10485760'),
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || (process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3000']),
    credentials: true,
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },

  bcrypt: {
    saltRounds: int(process.env.BCRYPT_SALT_ROUNDS, '10'),
  },
} as const;

export type Config = typeof config;
