# 系统设置功能完整重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构OA系统的系统设置功能，建立统一的配置管理体系，实现与各业务模块的深度联动

**Architecture:**
- 采用"配置中心+模块配置"双层架构，核心配置统一存储，业务配置模块化扩展
- 前端采用动态表单渲染，支持配置项的类型校验和联动显示
- 后端采用通用配置服务，支持配置的增删改查、版本控制和缓存优化

**Tech Stack:**
- 前端: React + TypeScript + shadcn/ui + React Hook Form + Zod
- 后端: Node.js + Express + Prisma + PostgreSQL
- 缓存: 内存缓存 + Redis(可选)

---

## Phase 1: 数据库模型重构

### Task 1: 重构系统设置数据库模型

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20250224120000_refactor_system_settings/migration.sql`

**Step 1: 定义新的配置模型**

在 `prisma/schema.prisma` 中添加新的配置模型，保留旧模型用于迁移：

```prisma
// 配置分类
model ConfigCategory {
  id          String    @id @default(cuid())
  code        String    @unique  // 分类代码: system, security, approval, task, attendance, equipment, notification
  name        String              // 分类名称
  description String?             // 分类描述
  icon        String?             // 图标
  sortOrder   Int       @default(0)
  isEnabled   Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  configs     SystemConfig[]
}

// 系统配置项
model SystemConfig {
  id           String   @id @default(cuid())
  categoryId   String
  key          String            // 配置键名
  value        String            // 配置值(JSON字符串)
  defaultValue String?           // 默认值
  valueType    ConfigValueType   // 值类型: STRING, NUMBER, BOOLEAN, JSON, ARRAY
  label        String            // 显示名称
  description  String?           // 配置说明
  placeholder  String?           // 输入提示
  options      Json?             // 选项(用于select/radio)
  validation   Json?             // 验证规则
  isSecret     Boolean  @default(false)  // 是否敏感(密码等)
  isEditable   Boolean  @default(true)   // 是否可编辑
  isVisible    Boolean  @default(true)   // 是否可见
  sortOrder    Int      @default(0)
  module       String              // 所属模块
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  category     ConfigCategory @relation(fields: [categoryId], references: [id])

  @@unique([key])
  @@index([categoryId])
  @@index([module])
}

enum ConfigValueType {
  STRING
  NUMBER
  BOOLEAN
  JSON
  ARRAY
  DATE
}

// 配置变更历史
model ConfigHistory {
  id          String   @id @default(cuid())
  configKey   String
  oldValue    String?
  newValue    String
  changedBy   String
  changedByUser User   @relation(fields: [changedBy], references: [id])
  reason      String?
  createdAt   DateTime @default(now())

  @@index([configKey])
  @@index([createdAt])
}

// 在 User 模型中添加关系
// model User {
//   ... existing fields ...
//   configHistories ConfigHistory[]
// }
```

**Step 2: 保留并迁移旧数据**

在 schema 中保留旧的 EmailSettings 和 SystemSettings 模型，通过迁移脚本将数据迁移到新模型：

```prisma
// 旧模型标记为废弃，用于数据迁移
model EmailSettings {
  id               String   @id @default("default")
  enabled          Boolean  @default(true)
  smtpHost         String   @default("")
  smtpPort         Int      @default(587)
  smtpUser         String   @default("")
  smtpPassword     String   @default("")
  taskReminder     Boolean  @default(true)
  meetingReminder  Boolean  @default(true)
  approvalReminder Boolean  @default(true)
  updatedAt        DateTime @updatedAt
}

model SystemSettings {
  id                String   @id @default("default")
  autoBackupEnabled Boolean  @default(false)
  updatedAt         DateTime @updatedAt
}
```

**Step 3: 创建迁移脚本**

创建 `prisma/migrations/20250224120000_refactor_system_settings/migration.sql`：

```sql
-- 创建配置分类表
CREATE TABLE "ConfigCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 创建配置项表
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "defaultValue" TEXT,
    "valueType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "options" JSON,
    "validation" JSON,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "module" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SystemConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ConfigCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 创建配置历史表
CREATE TABLE "ConfigHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configKey" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfigHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 创建索引
CREATE INDEX "SystemConfig_categoryId_idx" ON "SystemConfig"("categoryId");
CREATE INDEX "SystemConfig_module_idx" ON "SystemConfig"("module");
CREATE INDEX "ConfigHistory_configKey_idx" ON "ConfigHistory"("configKey");
CREATE INDEX "ConfigHistory_createdAt_idx" ON "ConfigHistory"("createdAt");

-- 插入默认配置分类
INSERT INTO "ConfigCategory" ("id", "code", "name", "description", "icon", "sortOrder") VALUES
('cat_system', 'system', '系统设置', '系统基础配置和运行参数', 'Settings', 1),
('cat_security', 'security', '安全设置', '登录安全、密码策略和权限控制', 'Shield', 2),
('cat_approval', 'approval', '审批流程', '审批流程配置和规则设置', 'FileCheck', 3),
('cat_notification', 'notification', '通知提醒', '邮件、短信和站内通知配置', 'Bell', 4),
('cat_attendance', 'attendance', '考勤管理', '考勤规则和工作时间设置', 'Clock', 5),
('cat_task', 'task', '任务管理', '任务管理默认参数配置', 'CheckSquare', 6),
('cat_equipment', 'equipment', '设备管理', '设备维护和保养规则配置', 'Wrench', 7),
('cat_document', 'document', '文档管理', '文档存储和权限配置', 'FileText', 8);

-- 迁移旧邮件配置数据
INSERT INTO "SystemConfig" ("id", "categoryId", "key", "value", "valueType", "label", "description", "module", "sortOrder")
SELECT
    lower(hex(randomblob(16))),
    'cat_notification',
    'email.enabled',
    CASE WHEN "enabled" THEN 'true' ELSE 'false' END,
    'BOOLEAN',
    '邮件通知总开关',
    '是否启用系统邮件通知功能',
    'notification',
    1
FROM "EmailSettings" WHERE "id" = 'default';

-- 继续迁移其他邮件配置项...
```

**Step 4: 执行迁移**

```bash
cd D:/Code/JS/Project/WIP/OA-runningVersion-v1.0.1
npx prisma migrate dev --name refactor_system_settings
npx prisma generate
```

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): 重构系统设置数据库模型，支持通用配置管理"
```

---

## Phase 2: 后端服务实现

### Task 2: 创建配置服务层

**Files:**
- Create: `backend/src/services/config.service.ts`
- Create: `backend/src/types/config.types.ts`

**Step 1: 定义配置类型**

```typescript
// backend/src/types/config.types.ts
import { ConfigValueType } from '@prisma/client';

export interface ConfigCategoryDTO {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface ConfigOption {
  label: string;
  value: string | number | boolean;
  description?: string;
}

export interface ConfigValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
}

export interface SystemConfigDTO {
  id: string;
  key: string;
  value: any;
  defaultValue?: any;
  valueType: ConfigValueType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: ConfigOption[];
  validation?: ConfigValidation;
  isSecret: boolean;
  isEditable: boolean;
  isVisible: boolean;
  sortOrder: number;
  module: string;
  category?: ConfigCategoryDTO;
}

export interface UpdateConfigDTO {
  value: any;
  reason?: string;
}

export interface ConfigHistoryDTO {
  id: string;
  configKey: string;
  oldValue?: any;
  newValue: any;
  changedBy: string;
  changedByName?: string;
  reason?: string;
  createdAt: Date;
}

export interface ConfigQueryParams {
  category?: string;
  module?: string;
  search?: string;
}
```

