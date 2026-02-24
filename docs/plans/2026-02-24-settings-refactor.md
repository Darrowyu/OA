# 系统设置重构实施计划

> **目标：** 将 900+ 行的单体 Settings 组件重构为模块化、可扩展的系统设置中心

**架构方案：** 混合式（首页卡片导航 + 子路由详情页）
- 首页展示所有设置分类卡片，快速概览
- 复杂模块（邮件设置、归档管理）有独立子页面
- 新增缺失的系统设置功能

**技术栈：** React + TypeScript + React Router + Tailwind CSS + shadcn/ui

---

## 现状分析

当前 `Settings.tsx` 问题：
- 单文件 887 行，职责过重
- 所有功能平铺展示，视觉混乱
- 缺少常见系统设置（系统信息、日志、备份等）
- 没有子路由，无法直接分享某个设置页链接

---

## 新架构设计

```
/settings                    # 设置首页（卡片导航）
/settings/archive            # 数据归档管理（独立页面）
/settings/email              # 邮件提醒设置（独立页面）
/settings/users              # 用户管理（嵌入或跳转）
/settings/workflow           # 工作流管理（嵌入或跳转）
/settings/system             # 系统信息（新增）
/settings/logs               # 系统日志（新增）
/settings/backup             # 备份恢复（新增）
```

---

## 模块拆分规划

### 目录结构

```
frontend/src/pages/settings/
├── index.tsx                 # 设置首页（路由配置）
├── layout.tsx                # 设置页面布局（侧边导航）
├── components/
│   ├── SettingsCard.tsx      # 设置分类卡片组件
│   ├── ArchiveModule.tsx     # 归档管理模块
│   ├── EmailModule.tsx       # 邮件设置模块
│   ├── SystemInfoModule.tsx  # 系统信息模块
│   ├── LogsModule.tsx        # 日志管理模块
│   └── BackupModule.tsx      # 备份恢复模块
├── hooks/
│   ├── useArchive.ts         # 归档相关逻辑
│   ├── useEmailSettings.ts   # 邮件设置逻辑
│   └── useSystemInfo.ts      # 系统信息逻辑
└── types.ts                  # 类型定义
```

---

## 实施任务清单

### 任务 1：创建类型定义文件

**文件：** `frontend/src/pages/settings/types.ts`

```typescript
// 归档相关类型
export interface ArchiveStats {
  activeCount: number;
  archivedCount: number;
  dbSize: string;
  archivableCount: number;
}

export interface ArchiveFile {
  id: string;
  filename: string;
  createdAt: string;
  size: string;
  recordCount: number;
}

// 邮件设置类型
export interface ReminderInterval {
  initialDelay: number;
  normalInterval: number;
  mediumInterval: number;
  urgentInterval: number;
}

export interface EmailSettings {
  urgent: ReminderInterval;
  medium: ReminderInterval;
  normal: ReminderInterval;
  workdayOnly: boolean;
  workdays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  skipDates: string[];
}

// 系统信息类型
export interface SystemInfo {
  version: string;
  uptime: string;
  nodeVersion: string;
  database: {
    type: string;
    version: string;
    size: string;
  };
  memory: {
    used: string;
    total: string;
  };
}

// 日志类型
export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

// 备份类型
export interface BackupInfo {
  id: string;
  createdAt: string;
  size: string;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed' | 'in_progress';
}
```

**验证：** 类型检查通过

---

### 任务 2：创建设置卡片组件

**文件：** `frontend/src/pages/settings/components/SettingsCard.tsx`

```typescript
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color: string;
  onClick?: () => void;
}

export function SettingsCard({ icon: Icon, title, description, color, onClick }: SettingsCardProps) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
```

**验证：** 组件渲染正常

---

### 任务 3：提取归档管理为独立组件

**文件：** `frontend/src/pages/settings/components/ArchiveModule.tsx`

将现有归档相关逻辑从 Settings.tsx 提取，包含：
- 归档统计显示
- 归档文件列表
- 执行归档操作

**关键代码迁移：**
- `loadArchiveStats` 函数
- `loadArchiveFiles` 函数
- `handleArchive` 函数
- 归档相关状态

**验证：** 归档功能正常

---

### 任务 4：提取邮件设置为独立组件

**文件：** `frontend/src/pages/settings/components/EmailModule.tsx`

将现有邮件设置逻辑提取，包含：
- 按优先级设置提醒间隔
- 工作日和工作时间设置
- 跳过日期管理

**关键代码迁移：**
- `loadEmailSettings` 函数
- `saveEmailSettings` 函数
- `updateInterval` 函数
- 日期管理函数

