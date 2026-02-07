# OA系统数据迁移脚本

## 概述

此脚本用于将OA系统的历史数据从JSON文件迁移到PostgreSQL数据库。

## 文件说明

- `migrate-data.ts` - 主迁移脚本
- `README.md` - 本文档

## 迁移逻辑

### 1. 用户迁移

- **源文件**: `backend/data/users.json`
- **目标表**: `User`
- **处理逻辑**:
  - 读取所有用户数据
  - 检查密码格式：如果已是bcrypt格式（以$2开头）则保留，否则重新加密
  - 映射角色字段到Prisma枚举（admin->ADMIN, user->USER等）
  - 使用upsert操作避免重复插入
  - 建立旧ID到新ID的映射关系

### 2. 申请迁移

- **源文件**: `backend/data/applications.json`
- **目标表**: `Application`及相关表
- **处理逻辑**:
  - 读取所有申请数据
  - 映射状态字符串到Prisma枚举
  - 关联正确的用户ID（通过用户名匹配）
  - 处理审批记录（厂长、总监、经理、CEO审批）
  - 处理附件数据
  - 使用upsert操作避免重复插入

## 执行步骤

### 前提条件

1. 安装PostgreSQL数据库并启动服务
2. 创建数据库 `oa_system`
3. 配置数据库连接字符串

### 步骤1: 配置环境变量

编辑 `backend/.env` 文件，设置正确的数据库连接：

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/oa_system?schema=public"
```

### 步骤2: 创建数据库表

```bash
cd backend
npx prisma migrate dev --name init
```

### 步骤3: 执行数据迁移

```bash
npx tsx scripts/migrate-data.ts
```

## 迁移统计

脚本执行后会输出详细的迁移报告：

- 用户迁移统计（总数、成功、失败、跳过）
- 申请迁移统计（总数、成功、失败、跳过）
- 错误详情（前10条）
- 执行时间

## 错误处理

- 单个记录迁移失败不会中断整个流程
- 错误会被记录并在最后统一报告
- 附件迁移失败仅输出警告，不影响主记录

## 注意事项

1. **重复执行**: 脚本使用upsert操作，可以安全地重复执行
2. **密码处理**: 明文密码会自动使用bcrypt加密
3. **ID映射**: 用户ID会自动映射，申请关联基于用户名
4. **数据验证**: 缺少必需字段的记录会被跳过
