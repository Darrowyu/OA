# OA审批系统重构计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将现有的OA审批系统从纯HTML/JS + JSON文件存储重构为 React + TypeScript + PostgreSQL 的现代技术栈

**Architecture:**
- 前端: React 18 + TypeScript + Vite + shadcn/ui + Radix UI + Tailwind CSS
- 后端: Node.js + Express + TypeScript + Prisma ORM
- 数据库: PostgreSQL 取代 JSON文件存储
- 保持所有现有功能完整

**Tech Stack:** React, TypeScript, Vite, shadcn/ui, Radix UI, Tailwind CSS, Node.js, Express, Prisma, PostgreSQL

---

## 阶段一: 项目初始化与基础设施

### Task 1: 创建新的项目结构

**Files:**
- Create: `package.json` (根目录)
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `docker-compose.yml` (PostgreSQL)

**Step 1: 初始化根项目**

```bash
npm init -y
```

**Step 2: 安装根项目依赖**

```bash
npm install -D typescript @types/node concurrently
npx tsc --init
```

**Step 3: 创建docker-compose.yml**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: oa_user
      POSTGRES_PASSWORD: oa_password
      POSTGRES_DB: oa_system
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Step 4: 创建.env.example**

```env
# Database
DATABASE_URL="postgresql://oa_user:oa_password@localhost:5432/oa_system"

# Server
PORT=3000
SERVER_URL="http://localhost:3000"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# JWT
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize project structure with docker-compose"
```

---

### Task 2: 初始化前端项目

**Files:**
- Create: `frontend/` 目录及所有初始化文件

**Step 1: 使用Vite创建React+TypeScript项目**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

**Step 2: 安装shadcn/ui依赖**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-icons
```

**Step 3: 配置Tailwind CSS**

修改 `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 4: 创建CSS变量**

