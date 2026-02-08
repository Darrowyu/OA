# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本代码库的工作指南。

## 项目概述

OA办公自动化系统 - 一个支持多级审批流程的审批工作流系统。

**架构**: 使用 npm workspaces 的 Monorepo 结构
- `frontend/` - React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- `backend/` - Node.js + Express + TypeScript + Prisma ORM + PostgreSQL

## 常用命令

### 开发启动

```bash
# 同时启动前后端（最常用）
npm start
# 或
npm run dev

# 带颜色标签启动
npm run dev:pretty

# 单独启动
npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:5173
```

### 环境初始化与数据库

```bash
# 完整初始化（安装依赖 + 启动数据库 + 迁移 + 填充数据）
npm run setup

# 数据库操作
npm run db:up          # 通过 Docker 启动 PostgreSQL
npm run db:migrate     # 执行 Prisma 迁移
npm run db:seed        # 填充测试数据
npm run db:studio      # Prisma Studio 图形界面 (http://localhost:5555)
npm run db:reset       # 重置数据库
```

### 代码质量

```bash
npm run lint           # 对前后端执行 ESLint 检查
npm run type-check     # TypeScript 类型检查
```

### 构建

```bash
npm run build          # 构建前后端
npm run build:frontend # 仅构建前端（输出到 frontend/dist）
npm run build:backend  # 仅构建后端（输出到 backend/dist）
```

## 项目结构

### 前端 (`frontend/src/`)

```
components/     # React 组件（ui/ 目录存放 shadcn 组件）
  ui/           # shadcn/ui 组件（Button、Input 等）
  Sidebar.tsx   # 主导航侧边栏
  Header.tsx    # 顶部导航栏（含用户菜单）
  ProtectedRoute.tsx  # 路由权限守卫

pages/          # 路由页面
  dashboard/    # 工作台首页
  applications/ # 审批模块（列表、新建、待审批、已审批、详情）
  Users.tsx     # 用户管理
  Settings.tsx  # 系统设置

contexts/       # React Context 提供者
  AuthContext.tsx     # 认证状态
  SidebarContext.tsx  # 侧边栏收起/展开状态

services/       # API 客户端
  api.ts        # 带拦截器的 Axios 实例
  applications.ts
  users.ts
  auth.ts

types/          # TypeScript 类型定义
  index.ts      # 共享类型（User、Application 等）
```

### 后端 (`backend/src/`)

```
controllers/    # Express 路由处理器
  authController.ts
  applicationController.ts
  userController.ts

routes/         # 路由定义
  auth.ts
  applications.ts
  users.ts

middleware/     # Express 中间件
  auth.ts       # JWT 验证
  errorHandler.ts

services/       # 业务逻辑层
  applicationService.ts
  userService.ts

lib/            # 共享库
  prisma.ts     # Prisma 客户端单例
  email.ts      # 邮件服务

prisma/         # 数据库模型和迁移
  schema.prisma
  seed.ts
```

## 架构模式

### 认证流程

1. 基于 JWT 的认证，token 存储在 `localStorage`
2. `AuthContext` 提供用户状态和登录/注销方法
3. `ProtectedRoute` 组件保护需要认证的路由
4. 后端 `auth` 中间件验证受保护端点的 JWT

### API 模式

```typescript
// 前端服务层模式
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### 数据库 (Prisma)

核心模型: `User`、`Application`、`Approval`、`Department`
- 始终使用 `lib/prisma.ts` 中的 Prisma 客户端（单例模式）
- 迁移命令: `npm run db:migrate`（执行 `prisma migrate dev`）

### 前端状态管理

- **认证**: `AuthContext` 管理全局认证状态
- **侧边栏**: `SidebarContext` 管理收起/展开状态
- **本地状态**: `useState` 管理组件级状态
- **API**: 直接调用服务层（不使用 Redux 等全局状态管理）

## 默认登录账号

| 角色 | 邮箱 | 密码 |
|------|------|----------|
| 管理员 | admin@example.com | admin123 |
| 普通用户 | user@example.com | user123 |

## 环境配置

在 `backend/` 和 `frontend/` 目录下复制 `.env.example` 文件:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**后端必需环境变量**: `DATABASE_URL`、`JWT_SECRET`、`PORT`

## 技术细节

- **UI 组件**: shadcn/ui (Radix UI + Tailwind)
- **动画**: framer-motion
- **图标**: lucide-react
- **图表**: recharts
- **Toast 通知**: sonner
- **表单验证**: Zod (后端)
- **文件上传**: multer (后端)
- **邮件服务**: nodemailer

## 常见错误提醒

### 语法规范

- **注释语法**: TypeScript/JavaScript 用 `//` 或 `/* */`，**绝不能用 `#`**（这是 Python 风格）

## 强制性 Skill 规则（1% 规则）

**核心原则**: 如果任何一个 skill 有哪怕 1% 的可能性适用于当前任务，**必须立即调用**。

> "If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill."

**这是强制性的，不是可选的，不是可以协商的。**

### 执行协议

1. **收到用户消息后，立即检查**是否匹配任何 skill 的触发条件
2. **若匹配，必须先调用 Skill**，不得跳过直接执行
3. 即使任务"看起来简单"，也**必须调用**
4. **违反此规则 = 任务失败**

### 常见触发条件

| 场景 | 必须调用的 Skill |
|------|-----------------|
| 创建/添加/实现功能 | `brainstorming` |
| 多步骤复杂任务 | `writing-plans` |
| UI/界面相关开发 | `ui-ux-pro-max` 或 `frontend-design` |
| 创建 React 组件 | `component-development` |
| 设计/创建 API 接口 | `api-design-principles` |
| 实现登录/认证/权限 | `auth-implementation-patterns` |
| 设计数据库表/Schema | `postgresql-table-design` |
| 数据库迁移操作 | `db-migrate` |
| 报告 Bug/错误/问题 | `systematic-debugging` |
| 审查代码/PR review | `code-review` |
| 测试 Web 应用功能 | `webapp-testing` |
| 准备声称"完成"/"已修复" | `verification-before-completion` |
| 准备提交 PR/合并代码 | `requesting-code-review` |

### 红旗警告（这些想法意味着你在合理化）

| 错误想法 | 现实 |
|---------|------|
| "这只是一个简单问题" | 问题就是任务，检查 skill。 |
| "我需要先了解更多上下文" | Skill 检查**优先于**澄清问题。 |
| "让我先探索代码库" | Skills 告诉你**如何**探索。先检查。 |
| "我记得这个 skill" | Skills 会演进，读取当前版本。 |
| "这不需要正式 skill" | 如果 skill 存在，就用它。 |
| "我会先做这个简单的事情" | **做任何事之前**先检查 skill。 |
