-- 任务管理模块问题修复迁移

-- 1. 添加 projectId 索引
CREATE INDEX IF NOT EXISTS "tasks_projectId_idx" ON "tasks"("projectId");

-- 2. 添加复合索引（我的待办任务查询）
CREATE INDEX IF NOT EXISTS "tasks_assigneeId_status_idx" ON "tasks"("assigneeId", "status");

-- 3. 添加复合索引（看板按截止日期排序）
CREATE INDEX IF NOT EXISTS "tasks_status_dueDate_idx" ON "tasks"("status", "dueDate");

-- 4. 添加复合索引（我的待办按截止日期排序）
CREATE INDEX IF NOT EXISTS "tasks_assigneeId_status_dueDate_idx" ON "tasks"("assigneeId", "status", "dueDate");

-- 5. 添加复合索引（我创建的任务，最近优先）
CREATE INDEX IF NOT EXISTS "tasks_creatorId_createdAt_idx" ON "tasks"("creatorId", "createdAt" DESC);