**Step 2: 实现配置服务**

```typescript
// backend/src/services/config.service.ts
import prisma from '@/lib/prisma';
import { ConfigValueType } from '@prisma/client';
import {
  SystemConfigDTO,
  ConfigCategoryDTO,
  UpdateConfigDTO,
  ConfigHistoryDTO,
  ConfigQueryParams,
} from '@/types/config.types';

// 内存缓存
const configCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

export class ConfigService {
  /**
   * 获取所有配置分类
   */
  async getCategories(): Promise<ConfigCategoryDTO[]> {
    const categories = await prisma.configCategory.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(this.mapCategoryToDTO);
  }

  /**
   * 获取配置列表（按分类）
   */
  async getConfigs(params?: ConfigQueryParams): Promise<SystemConfigDTO[]> {
    const where: any = { isVisible: true };

    if (params?.category) {
      where.category = { code: params.category };
    }
    if (params?.module) {
      where.module = params.module;
    }
    if (params?.search) {
      where.OR = [
        { key: { contains: params.search, mode: 'insensitive' } },
        { label: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      include: { category: true },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    return configs.map(this.mapConfigToDTO);
  }

  /**
   * 获取单个配置值（带缓存）
   */
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    // 检查缓存
    const cached = configCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return defaultValue as T;
    }

    const value = this.parseValue(config.value, config.valueType);
    configCache.set(key, value);
    return value;
  }

  /**
   * 批量获取配置值
   */
  async getValues(keys: string[]): Promise<Record<string, any>> {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = this.parseValue(config.value, config.valueType);
    }

    return result;
  }

  /**
   * 更新配置值
   */
  async updateConfig(
    key: string,
    data: UpdateConfigDTO,
    userId: string
  ): Promise<SystemConfigDTO> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new Error('配置项不存在');
    }

    if (!config.isEditable) {
      throw new Error('该配置项不可编辑');
    }

    const oldValue = config.value;
    const newValue = this.serializeValue(data.value, config.valueType);

    // 开启事务
    const [updated] = await prisma.$transaction([
      prisma.systemConfig.update({
        where: { key },
        data: { value: newValue },
        include: { category: true },
      }),
      prisma.configHistory.create({
        data: {
          configKey: key,
          oldValue,
          newValue,
          changedBy: userId,
          reason: data.reason,
        },
      }),
    ]);

    // 清除缓存
    configCache.delete(key);

    return this.mapConfigToDTO(updated);
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(
    updates: Record<string, any>,
    userId: string,
    reason?: string
  ): Promise<void> {
    const keys = Object.keys(updates);
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const configMap = new Map(configs.map(c => [c.key, c]));

    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        const config = configMap.get(key);
        if (!config || !config.isEditable) continue;

        const oldValue = config.value;
        const newValue = this.serializeValue(value, config.valueType);

        await tx.systemConfig.update({
          where: { key },
          data: { value: newValue },
        });

        await tx.configHistory.create({
          data: {
            configKey: key,
            oldValue,
            newValue,
            changedBy: userId,
            reason,
          },
        });

        configCache.delete(key);
      }
    });
  }

  /**
   * 获取配置变更历史
   */
  async getConfigHistory(
    key: string,
    limit: number = 50
  ): Promise<ConfigHistoryDTO[]> {
    const histories = await prisma.configHistory.findMany({
      where: { configKey: key },
      include: { changedByUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return histories.map(h => ({
      id: h.id,
      configKey: h.configKey,
      oldValue: h.oldValue ? this.parseValue(h.oldValue) : undefined,
      newValue: this.parseValue(h.newValue),
      changedBy: h.changedBy,
      changedByName: h.changedByUser?.name,
      reason: h.reason,
      createdAt: h.createdAt,
    }));
  }

  /**
   * 初始化默认配置
   */
  async initializeDefaults(): Promise<void> {
    const defaults = getDefaultConfigs();

    for (const config of defaults) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {},
        create: config,
      });
    }
  }

  // ===== 私有方法 =====

  private parseValue(value: string, type?: ConfigValueType): any {
    if (!value) return null;

    switch (type) {
      case ConfigValueType.BOOLEAN:
        return value === 'true';
      case ConfigValueType.NUMBER:
        return parseFloat(value);
      case ConfigValueType.JSON:
      case ConfigValueType.ARRAY:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private serializeValue(value: any, type?: ConfigValueType): string {
    if (value === null || value === undefined) return '';

    if (type === ConfigValueType.JSON || type === ConfigValueType.ARRAY) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private mapConfigToDTO(config: any): SystemConfigDTO {
    return {
      id: config.id,
      key: config.key,
      value: this.parseValue(config.value, config.valueType),
      defaultValue: config.defaultValue
        ? this.parseValue(config.defaultValue, config.valueType)
        : undefined,
      valueType: config.valueType,
      label: config.label,
      description: config.description,
      placeholder: config.placeholder,
      options: config.options as any,
      validation: config.validation as any,
      isSecret: config.isSecret,
      isEditable: config.isEditable,
      isVisible: config.isVisible,
      sortOrder: config.sortOrder,
      module: config.module,
      category: config.category ? this.mapCategoryToDTO(config.category) : undefined,
    };
  }

  private mapCategoryToDTO(category: any): ConfigCategoryDTO {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      isEnabled: category.isEnabled,
    };
  }
}

// 默认配置数据
function getDefaultConfigs(): any[] {
  return [
    // 系统基础配置
    {
      id: 'cfg_system_name',
      categoryId: 'cat_system',
      key: 'system.name',
      value: 'OA办公系统',
      valueType: ConfigValueType.STRING,
      label: '系统名称',
      description: '显示在页面标题和登录页的系统名称',
      module: 'system',
      sortOrder: 1,
    },
    {
      id: 'cfg_system_logo',
      categoryId: 'cat_system',
      key: 'system.logo',
      value: '/logo.png',
      valueType: ConfigValueType.STRING,
      label: '系统Logo',
      description: '系统Logo图片地址',
      module: 'system',
      sortOrder: 2,
    },
    {
      id: 'cfg_system_session_timeout',
      categoryId: 'cat_system',
      key: 'system.sessionTimeout',
      value: '30',
      defaultValue: '30',
      valueType: ConfigValueType.NUMBER,
      label: '会话超时时间',
      description: '用户无操作后自动登出的时间（分钟）',
      placeholder: '30',
      validation: { required: true, min: 5, max: 1440 },
      module: 'system',
      sortOrder: 3,
    },
    {
      id: 'cfg_system_timezone',
      categoryId: 'cat_system',
      key: 'system.timezone',
      value: 'Asia/Shanghai',
      defaultValue: 'Asia/Shanghai',
      valueType: ConfigValueType.STRING,
      label: '系统时区',
      description: '系统默认时区设置',
      options: [
        { label: '北京时间', value: 'Asia/Shanghai' },
        { label: '东京时间', value: 'Asia/Tokyo' },
        { label: '纽约时间', value: 'America/New_York' },
        { label: '伦敦时间', value: 'Europe/London' },
      ],
      module: 'system',
      sortOrder: 4,
    },
    // 安全设置
    {
      id: 'cfg_security_password_min_length',
      categoryId: 'cat_security',
      key: 'security.password.minLength',
      value: '8',
      defaultValue: '8',
      valueType: ConfigValueType.NUMBER,
      label: '密码最小长度',
      description: '用户密码的最小字符数',
      validation: { required: true, min: 6, max: 32 },
      module: 'security',
      sortOrder: 1,
    },
    {
      id: 'cfg_security_password_complexity',
      categoryId: 'cat_security',
      key: 'security.password.requireComplexity',
      value: 'true',
      defaultValue: 'true',
      valueType: ConfigValueType.BOOLEAN,
      label: '要求密码复杂度',
      description: '是否要求密码包含大小写字母、数字和特殊字符',
      module: 'security',
      sortOrder: 2,
    },
    {
      id: 'cfg_security_password_expiry',
      categoryId: 'cat_security',
      key: 'security.password.expiryDays',
      value: '90',
      defaultValue: '90',
      valueType: ConfigValueType.NUMBER,
      label: '密码过期天数',
      description: '密码多少天后必须更换（0表示永不过期）',
      validation: { min: 0, max: 365 },
      module: 'security',
      sortOrder: 3,
    },
    {
      id: 'cfg_security_login_max_attempts',
      categoryId: 'cat_security',
      key: 'security.login.maxAttempts',
      value: '5',
      defaultValue: '5',
      valueType: ConfigValueType.NUMBER,
      label: '登录失败次数',
      description: '连续登录失败多少次后锁定账号',
      validation: { required: true, min: 3, max: 10 },
      module: 'security',
      sortOrder: 4,
    },
    {
      id: 'cfg_security_login_lock_duration',
      categoryId: 'cat_security',
      key: 'security.login.lockDuration',
      value: '30',
      defaultValue: '30',
      valueType: ConfigValueType.NUMBER,
      label: '账号锁定时间',
      description: '账号锁定后多少分钟自动解锁',
      validation: { required: true, min: 5, max: 1440 },
      module: 'security',
      sortOrder: 5,
    },
    // 邮件通知配置
    {
      id: 'cfg_email_enabled',
      categoryId: 'cat_notification',
      key: 'email.enabled',
      value: 'true',
      defaultValue: 'true',
      valueType: ConfigValueType.BOOLEAN,
      label: '启用邮件通知',
      description: '是否启用系统邮件通知功能',
      module: 'notification',
      sortOrder: 1,
    },
    {
      id: 'cfg_email_smtp_host',
      categoryId: 'cat_notification',
      key: 'email.smtp.host',
      value: '',
      valueType: ConfigValueType.STRING,
      label: 'SMTP服务器',
      description: '邮件服务器地址',
      placeholder: 'smtp.example.com',
      module: 'notification',
      sortOrder: 2,
    },
    {
      id: 'cfg_email_smtp_port',
      categoryId: 'cat_notification',
      key: 'email.smtp.port',
      value: '587',
      defaultValue: '587',
      valueType: ConfigValueType.NUMBER,
      label: 'SMTP端口',
      description: '邮件服务器端口',
      options: [
        { label: '25', value: 25 },
        { label: '465 (SSL)', value: 465 },
        { label: '587 (TLS)', value: 587 },
      ],
      module: 'notification',
      sortOrder: 3,
    },
    {
      id: 'cfg_email_smtp_user',
      categoryId: 'cat_notification',
      key: 'email.smtp.user',
      value: '',
      valueType: ConfigValueType.STRING,
      label: '发件人邮箱',
      description: '系统发件邮箱地址',
      placeholder: 'noreply@company.com',
      validation: { email: true },
      module: 'notification',
      sortOrder: 4,
    },
    {
      id: 'cfg_email_smtp_password',
      categoryId: 'cat_notification',
      key: 'email.smtp.password',
      value: '',
      valueType: ConfigValueType.STRING,
      label: '邮箱密码/授权码',
      description: '邮箱密码或SMTP授权码',
      isSecret: true,
      module: 'notification',
      sortOrder: 5,
    },
    // 审批流程配置
    {
      id: 'cfg_approval_default_flow',
      categoryId: 'cat_approval',
      key: 'approval.defaultFlowEnabled',
      value: 'true',
      defaultValue: 'true',
      valueType: ConfigValueType.BOOLEAN,
      label: '启用默认审批流',
      description: '是否启用系统默认审批流程',
      module: 'approval',
      sortOrder: 1,
    },
    {
      id: 'cfg_approval_ceo_threshold',
      categoryId: 'cat_approval',
      key: 'approval.ceoApprovalThreshold',
      value: '100000',
      defaultValue: '100000',
      valueType: ConfigValueType.NUMBER,
      label: 'CEO审批金额阈值',
      description: '超过此金额需要CEO审批（元）',
      validation: { min: 0 },
      module: 'approval',
      sortOrder: 2,
    },
    {
      id: 'cfg_approval_timeout',
      categoryId: 'cat_approval',
      key: 'approval.timeoutHours',
      value: '48',
      defaultValue: '48',
      valueType: ConfigValueType.NUMBER,
      label: '审批超时时间',
      description: '审批人需在多少小时内处理（0表示不限制）',
      validation: { min: 0 },
      module: 'approval',
      sortOrder: 3,
    },
    // 考勤配置
    {
      id: 'cfg_attendance_work_start',
      categoryId: 'cat_attendance',
      key: 'attendance.workStartTime',
      value: '09:00',
      defaultValue: '09:00',
      valueType: ConfigValueType.STRING,
      label: '上班时间',
      description: '标准上班时间',
      placeholder: '09:00',
      module: 'attendance',
      sortOrder: 1,
    },
    {
      id: 'cfg_attendance_work_end',
      categoryId: 'cat_attendance',
      key: 'attendance.workEndTime',
      value: '18:00',
      defaultValue: '18:00',
      valueType: ConfigValueType.STRING,
      label: '下班时间',
      description: '标准下班时间',
      placeholder: '18:00',
      module: 'attendance',
      sortOrder: 2,
    },
    {
      id: 'cfg_attendance_late_threshold',
      categoryId: 'cat_attendance',
      key: 'attendance.lateThresholdMinutes',
      value: '15',
      defaultValue: '15',
      valueType: ConfigValueType.NUMBER,
      label: '迟到阈值',
      description: '晚于上班时间多少分钟算迟到',
      validation: { min: 0, max: 120 },
      module: 'attendance',
      sortOrder: 3,
    },
    {
      id: 'cfg_attendance_early_threshold',
      categoryId: 'cat_attendance',
      key: 'attendance.earlyLeaveThresholdMinutes',
      value: '15',
      defaultValue: '15',
      valueType: ConfigValueType.NUMBER,
      label: '早退阈值',
      description: '早于下班时间多少分钟算早退',
      validation: { min: 0, max: 120 },
      module: 'attendance',
      sortOrder: 4,
    },
    // 任务管理配置
    {
      id: 'cfg_task_default_priority',
      categoryId: 'cat_task',
      key: 'task.defaultPriority',
      value: 'medium',
      defaultValue: 'medium',
      valueType: ConfigValueType.STRING,
      label: '默认优先级',
      description: '新建任务的默认优先级',
      options: [
        { label: '高', value: 'high' },
        { label: '中', value: 'medium' },
        { label: '低', value: 'low' },
      ],
      module: 'task',
      sortOrder: 1,
    },
    {
      id: 'cfg_task_reminder_before',
      categoryId: 'cat_task',
      key: 'task.reminderBeforeHours',
      value: '24',
      defaultValue: '24',
      valueType: ConfigValueType.NUMBER,
      label: '任务提醒时间',
      description: '截止前多少小时发送提醒',
      validation: { min: 1, max: 168 },
      module: 'task',
      sortOrder: 2,
    },
    // 设备管理配置
    {
      id: 'cfg_equipment_maintenance_reminder',
      categoryId: 'cat_equipment',
      key: 'equipment.maintenanceReminderDays',
      value: '7',
      defaultValue: '7',
      valueType: ConfigValueType.NUMBER,
      label: '保养提醒天数',
      description: '保养到期前多少天发送提醒',
      validation: { min: 1, max: 30 },
      module: 'equipment',
      sortOrder: 1,
    },
    {
      id: 'cfg_equipment_low_stock_threshold',
      categoryId: 'cat_equipment',
      key: 'equipment.lowStockThreshold',
      value: '10',
      defaultValue: '10',
      valueType: ConfigValueType.NUMBER,
      label: '库存预警阈值',
      description: '配件库存低于此数量时预警',
      validation: { min: 1 },
      module: 'equipment',
      sortOrder: 2,
    },
    // 文档管理配置
    {
      id: 'cfg_document_max_size',
      categoryId: 'cat_document',
      key: 'document.maxFileSizeMB',
      value: '50',
      defaultValue: '50',
      valueType: ConfigValueType.NUMBER,
      label: '单文件大小限制',
      description: '上传文件的单个大小限制（MB）',
      validation: { min: 1, max: 500 },
      module: 'document',
      sortOrder: 1,
    },
    {
      id: 'cfg_document_allowed_types',
      categoryId: 'cat_document',
      key: 'document.allowedFileTypes',
      value: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar',
      defaultValue: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar',
      valueType: ConfigValueType.STRING,
      label: '允许的文件类型',
      description: '允许上传的文件扩展名，逗号分隔',
      placeholder: 'pdf,doc,docx,xls,xlsx',
      module: 'document',
      sortOrder: 2,
    },
    {
      id: 'cfg_document_user_quota',
      categoryId: 'cat_document',
      key: 'document.userStorageQuotaMB',
      value: '1024',
      defaultValue: '1024',
      valueType: ConfigValueType.NUMBER,
      label: '用户存储配额',
      description: '每个用户的存储空间配额（MB）',
      validation: { min: 100 },
      module: 'document',
      sortOrder: 3,
    },
  ];
}

export const configService = new ConfigService();
```

