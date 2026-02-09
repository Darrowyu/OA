# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本代码库的工作指南。

## 项目概述

OA办公自动化系统 - 一个支持多级审批流程的审批工作流系统。

**架构**: 使用 npm workspaces 的 Monorepo 结构
- `frontend/` - React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- `backend/` - Node.js + Express + TypeScript + Prisma ORM + PostgreSQL

**最新优化状态** (2026-02-09):
- ✅ TypeScript 类型检查：0 错误
- ✅ 代码行数优化：减少 2000+ 行
- ✅ 组件拆分：Sidebar 从 1012 行 → 438 行
- ✅ 类型安全：移除所有 `any` 类型

---

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

---

## 项目结构

### 前端 (`frontend/src/`)

```
components/              # React 组件
  ui/                    # shadcn/ui 组件（Button、Input 等）
  common/                # 通用业务组件
    StatusBadge.tsx      # 统一状态Badge
    StatCard.tsx         # 统计卡片
    DataTable.tsx        # 通用数据表格
  Sidebar/               # 拆分后的侧边栏组件
    index.tsx            # 主组件 (438行)
    NavItem.tsx          # 导航项
    NavSection.tsx       # 导航区块
    SubMenu.tsx          # 子菜单
  Header.tsx             # 顶部导航栏
  ProtectedRoute.tsx     # 路由权限守卫

pages/                   # 路由页面
  dashboard/             # 工作台首页
  applications/          # 审批模块
    components/          # 页面级组件
    hooks/               # 页面级hooks
  reports/               # 报表模块（已拆分）
    components/          # 报表组件
  meetings/              # 会议管理（已拆分）
  documents/             # 文档中心（已拆分）
  admin/
    Departments/         # 部门管理（已拆分）

hooks/                   # 自定义 Hooks（已简化）
  useApi.ts              # API请求状态管理 (21行)
  usePagination.ts       # 分页逻辑 (103行)
  useDebounce.ts         # 防抖 (51行)

config/                  # 配置文件
  status.ts              # 状态标签和样式配置

services/                # API 客户端
  api.ts                 # 带拦截器的 Axios 实例
  departments.ts         # 部门服务（已合并）

types/                   # TypeScript 类型定义
  api.ts                 # 共享 API 响应类型
  index.ts               # 共享类型
```

### 后端 (`backend/src/`)

```
controllers/             # Express 路由处理器
  auth.ts
  applications.ts        # 已简化权限过滤
  approvals.ts           # 已提取通用审批逻辑
  users.ts

routes/                  # 路由定义
  auth.ts
  applications.ts
  users.ts
  uploads.ts             # 已修复单例问题

middleware/              # Express 中间件
  auth.ts                # JWT 验证
  errorHandler.ts
  upload.ts              # 已修复类型安全

services/                # 业务逻辑层
  applicationService.ts
  userService.ts
  archive.ts             # 已添加事务保护
  workflowService.ts     # 已添加事务保护

utils/                   # 工具函数（新增）
  response.ts            # 统一响应格式

lib/                     # 共享库
  prisma.ts              # Prisma 客户端单例
  email.ts               # 邮件服务（已添加重试限制）

prisma/                  # 数据库模型和迁移
  schema.prisma          # 已添加软删除、连接池配置
  seed.ts
```

---

## 架构模式

### 认证流程

1. 基于 JWT 的认证，token 存储在 `localStorage`
2. `AuthContext` 提供用户状态和登录/注销方法
3. `ProtectedRoute` 组件保护需要认证的路由
4. 后端 `auth` 中间件验证受保护端点的 JWT

### API 模式

**前端服务层:**
```typescript
// 统一 API 响应类型
import type { ApiResponse } from '@/types/api';

// 服务定义
export const userApi = {
  getUsers: (): Promise<ApiResponse<User[]>> =>
    apiClient.get('/users'),
};
```

**后端响应格式:**
```typescript
// 使用统一响应工具
import { ok, fail } from '@/utils/response';

// 成功响应
res.json(ok(data));

// 失败响应
res.status(400).json(fail('VALIDATION_ERROR', '验证失败'));
```

### 数据库 (Prisma)

**核心模型:** `User`、`Application`、`Approval`、`Department`

**最佳实践:**
- 始终使用 `lib/prisma.ts` 中的 Prisma 客户端（单例模式）
- 使用 `deletedAt` 字段实现软删除
- 关键业务操作使用 `prisma.$transaction` 保护
- 批量操作使用 `createMany` 避免 N+1 查询

