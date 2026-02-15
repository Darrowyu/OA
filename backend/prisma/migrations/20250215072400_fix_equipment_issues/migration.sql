-- 设备管理模块问题修复迁移

-- 1. 添加Equipment.healthMetrics字段
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "healthMetrics" JSONB;

-- 2. 添加Equipment.nextMaintenanceAt索引
CREATE INDEX IF NOT EXISTS "Equipment_nextMaintenanceAt_idx" ON "Equipment"("nextMaintenanceAt");

-- 3. 添加Part.version字段（乐观锁）
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- 4. 添加Part复合索引（库存预警查询）
CREATE INDEX IF NOT EXISTS "Part_status_stock_idx" ON "Part"("status", "stock");

-- 5. 添加MaintenancePlan复合索引（即将到期计划查询）
CREATE INDEX IF NOT EXISTS "MaintenancePlan_status_nextDate_idx" ON "MaintenancePlan"("status", "nextDate");

-- 6. 添加PartStock复合索引（库存流水查询）
CREATE INDEX IF NOT EXISTS "PartStock_partId_date_idx" ON "PartStock"("partId", "date" DESC);

-- 7. 添加PartLifecycle复合索引（即将到期配件查询）
CREATE INDEX IF NOT EXISTS "PartLifecycle_status_expectedEndDate_idx" ON "PartLifecycle"("status", "expectedEndDate");