**Step 3: Commit**

```bash
git add backend/src/services/config.service.ts backend/src/types/config.types.ts
git commit -m "feat(backend): 创建通用配置服务，支持CRUD、缓存和历史记录"
```

---

### Task 3: 创建配置控制器和路由

**Files:**
- Create: `backend/src/controllers/config.controller.ts`
- Modify: `backend/src/routes/settings.ts` (重构现有路由)

**Step 1: 实现配置控制器**

```typescript
// backend/src/controllers/config.controller.ts
import { Request, Response } from 'express';
import { configService } from '@/services/config.service';
import { UpdateConfigDTO } from '@/types/config.types';

export class ConfigController {
  /**
   * 获取所有配置分类
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await configService.getCategories();
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CATEGORIES_ERROR',
          message: '获取配置分类失败',
        },
      });
    }
  }

  /**
   * 获取配置列表
   */
  async getConfigs(req: Request, res: Response) {
    try {
      const { category, module, search } = req.query;
      const configs = await configService.getConfigs({
        category: category as string,
        module: module as string,
        search: search as string,
      });
      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CONFIGS_ERROR',
          message: '获取配置列表失败',
        },
      });
    }
  }

  /**
   * 获取单个配置值
   */
  async getConfigValue(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const value = await configService.getValue(key);
      res.json({
        success: true,
        data: { key, value },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CONFIG_ERROR',
          message: '获取配置值失败',
        },
      });
    }
  }

  /**
   * 批量获取配置值
   */
  async getConfigValues(req: Request, res: Response) {
    try {
      const { keys } = req.body;
      if (!Array.isArray(keys)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'keys 必须是数组',
          },
        });
      }
      const values = await configService.getValues(keys);
      res.json({
        success: true,
        data: values,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CONFIGS_ERROR',
          message: '获取配置值失败',
        },
      });
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未登录',
          },
        });
      }

      const data: UpdateConfigDTO = req.body;
      const config = await configService.updateConfig(key, data, userId);
      res.json({
        success: true,
        data: config,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_CONFIG_ERROR',
          message: error.message || '更新配置失败',
        },
      });
    }
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未登录',
          },
        });
      }

      const { updates, reason } = req.body;

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'updates 必须是对象',
          },
        });
      }

      await configService.batchUpdateConfigs(updates, userId, reason);
      res.json({
        success: true,
        message: '批量更新成功',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_UPDATE_ERROR',
          message: error.message || '批量更新配置失败',
        },
      });
    }
  }

  /**
   * 获取配置变更历史
   */
  async getConfigHistory(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await configService.getConfigHistory(key, limit);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_HISTORY_ERROR',
          message: '获取配置历史失败',
        },
      });
    }
  }

  /**
   * 初始化默认配置
   */
  async initializeDefaults(req: Request, res: Response) {
    try {
      await configService.initializeDefaults();
      res.json({
        success: true,
        message: '默认配置初始化成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INIT_DEFAULTS_ERROR',
          message: '初始化默认配置失败',
        },
      });
    }
  }
}

export const configController = new ConfigController();
```