**示例:**
```typescript
// 批量创建（避免N+1）
await prisma.$transaction(async (tx) => {
  const managers = await tx.user.findMany({
    where: { employeeId: { in: managerIds } }
  });
  await tx.factoryApproval.createMany({
    data: managers.map(m => ({ managerId: m.id, ... }))
  });
});
```

### 前端状态管理

- **认证**: `AuthContext` 管理全局认证状态
- **API 请求**: `useApi` Hook 统一管理请求状态
- **分页**: `usePagination` Hook 提供分页逻辑
- **本地状态**: `useState` 管理组件级状态

**useApi Hook 使用:**
```typescript
const { data, loading, error, refetch } = useApi(() =>
  userApi.getUsers()
);
```

---

## 代码规范

### 组件规范

- **函数组件**: 使用常规函数声明，不使用 `React.FC`
- **Props 类型**: 显式定义 Props 接口
- **组件大小**: 单文件不超过 200 行，超过则拆分
- **性能优化**: 适当使用 `React.memo` 和 `useMemo`

```typescript
// ✅ 推荐
interface UserCardProps {
  user: User;
  onClick?: (user: User) => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  return <div onClick={() => onClick?.(user)}>...</div>;
}

// ❌ 避免
const UserCard: React.FC<UserCardProps> = ({ user }) => { ... }
```

### 类型安全

- **禁止 `any`**: 所有变量和函数参数必须有明确类型
- **API 响应**: 使用统一的 `ApiResponse<T>` 类型
- **状态配置**: 提取到 `config/` 目录共享

### 错误处理

- **后端**: 使用 `try-catch` 包裹异步操作，统一错误格式
- **前端**: 使用 `useApi` 自动处理错误状态
- **日志**: 统一使用 `logger`，禁止使用 `console.log`

### 代码简化原则

- **配置驱动**: 使用配置对象替代复杂 switch 语句
- **并行执行**: 使用 `Promise.all` 并行独立操作
- **批量操作**: 使用 `createMany` 替代循环创建
- **提取复用**: 重复代码提取到通用组件或工具函数

---

## 默认登录账号

| 角色 | 邮箱 | 密码 |
|------|------|----------|
| 管理员 | admin@example.com | admin123 |
| 普通用户 | user@example.com | user123 |

---

## 环境配置

在 `backend/` 和 `frontend/` 目录下复制 `.env.example` 文件:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**后端必需环境变量**:
- `DATABASE_URL` - 包含连接池参数: `?connection_limit=20&pool_timeout=30`
- `JWT_SECRET`
- `PORT`

---

## 技术栈

- **UI 组件**: shadcn/ui (Radix UI + Tailwind)
- **动画**: framer-motion
- **图标**: lucide-react
- **图表**: recharts
- **Toast 通知**: sonner
- **表单验证**: Zod (后端)
- **文件上传**: multer (后端)
- **邮件服务**: nodemailer
- **工作流**: @xyflow/react
- **拖拽**: @hello-pangea/dnd

---

## 优化记录

### 2026-02-09 全面重构

**类型安全:**
- 修复 90+ TypeScript 类型错误
- 移除所有 `any` 类型使用
- 统一 API 响应类型

**代码简化:**
- 减少 1198 行重复和复杂代码
- Sidebar 从 1012 行 → 438 行
- useApi 从 214 行 → 21 行

**性能优化:**
- 修复 3 处 N+1 查询问题
- 添加 Prisma 连接池配置
- 并行验证优化

**架构改进:**
- 拆分超大组件
- 提取通用 Hooks 和组件
- 统一响应格式

---

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
| 简化/重构代码 | `code-simplifier` |

### 红旗警告（这些想法意味着你在合理化）

| 错误想法 | 现实 |
|---------|------|
| "这只是一个简单问题" | 问题就是任务，检查 skill。 |
| "我需要先了解更多上下文" | Skill 检查**优先于**澄清问题。 |
| "让我先探索代码库" | Skills 告诉你**如何**探索。先检查。 |
| "我记得这个 skill" | Skills 会演进，读取当前版本。 |
| "这不需要正式 skill" | 如果 skill 存在，就用它。 |
| "我会先做这个简单的事情" | **做任何事之前**先检查 skill。 |