修改 `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 5: 安装shadcn/ui组件**

```bash
npm install tailwindcss-animate
# 后续按需安装各个组件
```

**Step 6: Commit**

```bash
git add .
git commit -m "chore(frontend): initialize React + TypeScript + Vite + Tailwind"
```

---

### Task 3: 初始化后端项目

**Files:**
- Create: `backend/` 目录及所有初始化文件

**Step 1: 创建后端目录结构**

```bash
mkdir -p backend/src/{routes,controllers,models,middleware,services,utils}
mkdir -p backend/prisma
mkdir -p backend/uploads
```

**Step 2: 初始化package.json**

```bash
cd backend
npm init -y
```

**Step 3: 安装后端依赖**

```bash
npm install express cors helmet compression multer nodemailer bcrypt jsonwebtoken dotenv
npm install -D typescript @types/express @types/cors @types/multer @types/bcrypt @types/jsonwebtoken @types/node prisma ts-node nodemon
```

**Step 4: 配置TypeScript**

创建 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: 初始化Prisma**

```bash
npx prisma init
```

**Step 6: Commit**

```bash
git add .
git commit -m "chore(backend): initialize Express + TypeScript + Prisma"
```

---

## 阶段二: 数据库设计与迁移

### Task 4: 设计Prisma Schema

**Files:**
- Create: `backend/prisma/schema.prisma`

**Step 1: 定义完整的数据库模型**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户角色枚举
enum UserRole {
  USER
  FACTORY_MANAGER    // 厂长
  DIRECTOR           // 总监
  MANAGER            // 经理
  CEO                // CEO
  ADMIN              // 管理员
  READONLY           // 只读用户
}

// 申请状态枚举
enum ApplicationStatus {
  PENDING_FACTORY    // 待厂长审核
  PENDING_DIRECTOR   // 待总监审批
  PENDING_MANAGER    // 待经理审批
  PENDING_CEO        // 待CEO审批
  APPROVED           // 已通过
  REJECTED           // 已拒绝
}

// 优先级枚举
enum Priority {
  LOW
  MEDIUM
  HIGH
}

// 用户表
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  password      String    // 加密存储
  name          String
  email         String
  role          UserRole  @default(USER)
  department    String?
  employeeId    String?   @unique  // 员工编号
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联
  applications        Application[]        @relation("Applicant")
  factoryApprovals    FactoryApproval[]
  directorApprovals   DirectorApproval[]
  managerApprovals    ManagerApproval[]
  ceoApprovals        CeoApproval[]
  uploadedAttachments Attachment[]         @relation("Uploader")
  reminderLogs        ReminderLog[]

  @@map("users")
}

// 申请表
model Application {
  id                String            @id @default(uuid())
  applicationNo     String            @unique  // 申请编号: YYYYMMDD+序号
  title             String
  content           String
  amount            Decimal?          @db.Decimal(15, 2)
  priority          Priority          @default(MEDIUM)
  status            ApplicationStatus @default(PENDING_FACTORY)

  // 申请人信息
  applicantId       String
  applicant         User              @relation("Applicant", fields: [applicantId], references: [id])
  applicantName     String
  applicantDept     String?

  // 审批人配置
  factoryManagerIds String[]          // 指定的厂长ID列表
  managerIds        String[]          // 指定的经理ID列表

  // 审批结果
  finalResult       String?           // 最终审批结果说明
  rejectedBy        String?           // 拒绝人ID
  rejectedAt        DateTime?
  rejectReason      String?

  // 时间戳
  submittedAt       DateTime          @default(now())
  completedAt       DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // 关联
  factoryApprovals  FactoryApproval[]
  directorApprovals DirectorApproval[]
  managerApprovals  ManagerApproval[]
  ceoApprovals      CeoApproval[]
  attachments       Attachment[]
  reminderLogs      ReminderLog[]

  @@map("applications")
}

// 厂长审批记录
model FactoryApproval {
  id            String   @id @default(uuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  approverId    String
  approver      User     @relation(fields: [approverId], references: [id])

  approved      Boolean
  comment       String?
  createdAt     DateTime @default(now())

  @@map("factory_approvals")
}

// 总监审批记录
model DirectorApproval {
  id            String   @id @default(uuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  approverId    String
  approver      User     @relation(fields: [approverId], references: [id])

  approved      Boolean
  comment       String?
  selectedManagerIds String[]  // 总监选择的经理ID列表
  skipManager   Boolean   @default(false)  // 是否跳过经理审批
  createdAt     DateTime @default(now())

  @@map("director_approvals")
}

// 经理审批记录
model ManagerApproval {
  id            String   @id @default(uuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  approverId    String
  approver      User     @relation(fields: [approverId], references: [id])

  approved      Boolean
  comment       String?
  createdAt     DateTime @default(now())

  @@map("manager_approvals")
}

// CEO审批记录
model CeoApproval {
  id            String   @id @default(uuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  approverId    String
  approver      User     @relation(fields: [approverId], references: [id])

  approved      Boolean
  comment       String?
  createdAt     DateTime @default(now())

  @@map("ceo_approvals")
}

// 附件表
model Attachment {
  id            String   @id @default(uuid())
  filename      String   // 原始文件名
  storedName    String   // 存储文件名
  path          String   // 存储路径
  size          Int      // 文件大小(字节)
  mimeType      String   @default("application/pdf")

  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  uploaderId    String
  uploader      User     @relation("Uploader", fields: [uploaderId], references: [id])

  isApprovalAttachment Boolean @default(false)  // 是否是审批附件
  createdAt     DateTime @default(now())

  @@map("attachments")
}

// 提醒日志表
model ReminderLog {
  id            String   @id @default(uuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  recipientId   String
  recipient     User     @relation(fields: [recipientId], references: [id])

  reminderType  String   // 提醒类型: INITIAL, NORMAL, MEDIUM, URGENT
  reminderCount Int      @default(0)
  sentAt        DateTime @default(now())

  @@map("reminder_logs")
}

// 系统配置表
model SystemConfig {
  id            String   @id @default(uuid())
  key           String   @unique
  value         Json
  updatedAt     DateTime @updatedAt

  @@map("system_config")
}

// 归档记录表
model ArchiveRecord {
  id              String   @id @default(uuid())
  applicationId   String   @unique
  applicationNo   String
  archivedAt      DateTime @default(now())
  archivePath     String   // 归档路径
  dataSnapshot    Json     // 数据快照

  @@map("archive_records")
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat(db): design complete Prisma schema for OA system"
```

---

### Task 5: 数据库迁移与初始化

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`

**Step 1: 启动PostgreSQL**

```bash
docker-compose up -d
```

**Step 2: 创建迁移**

```bash
cd backend
npx prisma migrate dev --name init
```

**Step 3: 生成Prisma Client**

```bash
npx prisma generate
```

**Step 4: 创建种子数据**

创建 `backend/prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 创建管理员账户
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: '系统管理员',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      department: '管理部',
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 5: 运行种子脚本**

```bash
npx ts-node prisma/seed.ts
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(db): create migration and seed data"
```

---

## 阶段三: 后端API开发

### Task 6: 创建基础后端结构

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/config/index.ts`
- Create: `backend/src/lib/prisma.ts`

**Step 1: 创建Prisma客户端单例**

创建 `backend/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Step 2: 创建配置文件**

创建 `backend/src/config/index.ts`:

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxTotalSize: 15 * 1024 * 1024, // 15MB
    allowedTypes: ['application/pdf'],
  },
};
```

**Step 3: 创建主入口文件**

创建 `backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { config } from './config';

const app = express();

// 中间件
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(backend): create base server structure"
```

---

### Task 7: 实现认证模块

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/utils/jwt.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/controllers/auth.ts`

**Step 1: 创建类型定义**

创建 `backend/src/types/index.ts`:

```typescript
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  name: string;
  email: string;
  department?: string;
  employeeId?: string;
}
```