**Step 2: 重构设置路由**

```typescript
// backend/src/routes/settings.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { configController } from '@/controllers/config.controller';
import { settingsController } from '@/controllers/settings';

const router = Router();

// 所有设置路由都需要登录和ADMIN权限
router.use(requireAuth, requireRole(['ADMIN']));

// ========== 新配置管理路由 ==========

// 配置分类
router.get('/config/categories', configController.getCategories);

// 配置列表和详情
router.get('/config', configController.getConfigs);
router.get('/config/value/:key', configController.getConfigValue);
router.post('/config/values', configController.getConfigValues);

// 配置更新
router.put('/config/:key', configController.updateConfig);
router.post('/config/batch', configController.batchUpdateConfigs);

// 配置历史
router.get('/config/:key/history', configController.getConfigHistory);

// 初始化默认配置
router.post('/config/initialize', configController.initializeDefaults);

// ========== 保留原有功能路由 ==========

// 系统信息
router.get('/system-info', settingsController.getSystemInfo);

// 系统日志
router.get('/logs', settingsController.getLogs);
router.post('/logs/export', settingsController.exportLogs);

// 备份管理
router.get('/backups', settingsController.getBackups);
router.post('/backups', settingsController.createBackup);
router.post('/backups/:id/restore', settingsController.restoreBackup);
router.get('/backups/:id/download', settingsController.downloadBackup);

// 自动备份设置
router.get('/auto-backup', settingsController.getAutoBackupSettings);
router.post('/auto-backup', settingsController.setAutoBackupSettings);

// 邮件设置测试（兼容旧版）
router.post('/email/test', settingsController.testEmailSettings);

export default router;
```

**Step 3: 更新控制器中的邮件测试方法**

在 `backend/src/controllers/settings.ts` 中添加邮件测试方法：

