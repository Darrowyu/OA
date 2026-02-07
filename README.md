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
├── frontend-new/         # 前端应用
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

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和JWT密钥
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

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:5173
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
# 代码检查
npm run lint

# 类型检查
npm run type-check

# 数据库管理
npm run db:studio    # Prisma Studio GUI
npm run db:migrate   # 执行迁移
npm run db:seed      # 填充种子数据

# 构建生产版本
npm run build

# 启动生产服务
npm start
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