**Step 2: 创建JWT工具**

创建 `backend/src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};
```

**Step 3: 创建认证中间件**

创建 `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '认证失败' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};
```

**Step 4: 创建认证控制器**

创建 `backend/src/controllers/auth.ts`:

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, name, email, department, employeeId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        department,
        employeeId,
      },
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
};
```

**Step 5: 创建认证路由**

创建 `backend/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { login, register } from '../controllers/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);

export default router;
```

**Step 6: 更新主入口文件**

修改 `backend/src/index.ts`:

```typescript
import authRoutes from './routes/auth';

// ... 中间件配置 ...

// 路由
app.use('/api/auth', authRoutes);
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat(backend): implement authentication module"
```

---

### Task 8: 实现用户管理API

**Files:**
- Create: `backend/src/routes/users.ts`
- Create: `backend/src/controllers/users.ts`

**Step 1: 创建用户控制器**

创建 `backend/src/controllers/users.ts`:

```typescript
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';

// 获取用户列表
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;

    const where: any = { isActive: true };

    if (role) {
      where.role = role as UserRole;
    }

    if (search) {
      where.OR = [
        { username: { contains: search as string } },
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          department: true,
          employeeId: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
};

// 获取单个用户
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// 创建用户
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, email, role, department, employeeId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        role: role || UserRole.USER,
        department,
        employeeId,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
};

// 更新用户
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, employeeId, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        department,
        employeeId,
        isActive,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
};

// 删除用户
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: '用户已删除' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
};

// 批量导入用户
export const importUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { users } = req.body;

    const results = await Promise.all(
      users.map(async (userData: any) => {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { username: userData.username },
          });

          if (existingUser) {
            return { username: userData.username, status: 'skipped', reason: '用户已存在' };
          }

          const hashedPassword = await bcrypt.hash(userData.password || '123456', 10);

          await prisma.user.create({
            data: {
              username: userData.username,
              password: hashedPassword,
              name: userData.name,
              email: userData.email,
              role: userData.role || UserRole.USER,
              department: userData.department,
              employeeId: userData.employeeId,
            },
          });

          return { username: userData.username, status: 'success' };
        } catch (error) {
          return { username: userData.username, status: 'error', reason: (error as Error).message };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Import users error:', error);
    res.status(500).json({ error: '批量导入失败' });
  }
};
```

**Step 2: 创建用户路由**

创建 `backend/src/routes/users.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  importUsers,
} from '../controllers/users';

const router = Router();

router.use(authMiddleware);

router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', requireRole(UserRole.ADMIN), createUser);
router.put('/:id', requireRole(UserRole.ADMIN), updateUser);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteUser);
router.post('/import', requireRole(UserRole.ADMIN), importUsers);

export default router;
```

**Step 3: 更新主入口**

修改 `backend/src/index.ts`:

```typescript
import userRoutes from './routes/users';

// ... 在路由部分添加 ...
app.use('/api/users', userRoutes);
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(backend): implement user management API"
```

---

### Task 9: 实现申请管理API

**Files:**
- Create: `backend/src/routes/applications.ts`
- Create: `backend/src/controllers/applications.ts`
- Create: `backend/src/utils/application.ts`

**Step 1: 创建申请工具函数**

创建 `backend/src/utils/application.ts`:

```typescript
import { ApplicationStatus, Priority } from '@prisma/client';

// 生成申请编号
export const generateApplicationNo = async (): Promise<string> => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${dateStr}${randomNum}`;
};

// 解析金额
export const parseAmount = (amountStr: string): number | null => {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[^\d.]/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
};

// 获取下一状态
export const getNextStatus = (
  currentStatus: ApplicationStatus,
  skipManager: boolean = false
): ApplicationStatus | null => {
  const flow: Record<ApplicationStatus, ApplicationStatus | null> = {
    [ApplicationStatus.PENDING_FACTORY]: ApplicationStatus.PENDING_DIRECTOR,
    [ApplicationStatus.PENDING_DIRECTOR]: skipManager
      ? ApplicationStatus.PENDING_CEO
      : ApplicationStatus.PENDING_MANAGER,
    [ApplicationStatus.PENDING_MANAGER]: ApplicationStatus.PENDING_CEO,
    [ApplicationStatus.PENDING_CEO]: ApplicationStatus.APPROVED,
    [ApplicationStatus.APPROVED]: null,
    [ApplicationStatus.REJECTED]: null,
  };
  return flow[currentStatus];
};
```

**Step 2: 创建申请控制器**

创建 `backend/src/controllers/applications.ts`:

