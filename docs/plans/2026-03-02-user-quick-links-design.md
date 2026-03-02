# 用户自定义快捷入口功能设计

## 概述
允许用户自定义 Sidebar 中的「快捷入口」区域，支持添加、删除、排序常用功能链接。

## 数据库设计

### 新增表：UserQuickLink
```prisma
model UserQuickLink {
  id        String   @id @default(cuid())
  userId    String
  name      String   // 显示名称
  path      String   // 路由路径
  icon      String   // Lucide图标名称
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([sortOrder])
  @@map("user_quick_links")
}
```

## API 设计

### 1. 获取用户快捷入口列表
```
GET /api/users/quick-links
```
响应：
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "报销申请",
      "path": "/approval/new?type=reimbursement",
      "icon": "Receipt",
      "sortOrder": 0,
      "isActive": true
    }
  ]
}
```

### 2. 添加快捷入口
```
POST /api/users/quick-links
```
请求体：
```json
{
  "name": "报销申请",
  "path": "/approval/new?type=reimbursement",
  "icon": "Receipt"
}
```

### 3. 更新快捷入口
```
PUT /api/users/quick-links/:id
```
请求体：
```json
{
  "name": "新名称",
  "path": "/new/path",
  "icon": "NewIcon",
  "isActive": true
}
```

### 4. 删除快捷入口
```
DELETE /api/users/quick-links/:id
```

### 5. 批量更新排序
```
PUT /api/users/quick-links/reorder
```
请求体：
```json
{
  "items": [
    { "id": "xxx", "sortOrder": 0 },
    { "id": "yyy", "sortOrder": 1 }
  ]
}
```

## 前端组件设计

### 1. 类型定义
```typescript
interface QuickLink {
  id: string;
  name: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

interface CreateQuickLinkInput {
  name: string;
  path: string;
  icon: string;
}

interface UpdateQuickLinkInput extends Partial<CreateQuickLinkInput> {
  isActive?: boolean;
}
```

### 2. API 服务
```typescript
// services/quickLinkApi.ts
export const quickLinkApi = {
  getQuickLinks: () => api.get('/users/quick-links'),
  createQuickLink: (data: CreateQuickLinkInput) => api.post('/users/quick-links', data),
  updateQuickLink: (id: string, data: UpdateQuickLinkInput) => api.put(`/users/quick-links/${id}`, data),
  deleteQuickLink: (id: string) => api.delete(`/users/quick-links/${id}`),
  reorderQuickLinks: (items: { id: string; sortOrder: number }[]) =>
    api.put('/users/quick-links/reorder', { items }),
};
```

### 3. 系统预定义功能
```typescript
const PREDEFINED_FUNCTIONS = [
  { name: '报销申请', path: '/approval/new?type=reimbursement', icon: 'Receipt' },
  { name: '请假申请', path: '/approval/new?type=leave', icon: 'Calendar' },
  { name: '加班申请', path: '/approval/new?type=overtime', icon: 'Clock' },
  { name: '打卡签到', path: '/attendance/clock-in', icon: 'MapPin' },
  { name: '会议室预订', path: '/meetings/booking', icon: 'Video' },
  { name: '新建任务', path: '/tasks/new', icon: 'PlusSquare' },
  { name: '新建公告', path: '/announcements/new', icon: 'Bell' },
  { name: '设备报修', path: '/equipment/maintenance/records/new', icon: 'Tool' },
  { name: '配件领用', path: '/equipment/parts/usage/new', icon: 'Package' },
];
```

### 4. 设置页面路径
`/settings/quick-links`

## 实现步骤

1. 数据库迁移 - 创建 UserQuickLink 表
2. 后端 API - 实现 CRUD 接口
3. 前端 API 服务 - 封装请求方法
4. 设置页面 - 快捷入口管理界面
5. Sidebar 改造 - 从 API 获取数据
6. 初始化数据 - 新用户默认添加快捷入口

## 注意事项

1. 用户删除账户时级联删除快捷入口配置
2. 限制每个用户最多 10 个快捷入口
3. 路径需要前端路由验证（可选）
4. 图标名称使用 Lucide 图标库