```typescript
// 添加到 settingsController 中
async testEmailSettings(req: Request, res: Response) {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, testEmail } = req.body;

    // 创建临时SMTP配置
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // 验证连接
    await transporter.verify();

    // 发送测试邮件
    await transporter.sendMail({
      from: smtpUser,
      to: testEmail,
      subject: 'OA系统邮件测试',
      html: '<p>这是一封测试邮件，如果您的邮箱收到此邮件，说明邮件配置正确。</p>',
    });

    res.json({
      success: true,
      message: '测试邮件已发送，请查收',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'EMAIL_TEST_ERROR',
        message: error.message || '邮件测试失败',
      },
    });
  }
}
```

**Step 4: Commit**

```bash
git add backend/src/controllers/config.controller.ts backend/src/routes/settings.ts
git commit -m "feat(backend): 添加配置控制器和重构路由，支持新的配置管理API"
```

---

## Phase 3: 前端配置管理实现

### Task 4: 创建配置管理类型和API

**Files:**
- Create: `frontend/src/services/config.api.ts`
- Create: `frontend/src/types/config.ts`

**Step 1: 定义配置类型**

```typescript
// frontend/src/types/config.ts
export type ConfigValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY' | 'DATE';

export interface ConfigCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface ConfigOption {
  label: string;
  value: string | number | boolean;
  description?: string;
}

export interface ConfigValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  defaultValue?: any;
  valueType: ConfigValueType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: ConfigOption[];
  validation?: ConfigValidation;
  isSecret: boolean;
  isEditable: boolean;
  isVisible: boolean;
  sortOrder: number;
  module: string;
  category?: ConfigCategory;
}

export interface ConfigHistory {
  id: string;
  configKey: string;
  oldValue?: any;
  newValue: any;
  changedBy: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

export interface UpdateConfigRequest {
  value: any;
  reason?: string;
}

export interface BatchUpdateRequest {
  updates: Record<string, any>;
  reason?: string;
}
```

**Step 2: 创建配置API服务**

```typescript
// frontend/src/services/config.api.ts
import api from './api';
import {
  SystemConfig,
  ConfigCategory,
  ConfigHistory,
  UpdateConfigRequest,
  BatchUpdateRequest,
} from '@/types/config';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export const configApi = {
  // 获取配置分类
  getCategories(): Promise<ApiResponse<ConfigCategory[]>> {
    return api.get('/settings/config/categories');
  },

  // 获取配置列表
  getConfigs(params?: {
    category?: string;
    module?: string;
    search?: string;
  }): Promise<ApiResponse<SystemConfig[]>> {
    return api.get('/settings/config', { params });
  },

  // 获取单个配置值
  getConfigValue(key: string): Promise<ApiResponse<{ key: string; value: any }>> {
    return api.get(`/settings/config/value/${key}`);
  },

  // 批量获取配置值
  getConfigValues(keys: string[]): Promise<ApiResponse<Record<string, any>>> {
    return api.post('/settings/config/values', { keys });
  },

  // 更新配置
  updateConfig(
    key: string,
    data: UpdateConfigRequest
  ): Promise<ApiResponse<SystemConfig>> {
    return api.put(`/settings/config/${key}`, data);
  },

  // 批量更新配置
  batchUpdateConfigs(data: BatchUpdateRequest): Promise<ApiResponse<void>> {
    return api.post('/settings/config/batch', data);
  },

  // 获取配置变更历史
  getConfigHistory(
    key: string,
    limit?: number
  ): Promise<ApiResponse<ConfigHistory[]>> {
    return api.get(`/settings/config/${key}/history`, {
      params: { limit },
    });
  },

  // 初始化默认配置
  initializeDefaults(): Promise<ApiResponse<void>> {
    return api.post('/settings/config/initialize');
  },

  // 测试邮件配置
  testEmailSettings(config: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    testEmail: string;
  }): Promise<ApiResponse<void>> {
    return api.post('/settings/email/test', config);
  },
};
```

**Step 3: Commit**

```bash
git add frontend/src/types/config.ts frontend/src/services/config.api.ts
git commit -m "feat(frontend): 创建配置管理类型定义和API服务"
```

---

### Task 5: 创建动态配置表单组件

**Files:**
- Create: `frontend/src/pages/settings/components/ConfigFormField.tsx`
- Create: `frontend/src/pages/settings/components/ConfigCategorySection.tsx`

**Step 1: 创建配置表单字段组件**

```typescript
// frontend/src/pages/settings/components/ConfigFormField.tsx
import React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SystemConfig } from '@/types/config';
import { UseFormReturn } from 'react-hook-form';

interface ConfigFormFieldProps {
  config: SystemConfig;
  form: UseFormReturn<any>;
  disabled?: boolean;
}

export const ConfigFormField: React.FC<ConfigFormFieldProps> = ({
  config,
  form,
  disabled = false,
}) => {
  const { key, valueType, label, description, placeholder, options, validation, isSecret } = config;

  // 根据值类型渲染不同的表单控件
  const renderControl = (field: any) => {
    switch (valueType) {
      case 'BOOLEAN':
        return (
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
        );

      case 'NUMBER':
        return (
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              min={validation?.min}
              max={validation?.max}
            />
          </FormControl>
        );

      case 'STRING':
        // 如果有选项，使用Select
        if (options && options.length > 0) {
          return (
            <FormControl>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placeholder || '请选择'} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          );
        }
        // 检查是否是长文本
        if ((validation?.maxLength || 0) > 100) {
          return (
            <FormControl>
              <Textarea
                placeholder={placeholder}
                {...field}
                disabled={disabled}
                rows={4}
              />
            </FormControl>
          );
        }
        return (
          <FormControl>
            <Input
              type={isSecret ? 'password' : validation?.email ? 'email' : 'text'}
              placeholder={placeholder}
              {...field}
              disabled={disabled}
            />
          </FormControl>
        );

      case 'ARRAY':
      case 'JSON':
        return (
          <FormControl>
            <Textarea
              placeholder={placeholder || '请输入JSON格式数据'}
              {...field}
              disabled={disabled}
              rows={6}
              className="font-mono text-sm"
            />
          </FormControl>
        );

      default:
        return (
          <FormControl>
            <Input
              placeholder={placeholder}
              {...field}
              disabled={disabled}
            />
          </FormControl>
        );
    }
  };

  return (
    <FormField
      control={form.control}
      name={key}
      rules={{
        required: validation?.required ? `${label}不能为空` : false,
        min: validation?.min !== undefined ? { value: validation.min, message: `最小值为${validation.min}` } : undefined,
        max: validation?.max !== undefined ? { value: validation.max, message: `最大值为${validation.max}` } : undefined,
        minLength: validation?.minLength !== undefined ? { value: validation.minLength, message: `最少${validation.minLength}个字符` } : undefined,
        maxLength: validation?.maxLength !== undefined ? { value: validation.maxLength, message: `最多${validation.maxLength}个字符` } : undefined,
        pattern: validation?.pattern ? { value: new RegExp(validation.pattern), message: '格式不正确' } : undefined,
      }}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base">{label}</FormLabel>
            {valueType === 'BOOLEAN' && renderControl(field)}
          </div>
          {description && (
            <FormDescription>{description}</FormDescription>
          )}
          {valueType !== 'BOOLEAN' && renderControl(field)}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
```

**Step 2: 创建配置分类区块组件**