```typescript
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { ApplicationStatus, UserRole, Priority } from '@prisma/client';
import { generateApplicationNo, parseAmount, getNextStatus } from '../utils/application';

// 获取申请列表
export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const where: any = {};

    // 根据角色过滤
    if (userRole === UserRole.USER) {
      where.applicantId = userId;
    } else if (userRole === UserRole.FACTORY_MANAGER) {
      where.factoryManagerIds = { has: userId };
      where.status = ApplicationStatus.PENDING_FACTORY;
    } else if (userRole === UserRole.DIRECTOR) {
      where.status = ApplicationStatus.PENDING_DIRECTOR;
    } else if (userRole === UserRole.MANAGER) {
      where.managerIds = { has: userId };
      where.status = ApplicationStatus.PENDING_MANAGER;
    } else if (userRole === UserRole.CEO) {
      where.status = ApplicationStatus.PENDING_CEO;
    }
    // ADMIN和READONLY可以看到所有

    if (status) {
      where.status = status as ApplicationStatus;
    }

    if (search) {
      where.OR = [
        { applicationNo: { contains: search as string } },
        { title: { contains: search as string } },
        { applicantName: { contains: search as string } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          applicant: {
            select: { id: true, name: true, department: true },
          },
          attachments: {
            select: { id: true, filename: true, size: true },
          },
          _count: {
            select: {
              factoryApprovals: true,
              directorApprovals: true,
              managerApprovals: true,
              ceoApprovals: true,
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: '获取申请列表失败' });
  }
};

// 获取单个申请
export const getApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        applicant: {
          select: { id: true, name: true, email: true, department: true },
        },
        attachments: {
          include: {
            uploader: {
              select: { name: true },
            },
          },
        },
        factoryApprovals: {
          include: {
            approver: { select: { name: true } },
          },
        },
        directorApprovals: {
          include: {
            approver: { select: { name: true } },
          },
        },
        managerApprovals: {
          include: {
            approver: { select: { name: true } },
          },
        },
        ceoApprovals: {
          include: {
            approver: { select: { name: true } },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: '获取申请详情失败' });
  }
};

// 创建申请
export const createApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, amount, priority, factoryManagerIds, managerIds } = req.body;
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const applicationNo = await generateApplicationNo();
    const parsedAmount = amount ? parseAmount(amount) : null;

    const application = await prisma.application.create({
      data: {
        applicationNo,
        title,
        content,
        amount: parsedAmount,
        priority: priority || Priority.MEDIUM,
        applicantId: userId,
        applicantName: user.name,
        applicantDept: user.department,
        factoryManagerIds: factoryManagerIds || [],
        managerIds: managerIds || [],
        status: ApplicationStatus.PENDING_FACTORY,
      },
      include: {
        applicant: {
          select: { name: true, email: true },
        },
      },
    });

    // TODO: 发送邮件通知厂长

    res.status(201).json(application);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: '创建申请失败' });
  }
};

// 更新申请
export const updateApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, amount, priority, factoryManagerIds, managerIds } = req.body;

    const existingApp = await prisma.application.findUnique({
      where: { id },
    });

    if (!existingApp) {
      return res.status(404).json({ error: '申请不存在' });
    }

    // 只有待审核状态的申请可以修改
    if (existingApp.status !== ApplicationStatus.PENDING_FACTORY) {
      return res.status(400).json({ error: '当前状态的申请无法修改' });
    }

    const parsedAmount = amount ? parseAmount(amount) : existingApp.amount;

    const application = await prisma.application.update({
      where: { id },
      data: {
        title,
        content,
        amount: parsedAmount,
        priority,
        factoryManagerIds: factoryManagerIds || existingApp.factoryManagerIds,
        managerIds: managerIds || existingApp.managerIds,
      },
    });

    res.json(application);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: '更新申请失败' });
  }
};

// 删除申请
export const deleteApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingApp = await prisma.application.findUnique({
      where: { id },
    });

    if (!existingApp) {
      return res.status(404).json({ error: '申请不存在' });
    }

    // 只有待审核状态的申请可以删除
    if (existingApp.status !== ApplicationStatus.PENDING_FACTORY) {
      return res.status(400).json({ error: '当前状态的申请无法删除' });
    }

    await prisma.application.delete({
      where: { id },
    });

    res.json({ message: '申请已删除' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: '删除申请失败' });
  }
};
```

**Step 3: 创建申请路由**

创建 `backend/src/routes/applications.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../controllers/applications';

const router = Router();

router.use(authMiddleware);

router.get('/', getApplications);
router.get('/:id', getApplication);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

export default router;
```

**Step 4: 更新主入口**

修改 `backend/src/index.ts`:

```typescript
import applicationRoutes from './routes/applications';

// ... 在路由部分添加 ...
app.use('/api/applications', applicationRoutes);
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat(backend): implement application management API"
```

---

### Task 10: 实现审批流程API

**Files:**
- Create: `backend/src/routes/approvals.ts`
- Create: `backend/src/controllers/approvals.ts`

**Step 1: 创建审批控制器**

创建 `backend/src/controllers/approvals.ts`:

```typescript
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { ApplicationStatus, UserRole } from '@prisma/client';
import { getNextStatus } from '../utils/application';

// 厂长审批
export const factoryApprove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;
    const userId = req.user!.userId;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== ApplicationStatus.PENDING_FACTORY) {
      return res.status(400).json({ error: '申请不在待厂长审核状态' });
    }

    // 创建审批记录
    await prisma.factoryApproval.create({
      data: {
        applicationId: id,
        approverId: userId,
        approved,
        comment,
      },
    });

    if (!approved) {
      // 拒绝
      await prisma.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectReason: comment,
        },
      });
      // TODO: 发送拒绝邮件
    } else {
      // 检查是否所有厂长都已审批
      const approvals = await prisma.factoryApproval.findMany({
        where: { applicationId: id },
      });

      const approvedCount = approvals.filter(a => a.approved).length;

      if (approvedCount >= application.factoryManagerIds.length) {
        // 所有厂长都通过了，进入下一状态
        await prisma.application.update({
          where: { id },
          data: { status: ApplicationStatus.PENDING_DIRECTOR },
        });
        // TODO: 发送邮件通知总监
      }
    }

    res.json({ message: approved ? '审批通过' : '已拒绝' });
  } catch (error) {
    console.error('Factory approve error:', error);
    res.status(500).json({ error: '审批失败' });
  }
};

// 总监审批
export const directorApprove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, comment, selectedManagerIds, skipManager } = req.body;
    const userId = req.user!.userId;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== ApplicationStatus.PENDING_DIRECTOR) {
      return res.status(400).json({ error: '申请不在待总监审批状态' });
    }

    // 创建审批记录
    await prisma.directorApproval.create({
      data: {
        applicationId: id,
        approverId: userId,
        approved,
        comment,
        selectedManagerIds: selectedManagerIds || [],
        skipManager: skipManager || false,
      },
    });

    if (!approved) {
      await prisma.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectReason: comment,
        },
      });
    } else {
      // 更新经理列表并进入下一状态
      const nextStatus = skipManager
        ? ApplicationStatus.PENDING_CEO
        : ApplicationStatus.PENDING_MANAGER;

      await prisma.application.update({
        where: { id },
        data: {
          status: nextStatus,
          managerIds: selectedManagerIds || application.managerIds,
        },
      });
      // TODO: 发送邮件通知
    }

    res.json({ message: approved ? '审批通过' : '已拒绝' });
  } catch (error) {
    console.error('Director approve error:', error);
    res.status(500).json({ error: '审批失败' });
  }
};

// 经理审批
export const managerApprove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;
    const userId = req.user!.userId;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== ApplicationStatus.PENDING_MANAGER) {
      return res.status(400).json({ error: '申请不在待经理审批状态' });
    }

    // 创建审批记录
    await prisma.managerApproval.create({
      data: {
        applicationId: id,
        approverId: userId,
        approved,
        comment,
      },
    });

    if (!approved) {
      await prisma.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectReason: comment,
        },
      });
    } else {
      // 检查是否所有经理都已审批
      const approvals = await prisma.managerApproval.findMany({
        where: { applicationId: id },
      });

      const approvedCount = approvals.filter(a => a.approved).length;

      // 特殊规则: 如果经理中包含E10002，跳过CEO审批
      const hasSpecialManager = application.managerIds.some((id: string) =>
        id.includes('E10002')
      );

      if (approvedCount >= application.managerIds.length) {
        if (hasSpecialManager) {
          // 特殊经理审批，直接通过
          await prisma.application.update({
            where: { id },
            data: {
              status: ApplicationStatus.APPROVED,
              completedAt: new Date(),
            },
          });
          // TODO: 发送通过邮件
        } else {
          // 正常流程，进入CEO审批
          await prisma.application.update({
            where: { id },
            data: { status: ApplicationStatus.PENDING_CEO },
          });
          // TODO: 发送邮件通知CEO
        }
      }
    }

    res.json({ message: approved ? '审批通过' : '已拒绝' });
  } catch (error) {
    console.error('Manager approve error:', error);
    res.status(500).json({ error: '审批失败' });
  }
};

// CEO审批
export const ceoApprove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;
    const userId = req.user!.userId;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: '申请不存在' });
    }

    if (application.status !== ApplicationStatus.PENDING_CEO) {
      return res.status(400).json({ error: '申请不在待CEO审批状态' });
    }

    // 创建审批记录
    await prisma.ceoApproval.create({
      data: {
        applicationId: id,
        approverId: userId,
        approved,
        comment,
      },
    });

    if (!approved) {
      await prisma.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectReason: comment,
        },
      });
      // TODO: 发送拒绝邮件
    } else {
      await prisma.application.update({
        where: { id },
        data: {
          status: ApplicationStatus.APPROVED,
          completedAt: new Date(),
        },
      });
      // TODO: 发送通过邮件
      // TODO: 如果金额>100000，通知只读用户
      // TODO: 归档申请
    }

    res.json({ message: approved ? '审批通过' : '已拒绝' });
  } catch (error) {
    console.error('CEO approve error:', error);
    res.status(500).json({ error: '审批失败' });
  }
};
```

