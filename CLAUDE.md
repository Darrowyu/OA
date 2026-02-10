# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本代码库的工作指南。

## 项目概览

**技术栈**: Monorepo (npm workspaces)
- **前端**: React + TypeScript + Vite + Tailwind + shadcn/ui
- **后端**: Node.js + Express + TypeScript + Prisma + PostgreSQL

**关键账号**:
- 管理员: `admin@example.com` / `admin123`
- 普通用户: `user@example.com` / `user123`

---

## 快速命令

```bash
# 开发
npm start              # 同时启动前后端
npm run dev:pretty     # 带颜色标签启动
npm run type-check     # TypeScript 检查

# 数据库
npm run db:up          # 启动 PostgreSQL
npm run db:migrate     # Prisma 迁移
npm run db:studio      # 图形界面 (localhost:5555)
```

---

## 核心开发规范 (必须遵守)

### 1. Express 路由 (后端)

**✅ 必须遵守**:
```typescript
// 1. 路径不要有重复前缀
// index.ts: app.use('/api/equipment', routes)
// routes.ts: router.get('/', ...) 不是 '/equipment'

// 2. 具体路由必须在通配符之前
router.get('/contacts', handler);  // ✅ 先定义具体路由
router.get('/:id', handler);       // ✅ 通配符最后定义

// 3. 分页统一返回格式
return {
  items: data,      // 不是 data: data
  pagination: {
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
  },
};
```

**❌ 常见错误**:
- 路径重复: `/api/equipment` + `/equipment` = 404
- 顺序错误: `/:id` 在 `/contacts` 前 = 404
- 格式混乱: `{data: []}` vs `{items: []}`

### 2. Prisma 数据库 (后端)

**✅ 必须遵守**:
```typescript
// 1. JSON 字段不能直接用 contains 查询
// ❌ 错误
where.attendees = { contains: userId }

// ✅ 正确: 先查询，内存中过滤
const data = await prisma.meeting.findMany({ where });
const filtered = data.filter(m =>
  m.attendees?.some(a => a.userId === userId)
);

// 2. 单例模式导入 Prisma
import prisma from '@/lib/prisma';  // ✅
// const prisma = new PrismaClient(); // ❌
```

### 3. React 组件 (前端)

**✅ 必须遵守**:
```typescript
// 1. 数组必须做空值检查
const filtered = (items || []).filter(...);     // ✅
{meetings?.map(...)}                            // ✅

// 2. Recharts 图表使用 ResizeObserver
const [size, setSize] = useState({w:0, h:0});
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  const ro = new ResizeObserver(entries => {
    const {width, height} = entries[0].contentRect;
    if (width > 0 && height > 0) setSize({w:width, h:height});
  });
  ref.current && ro.observe(ref.current);
  return () => ro.disconnect();
}, []);

// 3. 函数组件声明
interface Props { user: User }
export function Card({ user }: Props) { }  // ✅
// const Card: React.FC<Props> = ...       // ❌
```

### 4. API 响应格式

**统一格式** (前后端一致):
```typescript
// 成功
{ success: true, data: T, message?: string }

// 分页
{
  success: true,
  data: {
    items: T[],
    pagination: { total, page, pageSize, totalPages }
  }
}

// 失败
{ success: false, error: { code, message } }
```

**前端 Axios 注意**:
```typescript
// 拦截器已返回 response.data，不要再访问 .data
const res = await api.get('/users');
if (res.success) { }     // ✅ 直接使用 res
// if (res.data.success) // ❌ 错误
```

---

## 常见问题速查

| 问题 | 原因 | 解决 |
|------|------|------|
| API 404 | 路由路径重复或顺序错误 | 检查路由前缀，通配符放最后 |
| `Cannot read properties of undefined` | 数组未做空值检查 | `(arr \|\| []).filter()` |
| 图表尺寸错误 | framer-motion 初始尺寸为0 | 使用 ResizeObserver |
| Prisma JSON 查询 500 | JSON 字段不能用 contains | 内存中过滤 |
| 分页数据不显示 | 返回格式不统一 | 统一 `{items, pagination}` |
| useEffect 无限循环 | 函数作为依赖 | 依赖原始值而非函数 |

---

## 目录结构

```
frontend/src/
  components/
    ui/           # shadcn 组件
    common/       # 业务组件
  pages/          # 路由页面
  hooks/          # 自定义 hooks
  services/       # API 客户端
  types/          # 类型定义

backend/src/
  controllers/    # 路由处理器
  routes/         # 路由定义
  services/       # 业务逻辑
  utils/          # 工具函数
  lib/prisma.ts   # Prisma 单例
```

---

## 强制 Skill 规则 (1%)

**核心原则**: 如果任何一个 skill 有 1% 可能适用，**必须立即调用**。

| 场景 | 必须调用的 Skill |
|------|-----------------|
| Bug/错误/问题 | `systematic-debugging` |
| 创建功能/组件 | `brainstorming` → `component-development` |
| 多步骤任务 | `writing-plans` |
| API/数据库设计 | `api-design-principles` / `postgresql-table-design` |
| 声称"完成" | `verification-before-completion` |
| 代码审查 | `code-review` |

**红旗**: "这很简单" / "我先试试" / "让我探索一下" → 都意味着你在合理化，必须先调 Skill。

---

## 修复记录

**2026-02-10**:
- 修复 Express 路由路径重复 (设备、文档)
- 修复 Express 路由顺序 (通讯录 `/contacts`)
- 统一分页格式 `{items, pagination}`
- 修复 Prisma JSON 查询 (会议 attendees)
- 修复 Recharts 尺寸计算 (ResizeObserver)
- 添加数组空值检查

**2026-02-09**:
- 全面重构，减少 2000+ 行代码
- 修复 90+ TypeScript 错误
- 拆分超大组件