```typescript
// frontend/src/pages/settings/components/ConfigCategorySection.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigCategory, SystemConfig } from '@/types/config';
import { ConfigFormField } from './ConfigFormField';
import { UseFormReturn } from 'react-hook-form';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ConfigCategorySectionProps {
  category: ConfigCategory;
  configs: SystemConfig[];
  form: UseFormReturn<any>;
  disabled?: boolean;
}

export const ConfigCategorySection: React.FC<ConfigCategorySectionProps> = ({
  category,
  configs,
  form,
  disabled = false,
}) => {
  // 动态获取图标组件
  const IconComponent = category.icon
    ? (Icons[category.icon as keyof typeof Icons] as LucideIcon) || Icons.Settings
    : Icons.Settings;

  if (configs.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{category.name}</CardTitle>
            {category.description && (
              <CardDescription>{category.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {configs.map((config) => (
          <ConfigFormField
            key={config.key}
            config={config}
            form={form}
            disabled={disabled || !config.isEditable}
          />
        ))}
      </CardContent>
    </Card>
  );
};
```

**Step 3: Commit**

```bash
git add frontend/src/pages/settings/components/
git commit -m "feat(frontend): 创建动态配置表单组件，支持多种配置类型"
```

---

### Task 6: 重构系统设置主页面

**Files:**
- Modify: `frontend/src/pages/settings/index.tsx`
- Create: `frontend/src/pages/settings/hooks/useConfig.ts`

**Step 1: 创建配置管理Hook**

```typescript
// frontend/src/pages/settings/hooks/useConfig.ts
import { useState, useEffect, useCallback } from 'react';
import { configApi } from '@/services/config.api';
import {
  SystemConfig,
  ConfigCategory,
  ConfigHistory,
  UpdateConfigRequest,
  BatchUpdateRequest,
} from '@/types/config';
import { toast } from 'sonner';

interface UseConfigOptions {
  category?: string;
  module?: string;
  search?: string;
}

export function useConfig(options: UseConfigOptions = {}) {
  const [categories, setCategories] = useState<ConfigCategory[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // 获取配置分类
  const fetchCategories = useCallback(async () => {
    try {
      const response = await configApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('获取配置分类失败:', error);
    }
  }, []);

  // 获取配置列表
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeCategory && activeCategory !== 'all') {
        params.category = activeCategory;
      }
      if (options.module) {
        params.module = options.module;
      }
      if (options.search) {
        params.search = options.search;
      }

      const response = await configApi.getConfigs(params);
      if (response.success && response.data) {
        setConfigs(response.data);
      }
    } catch (error) {
      toast.error('获取配置列表失败');
      console.error('获取配置列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, options.module, options.search]);

  // 更新单个配置
  const updateConfig = useCallback(
    async (key: string, data: UpdateConfigRequest) => {
      setSaving(true);
      try {
        const response = await configApi.updateConfig(key, data);
        if (response.success) {
          toast.success('配置已更新');
          // 更新本地状态
          setConfigs((prev) =>
            prev.map((c) =>
              c.key === key ? { ...c, value: data.value } : c
            )
          );
          return true;
        } else {
          toast.error(response.error?.message || '更新失败');
          return false;
        }
      } catch (error: any) {
        toast.error(error.message || '更新失败');
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // 批量更新配置
  const batchUpdateConfigs = useCallback(async (data: BatchUpdateRequest) => {
    setSaving(true);
    try {
      const response = await configApi.batchUpdateConfigs(data);
      if (response.success) {
        toast.success('配置已批量更新');
        await fetchConfigs();
        return true;
      } else {
        toast.error(response.error?.message || '批量更新失败');
        return false;
      }
    } catch (error: any) {
      toast.error(error.message || '批量更新失败');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchConfigs]);

  // 获取配置历史
  const getConfigHistory = useCallback(async (key: string, limit?: number) => {
    try {
      const response = await configApi.getConfigHistory(key, limit);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      toast.error('获取配置历史失败');
      return [];
    }
  }, []);

  // 初始化默认配置
  const initializeDefaults = useCallback(async () => {
    try {
      const response = await configApi.initializeDefaults();
      if (response.success) {
        toast.success('默认配置已初始化');
        await fetchConfigs();
        return true;
      }
      return false;
    } catch (error) {
      toast.error('初始化默认配置失败');
      return false;
    }
  }, [fetchConfigs]);

  // 初始加载
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return {
    categories,
    configs,
    loading,
    saving,
    activeCategory,
    setActiveCategory,
    fetchCategories,
    fetchConfigs,
    updateConfig,
    batchUpdateConfigs,
    getConfigHistory,
    initializeDefaults,
  };
}

// 获取配置值（用于其他组件）
export function useConfigValue(key: string) {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchValue = async () => {
      setLoading(true);
      try {
        const response = await configApi.getConfigValue(key);
        if (response.success && response.data) {
          setValue(response.data.value);
        }
      } catch (error) {
        console.error(`获取配置 ${key} 失败:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchValue();
  }, [key]);

  return { value, loading };
}