**Step 2: 创建审批路由**

创建 `backend/src/routes/approvals.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import {
  factoryApprove,
  directorApprove,
  managerApprove,
  ceoApprove,
} from '../controllers/approvals';

const router = Router();

router.use(authMiddleware);

router.post('/:id/factory', requireRole(UserRole.FACTORY_MANAGER), factoryApprove);
router.post('/:id/director', requireRole(UserRole.DIRECTOR), directorApprove);
router.post('/:id/manager', requireRole(UserRole.MANAGER), managerApprove);
router.post('/:id/ceo', requireRole(UserRole.CEO), ceoApprove);

export default router;
```

**Step 3: 更新主入口**

修改 `backend/src/index.ts`:

```typescript
import approvalRoutes from './routes/approvals';

// ... 在路由部分添加 ...
app.use('/api/approvals', approvalRoutes);
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(backend): implement approval workflow API"
```

---

### Task 11: 实现附件上传API

**Files:**
- Create: `backend/src/routes/uploads.ts`
- Create: `backend/src/middleware/upload.ts`

**Step 1: 创建上传中间件**

创建 `backend/src/middleware/upload.ts`:

```typescript
import multer from 'multer';
import path from 'path';
import { config } from '../config';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传PDF文件'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});
```

**Step 2: 创建上传路由**

创建 `backend/src/routes/uploads.ts`:

```typescript
import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// 上传申请附件
router.post('/application/:id', upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 验证文件名规范
    const invalidFiles = files.filter(file => {
      const hasDate = /\d{8}|\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2}/.test(file.originalname);
      const chineseChars = (file.originalname.match(/[\u4e00-\u9fa5]/g) || []).length;
      return !hasDate || chineseChars < 5;
    });

    if (invalidFiles.length > 0) {
      return res.status(400).json({
        error: '部分文件名不符合规范',
        invalidFiles: invalidFiles.map(f => f.originalname),
      });
    }

    // 保存附件记录
    const attachments = await Promise.all(
      files.map(file =>
        prisma.attachment.create({
          data: {
            filename: file.originalname,
            storedName: file.filename,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype,
            applicationId: id,
            uploaderId: req.user!.userId,
            isApprovalAttachment: false,
          },
        })
      )
    );

    res.json({ attachments });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 上传审批附件
router.post('/approval/:id', upload.array('files', 5), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const attachments = await Promise.all(
      files.map(file =>
        prisma.attachment.create({
          data: {
            filename: file.originalname,
            storedName: file.filename,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype,
            applicationId: id,
            uploaderId: req.user!.userId,
            isApprovalAttachment: true,
          },
        })
      )
    );

    res.json({ attachments });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

export default router;
```

**Step 3: 更新主入口**

修改 `backend/src/index.ts`:

```typescript
import uploadRoutes from './routes/uploads';

// ... 在路由部分添加 ...
app.use('/api/uploads', uploadRoutes);
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(backend): implement file upload API"
```

---

## 阶段四: 前端开发

### Task 12: 创建前端基础结构

**Files:**
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/hooks/useAuth.ts`

**Step 1: 创建工具函数**

创建 `frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: 创建API客户端**

创建 `frontend/src/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }));
      throw new ApiError(response.status, error.error || '请求失败');
    }

    return response.json();
  },

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};
```

**Step 3: 创建类型定义**

创建 `frontend/src/types/index.ts`:

```typescript
export enum UserRole {
  USER = 'USER',
  FACTORY_MANAGER = 'FACTORY_MANAGER',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  CEO = 'CEO',
  ADMIN = 'ADMIN',
  READONLY = 'READONLY',
}

export enum ApplicationStatus {
  PENDING_FACTORY = 'PENDING_FACTORY',
  PENDING_DIRECTOR = 'PENDING_DIRECTOR',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_CEO = 'PENDING_CEO',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  employeeId?: string;
}

export interface Application {
  id: string;
  applicationNo: string;
  title: string;
  content: string;
  amount?: number;
  priority: Priority;
  status: ApplicationStatus;
  applicantId: string;
  applicantName: string;
  applicantDept?: string;
  factoryManagerIds: string[];
  managerIds: string[];
  submittedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  applicant?: User;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  isApprovalAttachment: boolean;
  uploader?: { name: string };
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  approverId: string;
  approver: { name: string };
  approved: boolean;
  comment?: string;
  createdAt: string;
}
```

**Step 4: 创建认证Hook**

创建 `frontend/src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token并获取用户信息
      fetchUserInfo();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      // 从token解析用户信息或调用API获取
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });

    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat(frontend): create base structure and auth hook"
```

---

### Task 13: 安装shadcn/ui组件

**Files:**
- Install: shadcn/ui components

