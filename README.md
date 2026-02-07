# OA办公自动化系统 (重构版)

基于 React + TypeScript + Node.js + Prisma + PostgreSQL 的现代OA审批系统。

## 技术栈

### 后端
- **Node.js** + **Express** - Web服务框架
- **TypeScript** - 类型安全
- **Prisma ORM** - 数据库访问
- **PostgreSQL** - 关系型数据库
- **JWT** - 身份认证
- **Zod** - 数据校验

### 前端
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI组件库

## 项目结构

```
OA-runningVersion-v1.0.1/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── config/       # 配置文件
│   │   ├── controllers/  # 控制器
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由定义
│   │   ├── lib/          # 工具库
│   │   └── utils/        # 工具函数
│   ├── prisma/           # Prisma schema和迁移
│   └── scripts/          # 脚本文件
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── pages/        # 页面
│   │   ├── hooks/        # 自定义Hooks
│   │   ├── lib/          # 工具库
│   │   └── types/        # 类型定义
│   └── public/           # 静态资源
├── docker-compose.yml    # Docker配置
└── package.json          # 根目录工作区配置
```

## 端口配置

| 服务 | 端口 | 配置文件 | 说明 |
|------|------|----------|------|
| 前端开发服务器 | 5173 | `frontend/.env` | Vite开发服务器 |
| 后端API服务 | 3001 | `backend/.env` | Express服务器 |
| PostgreSQL | 5432 | `docker-compose.yml` | 数据库服务 |

### 配置文件

- **后端配置**: `backend/.env` (复制 `backend/.env.example`)
- **前端配置**: `frontend/.env` (复制 `frontend/.env.example`)

## 快速开始

### 1. 环境要求

- Node.js >= 18.0.0
- PostgreSQL 16 (或使用Docker)
- npm 或 yarn

### 2. 安装依赖

```bash
npm run install:all
```

### 3. 配置环境变量

**后端配置:**
```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库和JWT密钥
```

**前端配置:**
```bash
cd frontend
cp .env.example .env
# 编辑 .env 文件（通常不需要修改，使用默认配置即可）
```

### 4. 启动数据库 (使用Docker)

```bash
npm run db:up
```

### 5. 数据库迁移

```bash
npm run db:migrate
npm run db:seed  # 可选：填充测试数据
```

### 6. 启动开发服务器

**一键启动（推荐）:**
```bash
# 同时启动前后端
npm start
# 或
npm run dev
```

服务启动后:
- 前端: http://localhost:5173
- 后端API: http://localhost:3001

**分别启动:**
```bash
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
```

**完整初始化（包含数据库）:**
```bash
npm run setup  # 安装依赖 + 启动数据库 + 迁移 + 填充数据
```

## 默认账号

系统初始化后，可以使用以下默认账号登录：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 普通员工 | user@example.com | user123 |

## 功能特性

- 用户认证 (JWT)
- 申请提交与管理
- 多级审批流程
- 审批历史记录
- 邮件通知
- 文件上传
- 响应式设计

## 开发命令

```bash
# 启动开发服务器
npm start              # 一键启动前后端
npm run dev            # 同上
npm run dev:backend    # 仅启动后端
npm run dev:frontend   # 仅启动前端

# 项目初始化
npm run setup          # 完整初始化（安装依赖 + 数据库 + 迁移 + 种子数据）
npm run install:all    # 安装所有依赖

# 代码质量
npm run lint           # 代码检查
npm run type-check     # 类型检查

# 数据库管理
npm run db:up          # 启动PostgreSQL容器
npm run db:down        # 停止PostgreSQL容器
npm run db:migrate     # 执行数据库迁移
npm run db:seed        # 填充种子数据
npm run db:studio      # Prisma Studio GUI
npm run db:reset       # 重置数据库

# 构建与部署
npm run build          # 构建前后端
npm run build:backend  # 仅构建后端
npm run build:frontend # 仅构建前端
npm run serve          # 启动生产服务（仅后端）
```

## 数据库架构

主要数据表：

- **users** - 用户表
- **applications** - 申请表
- **approvals** - 审批记录表
- **departments** - 部门表
- **roles** - 角色表

## API文档

后端API遵循RESTful规范，基础路径：`/api`

主要端点：

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/applications` - 获取申请列表
- `POST /api/applications` - 创建申请
- `GET /api/applications/:id` - 获取申请详情
- `POST /api/applications/:id/approve` - 审批申请

## 许可证

MIT License
