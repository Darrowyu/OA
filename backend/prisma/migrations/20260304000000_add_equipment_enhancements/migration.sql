-- 设备管理模块增强迁移
-- 创建时间: 2026-03-04

-- 1. 创建厂区表 (Factory)
CREATE TABLE "factories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "manager" TEXT,
    "contact_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);

-- 厂区表唯一约束
CREATE UNIQUE INDEX "factories_name_key" ON "factories"("name");

-- 2. 创建设备健康度历史表 (EquipmentHealthHistory)
CREATE TABLE "equipment_health_history" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "health_level" TEXT NOT NULL,
    "age_score" DOUBLE PRECISION,
    "repair_frequency_score" DOUBLE PRECISION,
    "fault_severity_score" DOUBLE PRECISION,
    "maintenance_score" DOUBLE PRECISION,
    "assessment_date" TIMESTAMP(3) NOT NULL,
    "assessor" TEXT NOT NULL,
    "failure_probability" DOUBLE PRECISION,
    "next_maintenance_date" TIMESTAMP(3),
    "recommendations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_health_history_pkey" PRIMARY KEY ("id")
);

-- 健康度历史表索引
CREATE INDEX "equipment_health_history_equipment_id_idx" ON "equipment_health_history"("equipment_id");
CREATE INDEX "equipment_health_history_assessment_date_idx" ON "equipment_health_history"("assessment_date");

-- 3. 创建配件分类表 (SparePartCategory) - 树形结构
CREATE TABLE "spare_part_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_part_categories_pkey" PRIMARY KEY ("id")
);

-- 配件分类表索引
CREATE INDEX "spare_part_categories_parent_id_idx" ON "spare_part_categories"("parent_id");

-- 4. 创建库存变动日志表 (PartInventoryLog)
CREATE TABLE "part_inventory_logs" (
    "id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "before_quantity" INTEGER NOT NULL,
    "after_quantity" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "operator" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_inventory_logs_pkey" PRIMARY KEY ("id")
);

-- 库存日志表索引
CREATE INDEX "part_inventory_logs_part_id_idx" ON "part_inventory_logs"("part_id");
CREATE INDEX "part_inventory_logs_created_at_idx" ON "part_inventory_logs"("created_at");

-- 5. 修改 Equipment 表 - 添加厂区关联
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "factory_id" TEXT;
CREATE INDEX IF NOT EXISTS "Equipment_factory_id_idx" ON "Equipment"("factory_id");
ALTER TABLE "Equipment" DROP CONSTRAINT IF EXISTS "Equipment_factory_id_fkey";
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_factory_id_fkey"
    FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. 修改 Part 表 - 添加分类关联和库存预警字段
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "category_id" TEXT;
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "default_lifespan_days" INTEGER DEFAULT 180;
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "warning_threshold_days" INTEGER DEFAULT 15;
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "last_stock_in_at" TIMESTAMP(3);
ALTER TABLE "Part" ADD COLUMN IF NOT EXISTS "last_stock_out_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Part_category_id_idx" ON "Part"("category_id");
ALTER TABLE "Part" DROP CONSTRAINT IF EXISTS "Part_category_id_fkey";
ALTER TABLE "Part" ADD CONSTRAINT "Part_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "spare_part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. 修改 MaintenancePlan 表 - 添加Cron调度支持
ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "schedule_type" TEXT;
ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "schedule_rule" JSONB;
ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "reminder_days_json" JSONB DEFAULT '[7,3,1]';
ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "auto_create_record" BOOLEAN DEFAULT false;
ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "last_executed_at" TIMESTAMP(3);
ALTER TABLE "MaintenancePlan" ADD COLUMN IF NOT EXISTS "next_maintenance_date" TIMESTAMP(3);

-- 8. 添加外键约束
ALTER TABLE "equipment_health_history" DROP CONSTRAINT IF EXISTS "equipment_health_history_equipment_id_fkey";
ALTER TABLE "equipment_health_history" ADD CONSTRAINT "equipment_health_history_equipment_id_fkey"
    FOREIGN KEY ("equipment_id") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "spare_part_categories" DROP CONSTRAINT IF EXISTS "spare_part_categories_parent_id_fkey";
ALTER TABLE "spare_part_categories" ADD CONSTRAINT "spare_part_categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "spare_part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "part_inventory_logs" DROP CONSTRAINT IF EXISTS "part_inventory_logs_part_id_fkey";
ALTER TABLE "part_inventory_logs" ADD CONSTRAINT "part_inventory_logs_part_id_fkey"
    FOREIGN KEY ("part_id") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
