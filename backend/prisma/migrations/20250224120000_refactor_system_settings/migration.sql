-- CreateEnum
CREATE TYPE "ConfigValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY', 'PASSWORD');

-- CreateTable
CREATE TABLE "config_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "defaultValue" TEXT,
    "valueType" "ConfigValueType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_histories" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "config_categories_code_key" ON "config_categories"("code");

-- CreateIndex
CREATE INDEX "config_categories_isEnabled_idx" ON "config_categories"("isEnabled");

-- CreateIndex
CREATE INDEX "config_categories_sortOrder_idx" ON "config_categories"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_categoryId_key_key" ON "system_configs"("categoryId", "key");

-- CreateIndex
CREATE INDEX "system_configs_isEnabled_idx" ON "system_configs"("isEnabled");

-- CreateIndex
CREATE INDEX "system_configs_isSystem_idx" ON "system_configs"("isSystem");

-- CreateIndex
CREATE INDEX "system_configs_sortOrder_idx" ON "system_configs"("sortOrder");

-- CreateIndex
CREATE INDEX "config_histories_configId_idx" ON "config_histories"("configId");

-- CreateIndex
CREATE INDEX "config_histories_changedBy_idx" ON "config_histories"("changedBy");

-- CreateIndex
CREATE INDEX "config_histories_createdAt_idx" ON "config_histories"("createdAt");

-- AddForeignKey
ALTER TABLE "system_configs" ADD CONSTRAINT "system_configs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "config_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_histories" ADD CONSTRAINT "config_histories_configId_fkey" FOREIGN KEY ("configId") REFERENCES "system_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_histories" ADD CONSTRAINT "config_histories_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
