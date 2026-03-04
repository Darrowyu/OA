-- AlterTable: MaintenanceRecord 添加 severity 字段
ALTER TABLE "MaintenanceRecord" ADD COLUMN "severity" TEXT;

-- CreateTable: 设备产能配置
CREATE TABLE "equipment_capabilities" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "process_name" TEXT,
    "capacity_per_hour" DOUBLE PRECISION NOT NULL,
    "efficiency_factor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "setup_time" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '件',
    "status" TEXT NOT NULL DEFAULT 'active',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 操作员技能
CREATE TABLE "operator_skills" (
    "id" TEXT NOT NULL,
    "operator_name" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "skill_level" TEXT NOT NULL DEFAULT 'intermediate',
    "efficiency_factor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "certification_date" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_capabilities_equipment_id_idx" ON "equipment_capabilities"("equipment_id");
CREATE INDEX "equipment_capabilities_product_name_idx" ON "equipment_capabilities"("product_name");
CREATE INDEX "operator_skills_equipment_id_idx" ON "operator_skills"("equipment_id");
CREATE INDEX "operator_skills_operator_name_idx" ON "operator_skills"("operator_name");

-- AddForeignKey
ALTER TABLE "equipment_capabilities" ADD CONSTRAINT "equipment_capabilities_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operator_skills" ADD CONSTRAINT "operator_skills_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
