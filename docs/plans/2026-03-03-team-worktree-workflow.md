# OA项目 多人团队开发 + Worktree 工作流

> **目标**: 建立标准化的团队开发流程，使用Git worktree实现多分支并行开发

---

## 一、初始化设置（一次性）

### Task 1: 配置 .gitignore

**文件:** `.gitignore`

**步骤:** 添加 worktrees 目录到忽略列表

```bash
# Worktrees - 本地开发隔离目录
.worktrees/
```

**验证:**
```bash
git check-ignore -q .worktrees && echo "已忽略" || echo "未忽略"
```

---

### Task 2: 创建 worktrees 目录结构

**执行:**
```bash
mkdir -p .worktrees
```

**验证:**
```bash
ls -la | grep worktrees
# 应显示: drwxr-xr-x .worktrees
```

---

### Task 3: 提交配置变更

```bash
git add .gitignore
git commit -m "chore: 添加 .worktrees 到 gitignore，支持多分支并行开发"
```

---

## 二、团队成员日常开发流程

### 场景: 开发新功能 "用户权限管理"

#### Step 1: 从主分支创建功能分支

```bash
# 确保在主分支且代码最新
git checkout master
git pull origin master

# 创建并切换到新分支
git checkout -b feature/user-permissions
```

#### Step 2: 创建 Worktree（核心）

```bash
# 基于当前分支创建worktree
git worktree add .worktrees/feature/user-permissions -b feature/user-permissions

# 进入worktree目录
cd .worktrees/feature/user-permissions
```

**验证:**
```bash
git worktree list
# 应显示:
# D:/Code/JS/Project/WIP/OA-runningVersion-v1.0.1                    [master]
# D:/Code/JS/Project/WIP/OA-runningVersion-v1.0.1/.worktrees/feature/user-permissions  [feature/user-permissions]
```

#### Step 3: 安装依赖

```bash
# 根目录依赖
npm install

# 前端依赖
cd frontend && npm install && cd ..

# 后端依赖
cd backend && npm install && cd ..
```

#### Step 4: 启动开发环境

```bash
# 方式1: 同时启动前后端（需要两个终端）
cd backend && npm run dev    # 终端1
cd frontend && npm run dev   # 终端2

# 方式2: 使用项目根目录的 concurrently（如果配置了）
npm run dev
```

---

## 三、多分支并行开发示例

### 场景: 同时处理3个任务

| 任务 | 优先级 | 分支名 | Worktree路径 |
|------|--------|--------|--------------|
| 紧急Bug修复 | P0 | `hotfix/login-crash` | `.worktrees/hotfix/login-crash` |
| 新功能开发 | P1 | `feature/dashboard-v2` | `.worktrees/feature/dashboard-v2` |
| 代码重构 | P2 | `refactor/api-types` | `.worktrees/refactor/api-types` |

### 操作流程

```bash
# ==== 创建3个worktree ====

# 1. 紧急Bug修复
git checkout master
git pull origin master
git worktree add .worktrees/hotfix/login-crash -b hotfix/login-crash

# 2. 新功能开发
git worktree add .worktrees/feature/dashboard-v2 -b feature/dashboard-v2

# 3. 代码重构
git worktree add .worktrees/refactor/api-types -b refactor/api-types

# ==== 查看所有worktree ====
git worktree list

# ==== 在任意worktree间切换 ====
cd .worktrees/hotfix/login-crash    # 处理紧急Bug
cd .worktrees/feature/dashboard-v2  # 开发新功能
cd .worktrees/refactor/api-types    # 进行重构
```

---

## 四、分支命名规范

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feature/` | `feature/user-permissions` |
| Bug修复 | `bugfix/` 或 `hotfix/` | `hotfix/login-crash` |
| 重构 | `refactor/` | `refactor/api-types` |
| 文档 | `docs/` | `docs/api-guide` |
| 测试 | `test/` | `test/e2e-coverage` |

---

## 五、代码提交与审查流程

### 在 Worktree 中提交代码

```bash
# 1. 进入worktree
cd .worktrees/feature/user-permissions

# 2. 查看变更
git status
git diff

# 3. 暂存并提交
git add .
git commit -m "feat(permissions): 添加用户权限管理模块

- 实现RBAC权限模型
- 添加权限中间件
- 集成前端权限控制"

# 4. 推送到远程
git push origin feature/user-permissions
```

### 创建 Pull Request

```bash
# 使用 GitHub CLI 创建 PR
gh pr create --title "feat: 用户权限管理模块" \
             --body "## 变更内容
- 实现RBAC权限模型
- 添加权限中间件
- 集成前端权限控制

## 测试
- [x] 单元测试通过
- [x] 集成测试通过
- [x] 手动验证通过" \
             --base master
```

---

## 六、Worktree 清理（功能完成后）

### 场景: 功能已合并到master，清理worktree

```bash
# 1. 查看所有worktree
git worktree list

# 2. 删除worktree（保留分支）
git worktree remove .worktrees/feature/user-permissions

# 3. 如需同时删除分支
git worktree remove .worktrees/feature/user-permissions
git branch -D feature/user-permissions

# 4. 清理远程已合并分支
git push origin --delete feature/user-permissions
```

---

## 七、团队协作 checklist

### 每日开始工作前

- [ ] `git worktree list` 查看当前有哪些worktree
- [ ] 确定今天要处理的任务对应的worktree
- [ ] 进入worktree后先 `git pull` 同步最新代码

### 开发过程中

- [ ] 每个worktree独立运行开发服务器（注意端口不冲突）
- [ ] 定期提交代码，保持commit粒度小
- [ ] 提交前在worktree内运行测试

### 功能完成后

- [ ] 在worktree内确保所有测试通过
- [ ] 推送分支到远程
- [ ] 创建Pull Request
- [ ] PR合并后清理worktree

---

## 八、常见问题

### Q1: Worktree之间的依赖会冲突吗？

不会。每个worktree有独立的 `node_modules`，互不影响。

### Q2: 如何查看当前在哪个worktree？

```bash
git worktree list | grep "$(pwd)"
# 或在命令行提示符中显示当前分支
```

### Q3: 可以在不同worktree同时运行开发服务器吗？

可以，但需要确保端口不冲突：
- Worktree A: 前端3000，后端3001
- Worktree B: 前端3002，后端3003

通过环境变量或配置文件修改端口。

### Q4: 误删了worktree目录怎么办？

```bash
# 先清理失效的worktree记录
git worktree prune

# 然后重新创建
git worktree add .worktrees/feature/name -b feature/name
```

---

## 九、快捷命令（添加到 .bashrc 或 .zshrc）

```bash
# 快速创建worktree并进入
gwt() {
    local branch=$1
    local path=".worktrees/$branch"
    git worktree add "$path" -b "$branch"
    cd "$path"
}

# 快速列出worktree
gwtl() {
    git worktree list
}

# 快速删除worktree
gwtrm() {
    local path=$1
    git worktree remove "$path"
}
```

使用:
```bash
gwt feature/new-feature    # 创建并进入
gwtl                       # 列表
gwtrm .worktrees/feature/old  # 删除
```

---

## 附录: 项目端口配置参考

| 服务 | 默认端口 | 配置位置 |
|------|----------|----------|
| 前端开发服务器 | 5173 | `frontend/vite.config.ts` |
| 后端API | 3000 | `backend/.env` |
| 数据库 | 5432 | `docker-compose.yml` |

多worktree同时开发时，通过 `.env.local` 覆盖端口配置。