// 批量获取配置值
export function useConfigValues(keys: string[]) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchValues = async () => {
      if (keys.length === 0) return;
      setLoading(true);
      try {
        const response = await configApi.getConfigValues(keys);
        if (response.success && response.data) {
          setValues(response.data);
        }
      } catch (error) {
        console.error('获取配置值失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchValues();
  }, [keys.join(',')]);

  return { values, loading };
}
```

**Step 2: 重构系统设置主页面**

```typescript
// frontend/src/pages/settings/index.tsx
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Search, RotateCcw, Mail, Database, Shield } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useConfig } from './hooks/useConfig';
import { ConfigCategorySection } from './components/ConfigCategorySection';
import { SystemTab } from './tabs/SystemTab';
import { ArchiveTab } from './tabs/ArchiveTab';
import { BackupTab } from './tabs/BackupTab';
import { EmailTab } from './tabs/EmailTab';
import { LogsTab } from './tabs/LogsTab';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const {
    categories,
    configs,
    loading,
    saving,
    activeCategory,
    setActiveCategory,
    fetchConfigs,
    batchUpdateConfigs,
    initializeDefaults,
  } = useConfig();

  const [searchTerm, setSearchTerm] = React.useState('');

  // 构建表单验证Schema
  const formSchema = useMemo(() => {
    const schema: Record<string, any> = {};
    configs.forEach((config) => {
      let fieldSchema: any;

      switch (config.valueType) {
        case 'BOOLEAN':
          fieldSchema = z.boolean();
          break;
        case 'NUMBER':
          fieldSchema = z.number();
          if (config.validation?.min !== undefined) {
            fieldSchema = fieldSchema.min(config.validation.min);
          }
          if (config.validation?.max !== undefined) {
            fieldSchema = fieldSchema.max(config.validation.max);
          }
          break;
        case 'STRING':
          fieldSchema = z.string();
          if (config.validation?.minLength !== undefined) {
            fieldSchema = fieldSchema.min(config.validation.minLength);
          }
          if (config.validation?.maxLength !== undefined) {
            fieldSchema = fieldSchema.max(config.validation.maxLength);
          }
          if (config.validation?.email) {
            fieldSchema = fieldSchema.email();
          }
          break;
        case 'JSON':
        case 'ARRAY':
          fieldSchema = z.any();
          break;
        default:
          fieldSchema = z.string();
      }

      if (!config.validation?.required && config.valueType !== 'BOOLEAN') {
        fieldSchema = fieldSchema.optional();
      }

      schema[config.key] = fieldSchema;
    });

    return z.object(schema);
  }, [configs]);

  // 构建表单默认值
  const defaultValues = useMemo(() => {
    const values: Record<string, any> = {};
    configs.forEach((config) => {
      values[config.key] = config.value;
    });
    return values;
  }, [configs]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  // 重置表单
  const handleReset = () => {
    form.reset(defaultValues);
    toast.info('表单已重置');
  };

  // 提交表单
  const onSubmit = async (data: any) => {
    // 只提交变更的值
    const changedValues: Record<string, any> = {};
    Object.keys(data).forEach((key) => {
      if (JSON.stringify(data[key]) !== JSON.stringify(defaultValues[key])) {
        changedValues[key] = data[key];
      }
    });

    if (Object.keys(changedValues).length === 0) {
      toast.info('没有需要保存的更改');
      return;
    }

    const success = await batchUpdateConfigs({
      updates: changedValues,
      reason: '通过系统设置页面批量更新',
    });

    if (success) {
      form.reset(data);
    }
  };

  // 按分类分组配置
  const configsByCategory = useMemo(() => {
    const grouped: Record<string, typeof configs> = {};
    configs.forEach((config) => {
      const catId = config.category?.id || 'uncategorized';
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(config);
    });
    return grouped;
  }, [configs]);

  // 过滤配置
  const filteredConfigs = useMemo(() => {
    if (!searchTerm) return configsByCategory;
    const filtered: Record<string, typeof configs> = {};
    Object.entries(configsByCategory).forEach(([catId, catConfigs]) => {
      const matching = catConfigs.filter(
        (c) =>
          c.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matching.length > 0) {
        filtered[catId] = matching;
      }
    });
    return filtered;
  }, [configsByCategory, searchTerm]);

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="系统设置"
        subtitle="管理系统的全局配置和参数"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving || !form.formState.isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存更改'}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="general" className="mt-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="general">
            <Shield className="h-4 w-4 mr-2" />
            通用配置
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            邮件通知
          </TabsTrigger>
          <TabsTrigger value="system">
            <Database className="h-4 w-4 mr-2" />
            系统信息
          </TabsTrigger>
          <TabsTrigger value="backup">备份恢复</TabsTrigger>
          <TabsTrigger value="archive">数据归档</TabsTrigger>
          <TabsTrigger value="logs">系统日志</TabsTrigger>
        </TabsList>

        {/* 通用配置 */}
        <TabsContent value="general" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索配置项..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={activeCategory}
                onValueChange={setActiveCategory}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.code}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {configs.length === 0 && (
              <Button variant="outline" onClick={initializeDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                初始化默认配置
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              加载中...
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-6">
                {Object.entries(filteredConfigs).map(([catId, catConfigs]) => {
                  const category = categories.find((c) => c.id === catId);
                  if (!category) return null;

                  return (
                    <ConfigCategorySection
                      key={catId}
                      category={category}
                      configs={catConfigs}
                      form={form}
                      disabled={saving}
                    />
                  );
                })}

                {Object.keys(filteredConfigs).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    没有找到匹配的配置项
                  </div>
                )}
              </form>
            </Form>
          )}
        </TabsContent>

        {/* 邮件通知 */}
        <TabsContent value="email">
          <EmailTab />
        </TabsContent>

        {/* 系统信息 */}
        <TabsContent value="system">
          <SystemTab />
        </TabsContent>

        {/* 备份恢复 */}
        <TabsContent value="backup">
          <BackupTab />
        </TabsContent>

        {/* 数据归档 */}
        <TabsContent value="archive">
          <ArchiveTab />
        </TabsContent>

        {/* 系统日志 */}
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
```

**Step 3: Commit**

```bash
git add frontend/src/pages/settings/
git commit -m "feat(frontend): 重构系统设置页面，支持通用配置管理"
```

---

## Phase 4: 各模块集成配置使用

### Task 7: 在审批模块中集成配置

**Files:**
- Modify: `backend/src/services/approval.service.ts`
- Modify: `backend/src/routes/applications.ts`

**Step 1: 修改审批服务使用配置**

```typescript
// 在 approval.service.ts 中添加配置读取
import { configService } from './config.service';

export class ApprovalService {
  /**
   * 获取审批金额阈值
   */
  async getCEOApprovalThreshold(): Promise<number> {
    return await configService.getValue('approval.ceoApprovalThreshold', 100000);
  }

  /**
   * 获取审批超时时间
   */
  async getApprovalTimeoutHours(): Promise<number> {
    return await configService.getValue('approval.timeoutHours', 48);
  }

  /**
   * 判断是否需要进行CEO审批
   */
  async requiresCEOApproval(amount: number): Promise<boolean> {
    const threshold = await this.getCEOApprovalThreshold();
    return amount >= threshold;
  }

  // ... 其他方法中使用配置
}
```

**Step 2: Commit**

```bash
git add backend/src/services/approval.service.ts
git commit -m "feat(approval): 集成系统配置，支持动态审批规则"
```

---

### Task 8: 在考勤模块中集成配置

**Files:**
- Modify: `backend/src/services/attendance.service.ts`

**Step 1: 修改考勤服务使用配置**

```typescript
// 在 attendance.service.ts 中添加配置读取
import { configService } from './config.service';

export class AttendanceService {
  /**
   * 获取工作时间配置
   */
  async getWorkSchedule() {
    const [start, end] = await Promise.all([
      configService.getValue('attendance.workStartTime', '09:00'),
      configService.getValue('attendance.workEndTime', '18:00'),
    ]);
    return { start, end };
  }

  /**
   * 获取迟到早退阈值
   */
  async getThresholds() {
    const [late, early] = await Promise.all([
      configService.getValue('attendance.lateThresholdMinutes', 15),
      configService.getValue('attendance.earlyLeaveThresholdMinutes', 15),
    ]);
    return { late, early };
  }

  /**
   * 判断打卡是否迟到
   */
  async isLate(checkInTime: Date): Promise<boolean> {
    const { start } = await this.getWorkSchedule();
    const { late } = await this.getThresholds();

    const [hours, minutes] = start.split(':').map(Number);
    const workStart = new Date(checkInTime);
    workStart.setHours(hours, minutes, 0, 0);

    const threshold = new Date(workStart.getTime() + late * 60000);
    return checkInTime > threshold;
  }

  // ... 其他方法中使用配置
}
```

**Step 2: Commit**

```bash
git add backend/src/services/attendance.service.ts
git commit -m "feat(attendance): 集成系统配置，支持动态考勤规则"
```

---

### Task 9: 在任务模块中集成配置

**Files:**
- Modify: `backend/src/services/task.service.ts`

**Step 1: 修改任务服务使用配置**

```typescript
// 在 task.service.ts 中添加配置读取
import { configService } from './config.service';

export class TaskService {
  /**
   * 获取任务默认配置
   */
  async getTaskDefaults() {
    const [priority, reminderHours] = await Promise.all([
      configService.getValue('task.defaultPriority', 'medium'),
      configService.getValue('task.reminderBeforeHours', 24),
    ]);
    return { priority, reminderHours };
  }

  /**
   * 创建任务时应用默认配置
   */
  async createTask(data: CreateTaskDTO, userId: string) {
    const defaults = await this.getTaskDefaults();

    const task = await prisma.task.create({
      data: {
        ...data,
        priority: data.priority || defaults.priority,
        reminderAt: data.dueDate
          ? new Date(
              new Date(data.dueDate).getTime() -
                defaults.reminderHours * 60 * 60 * 1000
            )
          : null,
        // ...
      },
    });

    return task;
  }

