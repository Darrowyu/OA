# 雪球团队指南 - OA项目

> **雪球代号**: 由Claude 4.6高级推理引擎驱动
> **完整规范**: 见 `~/.claude/CLAUDE.md`

---

## 核心规范速查

### 沟通准则
- **称谓**: 始终称呼用户为"Darrow哥"
- **标准句式**: "Darrow哥，针对您的需求，我们设计了两种方案：方案A的特点是[...], 方案B的特点是[...]。请问您倾向于选择哪个方案？"
- **禁止**: 不说"你应该"或"我建议..."

### 强制Skill规则
- **1%原则**: 任何skill有1%可能性适用，**必须立即调用**
- **执行顺序**: 用户输入 → Hook推荐 → **调用Skill工具** → 回复用户
- **绝对禁止**: 先回复后调用、跳过skill、以"简单"为由不调用

---

## OA项目工作流

### 计划模式触发条件
- 任务涉及3个以上步骤
- 需要架构决策
- 验证步骤复杂

### 验证优先铁律
- [ ] 测试通过
- [ ] 日志无错误
- [ ] 行为对比验证
- [ ] 自问"资深工程师会认可吗？"

---

## Git Worktree 团队开发

### 快速开始

```bash
# 1. 创建功能分支worktree
git worktree add .worktrees/feature/xxx -b feature/xxx

# 2. 进入开发环境
cd .worktrees/feature/xxx
npm install && npm run dev

# 3. 开发完成后推送
git push origin feature/xxx
gh pr create --title "feat: xxx"

# 4. PR合并后清理
git worktree remove .worktrees/feature/xxx
git branch -D feature/xxx
```

### 分支命名规范

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feature/` | `feature/user-permissions` |
| Bug修复 | `bugfix/` / `hotfix/` | `hotfix/login-crash` |
| 重构 | `refactor/` | `refactor/api-types` |
| 文档 | `docs/` | `docs/api-guide` |

### 常用命令

```bash
git worktree list                              # 查看所有worktree
git worktree prune                             # 清理失效记录
rm -rf .worktrees/feature/xxx && git worktree prune  # 强制删除
```

### 详细文档

完整工作流文档：`docs/plans/2026-03-03-team-worktree-workflow.md`

---

## 项目结构速查

```
OA-runningVersion-v1.0.1/
├── .worktrees/           # 功能分支worktree目录
├── backend/              # 后端API (Node.js + Express + Prisma)
│   ├── prisma/schema.prisma
│   └── src/
├── frontend/             # 前端 (React + Vite)
│   └── src/
├── docs/plans/           # 设计文档
├── tasks/                # 任务清单
│   ├── todo.md
│   └── lessons.md
└── package.json          # 根目录scripts
```

---

## 开发常用命令

```bash
# 安装依赖
npm run install:all       # 安装所有工作区依赖

# 开发启动
npm run dev               # 同时启动前后端

# 代码检查
npm run build             # 前端构建检查
cd backend && npx prisma generate  # 生成Prisma Client
```

---

## 技术栈规范速查

| 技术 | ✅ 应该 | ❌ 禁止 |
|------|--------|--------|
| React | 函数组件+Hooks，Props定义类型 | index作key，组件超200行 |
| TypeScript | strict模式，所有参数/返回值有类型 | 使用any，@ts-ignore |
| 数据库 | 主键id，created_at/updated_at，外键索引 | 字符串拼SQL，SELECT * |

---

## 全局规则索引

| 规则内容 | 位置 |
|----------|------|
| 团队角色与沟通规范 | `~/.claude/CLAUDE.md` |
| Skills完整列表与触发条件 | `~/.claude/rules/skill-triggers.md` |
| 技术栈详细规范 | `~/.claude/rules/tech-spec.md` |
| 工作流程模板 | `~/.claude/rules/workflow-templates.md` |

---

*版本: v2.1 | 精简日期: 2026-03-03*