**Step 1: 安装核心组件**

```bash
cd frontend
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-label @radix-ui/react-input
```

**Step 2: 创建UI组件文件**

创建 `frontend/src/components/ui/button.tsx`:

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
```

创建 `frontend/src/components/ui/input.tsx`:

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

创建 `frontend/src/components/ui/card.tsx`:

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat(frontend): add shadcn/ui base components"
```

---

### Task 14: 创建登录页面

**Files:**
- Create: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: 创建登录页面**

创建 `frontend/src/pages/Login.tsx`:

```typescript
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError('用户名或密码错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>OA审批系统</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">用户名</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: 更新App.tsx**

修改 `frontend/src/App.tsx`:

```typescript
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">OA审批系统</h1>
          <div className="flex items-center gap-4">
            <span>{user.name} ({user.role})</span>
            <button
              onClick={() => useAuth().logout()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center text-gray-500">
          欢迎使用OA审批系统
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 3: 更新main.tsx**

修改 `frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(frontend): implement login page"
```

---

### Task 15: 创建申请列表页面

**Files:**
- Create: `frontend/src/pages/Applications.tsx`
- Create: `frontend/src/components/ApplicationCard.tsx`

**Step 1: 创建申请卡片组件**

创建 `frontend/src/components/ApplicationCard.tsx`:

```typescript
import { Application, ApplicationStatus, Priority } from '../types';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';

interface ApplicationCardProps {
  application: Application;
  onClick?: () => void;
}

const statusMap: Record<ApplicationStatus, { label: string; color: string }> = {
  [ApplicationStatus.PENDING_FACTORY]: { label: '待厂长审核', color: 'bg-yellow-100 text-yellow-800' },
  [ApplicationStatus.PENDING_DIRECTOR]: { label: '待总监审批', color: 'bg-blue-100 text-blue-800' },
  [ApplicationStatus.PENDING_MANAGER]: { label: '待经理审批', color: 'bg-purple-100 text-purple-800' },
  [ApplicationStatus.PENDING_CEO]: { label: '待CEO审批', color: 'bg-orange-100 text-orange-800' },
  [ApplicationStatus.APPROVED]: { label: '已通过', color: 'bg-green-100 text-green-800' },
  [ApplicationStatus.REJECTED]: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

const priorityMap: Record<Priority, { label: string; color: string }> = {
  [Priority.LOW]: { label: '低', color: 'bg-gray-100 text-gray-800' },
  [Priority.MEDIUM]: { label: '中', color: 'bg-blue-100 text-blue-800' },
  [Priority.HIGH]: { label: '高', color: 'bg-red-100 text-red-800' },
};

export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-sm text-gray-500">{application.applicationNo}</span>
            <h3 className="font-semibold text-lg mt-1">{application.title}</h3>
          </div>
          <span className={cn('px-2 py-1 rounded text-xs font-medium', statusMap[application.status].color)}>
            {statusMap[application.status].label}
          </span>
        </div>
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{application.content}</p>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <span>申请人: {application.applicantName}</span>
            {application.applicantDept && (
              <span className="text-gray-500">{application.applicantDept}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded text-xs', priorityMap[application.priority].color)}>
              {priorityMap[application.priority].label}优先级
            </span>
            {application.amount && (
              <span className="text-gray-600">
                ¥{application.amount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          提交时间: {new Date(application.submittedAt).toLocaleString('zh-CN')}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: 创建申请列表页面**

创建 `frontend/src/pages/Applications.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Application, ApplicationStatus } from '../types';
import { ApplicationCard } from '../components/ApplicationCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchApplications();
  }, [page, status]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const response = await api.get<{
        applications: Application[];
        pagination: { totalPages: number };
      }>(`/applications?${params}`);

      setApplications(response.applications);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchApplications();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">申请列表</h2>
        <Button>新建申请</Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="搜索申请编号、标题或申请人"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | '')}
          className="border rounded px-3 py-2"
        >
          <option value="">全部状态</option>
          {Object.entries(ApplicationStatus).map(([key, value]) => (
            <option key={key} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">加载中...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无申请</div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="px-4 py-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat(frontend): implement applications list page"
```

---

## 阶段五: 数据迁移与测试

### Task 16: 创建数据迁移脚本

**Files:**
- Create: `scripts/migrate-data.ts`

**Step 1: 创建数据迁移脚本**

创建 `scripts/migrate-data.ts`:

```typescript
import { PrismaClient, UserRole, ApplicationStatus, Priority } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 角色映射
const roleMap: Record<string, UserRole> = {
  'user': UserRole.USER,
  'factory_manager': UserRole.FACTORY_MANAGER,
  'director': UserRole.DIRECTOR,
  'manager': UserRole.MANAGER,
  'ceo': UserRole.CEO,
  'admin': UserRole.ADMIN,
  'readonly': UserRole.READONLY,
};

// 状态映射
const statusMap: Record<string, ApplicationStatus> = {
  '待厂长审核': ApplicationStatus.PENDING_FACTORY,
  '待总监审批': ApplicationStatus.PENDING_DIRECTOR,
  '待经理审批': ApplicationStatus.PENDING_MANAGER,
  '待CEO审批': ApplicationStatus.PENDING_CEO,
  '已通过': ApplicationStatus.APPROVED,
  '已拒绝': ApplicationStatus.REJECTED,
};

async function migrateUsers() {
  console.log('Migrating users...');

  const usersData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../backend/data/users.json'), 'utf-8')
  );

  for (const user of usersData) {
    const hashedPassword = user.password.startsWith('$2')
      ? user.password
      : await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name || user.username,
        email: user.email,
        role: roleMap[user.role] || UserRole.USER,
        department: user.department,
        employeeId: user.employeeId,
        password: hashedPassword,
      },
      create: {
        username: user.username,
        password: hashedPassword,
        name: user.name || user.username,
        email: user.email,
        role: roleMap[user.role] || UserRole.USER,
        department: user.department,
        employeeId: user.employeeId,
      },
    });
  }

  console.log(`Migrated ${usersData.length} users`);
}