  // ... 其他方法中使用配置
}
```

**Step 2: Commit**

```bash
git add backend/src/services/task.service.ts
git commit -m "feat(task): 集成系统配置，支持动态任务规则"
```

---

### Task 10: 在文档模块中集成配置

**Files:**
- Modify: `backend/src/routes/documents.ts`

**Step 1: 修改文档路由使用配置**

```typescript
// 在 documents.ts 路由中添加配置验证
import { configService } from '@/services/config.service';

// 上传文件时检查配置
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    // 获取配置
    const [maxSizeMB, allowedTypes, userQuotaMB] = await Promise.all([
      configService.getValue('document.maxFileSizeMB', 50),
      configService.getValue('document.allowedFileTypes', 'pdf,doc,docx,xls,xlsx'),
      configService.getValue('document.userStorageQuotaMB', 1024),
    ]);

    const maxSize = maxSizeMB * 1024 * 1024;
    const allowed = allowedTypes.split(',').map((t) => t.trim().toLowerCase());

    // 验证文件大小
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `文件大小不能超过 ${maxSizeMB}MB`,
        },
      });
    }

    // 验证文件类型
    const ext = req.file.originalname.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext || '')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TYPE_NOT_ALLOWED',
          message: `不允许的文件类型，允许的类型: ${allowedTypes}`,
        },
      });
    }

    // 检查用户存储配额...

    // 继续处理上传...
  } catch (error) {
    // ...
  }
});
```

**Step 2: Commit**

```bash
git add backend/src/routes/documents.ts
git commit -m "feat(document): 集成系统配置，支持动态文档限制"
```

---

## Phase 5: 数据迁移和清理

### Task 11: 创建数据迁移脚本

**Files:**
- Create: `backend/src/scripts/migrate-settings.ts`

**Step 1: 创建迁移脚本**

```typescript
// backend/src/scripts/migrate-settings.ts
import prisma from '@/lib/prisma';
import { configService } from '@/services/config.service';

async function migrateSettings() {
  console.log('开始迁移系统设置...');

  // 1. 检查是否需要迁移
  const oldEmailSettings = await prisma.emailSettings.findFirst();
  const oldSystemSettings = await prisma.systemSettings.findFirst();

  if (!oldEmailSettings && !oldSystemSettings) {
    console.log('没有旧数据需要迁移');
    return;
  }

  // 2. 初始化新配置
  await configService.initializeDefaults();

  // 3. 迁移邮件设置
  if (oldEmailSettings) {
    console.log('迁移邮件设置...');
    const emailConfigs = {
      'email.enabled': oldEmailSettings.enabled,
      'email.smtp.host': oldEmailSettings.smtpHost,
      'email.smtp.port': oldEmailSettings.smtpPort,
      'email.smtp.user': oldEmailSettings.smtpUser,
      'email.smtp.password': oldEmailSettings.smtpPassword,
      'notification.taskReminder': oldEmailSettings.taskReminder,
      'notification.meetingReminder': oldEmailSettings.meetingReminder,
      'notification.approvalReminder': oldEmailSettings.approvalReminder,
    };

    for (const [key, value] of Object.entries(emailConfigs)) {
      await prisma.systemConfig.update({
        where: { key },
        data: { value: String(value) },
      });
    }
  }

  // 4. 迁移系统设置
  if (oldSystemSettings) {
    console.log('迁移系统设置...');
    await prisma.systemConfig.update({
      where: { key: 'backup.autoEnabled' },
      data: { value: String(oldSystemSettings.autoBackupEnabled) },
    });
  }

  // 5. 标记迁移完成
  console.log('设置迁移完成');
  console.log('注意：请手动删除旧的 EmailSettings 和 SystemSettings 表');
}

// 运行迁移
migrateSettings()
  .then(() => {
    console.log('迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
```

**Step 2: Commit**

```bash
git add backend/src/scripts/migrate-settings.ts
git commit -m "feat: 创建设置数据迁移脚本，支持从旧版本迁移数据"
```

---

## Phase 6: 测试和验证

### Task 12: 创建配置服务单元测试

**Files:**
- Create: `backend/src/services/config.service.test.ts`

**Step 1: 编写测试**

```typescript
// backend/src/services/config.service.test.ts
import { ConfigService } from './config.service';
import prisma from '@/lib/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  systemConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  configCategory: {
    findMany: jest.fn(),
  },
  configHistory: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}));

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return enabled categories sorted by order', async () => {
      const mockCategories = [
        { id: '1', code: 'system', name: '系统', sortOrder: 1, isEnabled: true },
        { id: '2', code: 'security', name: '安全', sortOrder: 2, isEnabled: true },
      ];

      (prisma.configCategory.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('system');
      expect(prisma.configCategory.findMany).toHaveBeenCalledWith({
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getValue', () => {
    it('should return parsed boolean value', async () => {
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue({
        key: 'email.enabled',
        value: 'true',
        valueType: 'BOOLEAN',
      });

      const result = await service.getValue('email.enabled');

      expect(result).toBe(true);
    });

    it('should return default value when config not found', async () => {
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getValue('nonexistent', 'default');

      expect(result).toBe('default');
    });
  });

  describe('updateConfig', () => {
    it('should update config and create history', async () => {
      const mockConfig = {
        id: '1',
        key: 'system.name',
        value: 'Old Name',
        valueType: 'STRING',
        isEditable: true,
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (prisma.$transaction as jest.Mock).mockImplementation(async (ops) => {
        for (const op of ops) {
          await op;
        }
      });
      (prisma.systemConfig.update as jest.Mock).mockResolvedValue({
        ...mockConfig,
        value: 'New Name',
      });

      const result = await service.updateConfig(
        'system.name',
        { value: 'New Name' },
        'user-1'
      );

      expect(prisma.systemConfig.update).toHaveBeenCalled();
      expect(prisma.configHistory.create).toHaveBeenCalled();
      expect(result.value).toBe('New Name');
    });

    it('should throw error when config not editable', async () => {
      const mockConfig = {
        key: 'system.version',
        isEditable: false,
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      await expect(
        service.updateConfig('system.version', { value: 'x' }, 'user-1')
      ).rejects.toThrow('该配置项不可编辑');
    });
  });
});
```

**Step 2: Commit**

```bash
git add backend/src/services/config.service.test.ts
git commit -m "test: 添加配置服务单元测试"
```

---

## 实施总结

### 主要变更

1. **数据库模型**: 新增 `ConfigCategory`、`SystemConfig`、`ConfigHistory` 模型
2. **后端服务**: 新增通用配置服务，支持 CRUD、缓存、历史记录
3. **后端控制器**: 新增配置控制器和重构路由
4. **前端组件**: 新增动态配置表单组件
5. **业务集成**: 审批、考勤、任务、文档模块集成配置使用

### 回滚方案

如需回滚：
1. 恢复 `prisma/schema.prisma` 到之前版本
2. 恢复 `backend/src/routes/settings.ts` 到之前版本
3. 删除新创建的文件

### 验证清单

- [ ] 数据库迁移成功
- [ ] 配置分类正确显示
- [ ] 配置值可以更新
- [ ] 配置变更历史记录
- [ ] 各业务模块正确读取配置
- [ ] 旧数据成功迁移

---

**Plan complete and saved to `docs/plans/2025-02-24-system-settings-refactor.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach would you prefer, Darrow哥?**