**验证：** 邮件设置保存正常

---

### 任务 5：创建系统信息模块（新增功能）

**文件：** `frontend/src/pages/settings/components/SystemInfoModule.tsx`

功能：
- 显示系统版本
- 显示数据库信息
- 显示服务器运行时间
- 显示内存使用情况

**API 端点：** `GET /api/settings/system-info`

**验证：** 信息正确显示

---

### 任务 6：创建日志管理模块（新增功能）

**文件：** `frontend/src/pages/settings/components/LogsModule.tsx`

功能：
- 系统日志列表
- 按级别筛选（info/warn/error）
- 按时间范围筛选
- 日志导出

**API 端点：**
- `GET /api/settings/logs`
- `POST /api/settings/logs/export`

**验证：** 日志正确显示和筛选

---

### 任务 7：创建备份恢复模块（新增功能）

**文件：** `frontend/src/pages/settings/components/BackupModule.tsx`

功能：
- 备份列表显示
- 手动创建备份
- 从备份恢复
- 自动备份设置
- 下载备份文件

**API 端点：**
- `GET /api/settings/backups`
- `POST /api/settings/backups`
- `POST /api/settings/backups/:id/restore`
- `GET /api/settings/backups/:id/download`

**验证：** 备份创建和恢复正常

---

### 任务 8：创建设置页面布局

**文件：** `frontend/src/pages/settings/layout.tsx`

包含：
- 左侧导航菜单（各设置模块链接）
- 右侧内容区域
- 面包屑导航

**验证：** 布局正确渲染

---

### 任务 9：重构设置首页

**文件：** `frontend/src/pages/settings/index.tsx`

内容：
- 使用 `SettingsCard` 组件展示各设置分类
- 6 个卡片网格布局：
  1. 数据归档（蓝色）
  2. 邮件提醒（绿色）
  3. 用户管理（紫色）
  4. 工作流管理（橙色）
  5. 系统信息（青色）
  6. 系统日志（红色）
  7. 备份恢复（黄色）

**验证：** 首页正确显示所有卡片

---

### 任务 10：配置路由

**修改文件：** `frontend/src/App.tsx`

添加子路由：
```typescript
<Route path="/settings" element={<SettingsLayout />}>
  <Route index element={<SettingsHome />} />
  <Route path="archive" element={<ArchivePage />} />
  <Route path="email" element={<EmailPage />} />
  <Route path="system" element={<SystemInfoPage />} />
  <Route path="logs" element={<LogsPage />} />
  <Route path="backup" element={<BackupPage />} />
</Route>
```

**验证：** 路由跳转正常

---

### 任务 11：后端 API 开发

**新增文件：**
- `backend/src/routes/settings.ts` - 设置路由
- `backend/src/controllers/settingsController.ts` - 控制器

**新增端点：**
```
GET    /api/settings/system-info    # 系统信息
GET    /api/settings/logs           # 系统日志
POST   /api/settings/logs/export    # 导出日志
GET    /api/settings/backups        # 备份列表
POST   /api/settings/backups        # 创建备份
POST   /api/settings/backups/:id/restore  # 恢复备份
GET    /api/settings/backups/:id/download  # 下载备份
```

**验证：** API 响应正确

---

### 任务 12：清理旧代码

**修改文件：** `frontend/src/pages/Settings.tsx`

- 保留为兼容层或重定向到新路由
- 或完全删除（确保所有引用已更新）

**验证：** 无引用错误

---

## 测试计划

1. **功能测试**
   - 归档管理功能正常
   - 邮件设置保存和加载正常
   - 新功能（系统信息、日志、备份）正常

2. **路由测试**
   - 各子路由访问正常
   - 面包屑导航正确
   - 返回按钮正常

3. **权限测试**
   - 仅管理员可访问
   - 非管理员重定向

4. **性能测试**
   - 首屏加载时间
   - 模块懒加载正常

---

## 提交计划

建议分阶段提交：

1. **阶段 1：** 类型定义 + 基础组件（任务 1-2）
2. **阶段 2：** 模块提取（任务 3-4）
3. **阶段 3：** 新功能开发（任务 5-7）
4. **阶段 4：** 路由和布局（任务 8-10）
5. **阶段 5：** 后端 API（任务 11）
6. **阶段 6：** 清理和优化（任务 12）

---

## 注意事项

1. 保持向后兼容，现有 API 端点不变
2. 所有新组件需要支持加载状态
3. 错误处理需要统一
4. 权限检查在每个子页面都要做