async function migrateApplications() {
  console.log('Migrating applications...');

  const appsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../backend/data/applications.json'), 'utf-8')
  );

  // 获取用户ID映射
  const users = await prisma.user.findMany();
  const userIdMap = new Map(users.map(u => [u.username, u.id]));

  for (const app of appsData) {
    try {
      await prisma.application.create({
        data: {
          id: app.id,
          applicationNo: app.applicationNo,
          title: app.title,
          content: app.content,
          amount: app.amount ? parseFloat(app.amount) : null,
          priority: (app.priority?.toUpperCase() as Priority) || Priority.MEDIUM,
          status: statusMap[app.status] || ApplicationStatus.PENDING_FACTORY,
          applicantId: userIdMap.get(app.applicantUsername) || users[0].id,
          applicantName: app.applicantName,
          applicantDept: app.applicantDept,
          factoryManagerIds: app.factoryManagers?.map((m: any) => userIdMap.get(m.username)).filter(Boolean) || [],
          managerIds: app.managers?.map((m: any) => userIdMap.get(m.username)).filter(Boolean) || [],
          submittedAt: new Date(app.submittedAt),
          completedAt: app.completedAt ? new Date(app.completedAt) : null,
          createdAt: new Date(app.createdAt || app.submittedAt),
          updatedAt: new Date(app.updatedAt || app.submittedAt),
        },
      });
    } catch (error) {
      console.error(`Failed to migrate application ${app.applicationNo}:`, error);
    }
  }

  console.log(`Migrated ${appsData.length} applications`);
}

async function main() {
  console.log('Starting data migration...');

  await migrateUsers();
  await migrateApplications();

  console.log('Migration completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create data migration script"
```

---

## 阶段六: 部署配置

### Task 17: 创建生产环境配置

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.prod.yml`
- Create: `nginx.conf`

**Step 1: 创建Dockerfile**

创建 `Dockerfile`:

```dockerfile
# 构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 构建后端
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# 生产环境
FROM node:20-alpine
WORKDIR /app

# 安装PostgreSQL客户端（用于等待数据库）
RUN apk add --no-cache postgresql-client

# 复制后端
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/prisma ./prisma

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./public

# 安装生产依赖
RUN npm ci --only=production

# 生成Prisma客户端
RUN npx prisma generate

# 暴露端口
EXPOSE 3000

# 启动脚本
COPY scripts/start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
```

**Step 2: 创建启动脚本**

创建 `scripts/start.sh`:

```bash
#!/bin/sh

# 等待数据库
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Waiting for database..."
  sleep 2
done

# 运行迁移
npx prisma migrate deploy

# 启动应用
node dist/index.js
```

**Step 3: Commit**

```bash
git add .
git commit -m "chore: add production deployment configuration"
```

---

## 总结

本重构计划包含以下主要阶段:

1. **项目初始化** - 创建新的项目结构，配置TypeScript和Docker
2. **数据库设计** - 使用Prisma设计PostgreSQL数据库模型
3. **后端API开发** - 使用Express+TypeScript实现RESTful API
4. **前端开发** - 使用React+TypeScript+shadcn/ui构建现代化UI
5. **数据迁移** - 将现有JSON数据迁移到PostgreSQL
6. **部署配置** - 创建Docker配置用于生产部署

**关键改进:**
- 从JSON文件存储迁移到PostgreSQL关系型数据库
- 从纯HTML/JS迁移到React+TypeScript现代前端
- 使用shadcn/ui+Radix UI提供一致的设计系统
- 完整的类型安全覆盖
- 模块化的代码架构
- Docker容器化部署支持

---

**Plan complete and saved to `docs/plans/2025-02-07-oa-system-refactor.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach do you prefer, 老板?**
