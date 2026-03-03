# 用户自定义快捷入口功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现用户可自定义的 Sidebar 快捷入口功能，支持增删改查和排序

**Architecture:** 后端使用 Prisma + Express 提供 CRUD API，前端使用 React + TanStack Query 管理状态，Sidebar 组件从 API 动态获取快捷入口列表

**Tech Stack:** Prisma, Express, React, TanStack Query, Lucide React, Framer Motion

---

## 前置检查

确认项目结构：
- 后端：`backend/src/`
- 前端：`frontend/src/`
- Prisma schema：`backend/prisma/schema.prisma`

---

## Task 1: 数据库迁移 - 创建 UserQuickLink 表

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: 在 schema.prisma 中添加 UserQuickLink 模型**

在文件末尾（User 模型之后）添加：

```prisma
model UserQuickLink {
  id        String   @id @default(cuid())
  userId    String
  name      String
  path      String
  icon      String
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

**Step 2: 在 User 模型中添加关联关系**

找到 User 模型，添加：
```prisma
  quickLinks UserQuickLink[]
```

**Step 3: 创建并执行迁移**

```bash
cd backend
npx prisma migrate dev --name add_user_quick_links
```

Expected: 迁移成功，数据库表已创建

**Step 4: 生成 Prisma Client**

```bash
npx prisma generate
```

**Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add UserQuickLink table for user customizable quick links"
```

---

## Task 2: 后端 API - 创建 quickLinks 控制器

**Files:**
- Create: `backend/src/controllers/quickLinks.ts`

**Step 1: 创建控制器文件**

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse, errorResponse } from '../utils/response';

const prisma = new PrismaClient();

const MAX_QUICK_LINKS = 10;

// 获取当前用户的所有快捷入口
export const getQuickLinks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const quickLinks = await prisma.userQuickLink.findMany({
      where: { userId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(res, quickLinks);
  } catch (error) {
    console.error('Get quick links error:', error);
    return errorResponse(res, 'Failed to get quick links', 500);
  }
};

// 创建快捷入口
export const createQuickLink = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { name, path, icon } = req.body;

    if (!name || !path || !icon) {
      return errorResponse(res, 'Name, path and icon are required', 400);
    }

    // 检查数量限制
    const count = await prisma.userQuickLink.count({
      where: { userId },
    });

    if (count >= MAX_QUICK_LINKS) {
      return errorResponse(res, `Maximum ${MAX_QUICK_LINKS} quick links allowed`, 400);
    }

    // 获取最大排序值
    const maxOrder = await prisma.userQuickLink.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
    });

    const quickLink = await prisma.userQuickLink.create({
      data: {
        userId,
        name,
        path,
        icon,
        sortOrder: maxOrder ? maxOrder.sortOrder + 1 : 0,
      },
    });

    return successResponse(res, quickLink, 201);
  } catch (error) {
    console.error('Create quick link error:', error);
    return errorResponse(res, 'Failed to create quick link', 500);
  }
};

// 更新快捷入口
export const updateQuickLink = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { id } = req.params;
    const { name, path, icon, isActive } = req.body;

    // 检查所有权
    const existing = await prisma.userQuickLink.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return errorResponse(res, 'Quick link not found', 404);
    }

    const quickLink = await prisma.userQuickLink.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(path && { path }),
        ...(icon && { icon }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return successResponse(res, quickLink);
  } catch (error) {
    console.error('Update quick link error:', error);
    return errorResponse(res, 'Failed to update quick link', 500);
  }
};

// 删除快捷入口
export const deleteQuickLink = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { id } = req.params;

    // 检查所有权
    const existing = await prisma.userQuickLink.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return errorResponse(res, 'Quick link not found', 404);
    }

    await prisma.userQuickLink.delete({
      where: { id },
    });

    return successResponse(res, null, 204);
  } catch (error) {
    console.error('Delete quick link error:', error);
    return errorResponse(res, 'Failed to delete quick link', 500);
  }
};

// 批量更新排序
export const reorderQuickLinks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { items } = req.body;

    if (!Array.isArray(items)) {
      return errorResponse(res, 'Items array is required', 400);
    }

    // 验证所有项属于当前用户
    const ids = items.map((item) => item.id);
    const userLinks = await prisma.userQuickLink.findMany({
      where: { id: { in: ids }, userId },
    });

    if (userLinks.length !== ids.length) {
      return errorResponse(res, 'Invalid quick link ids', 400);
    }

    // 批量更新
    await prisma.$transaction(
      items.map((item) =>
        prisma.userQuickLink.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return successResponse(res, { message: 'Reorder successful' });
  } catch (error) {
    console.error('Reorder quick links error:', error);
    return errorResponse(res, 'Failed to reorder quick links', 500);
  }
};
```

**Step 2: Commit**

```bash
git add backend/src/controllers/quickLinks.ts
git commit -m "feat(api): add quick links controller with CRUD operations"
```

---

## Task 3: 后端 API - 创建路由

**Files:**
- Create: `backend/src/routes/quickLinks.ts`

**Step 1: 创建路由文件**

```typescript
import { Router } from 'express';
import {
  getQuickLinks,
  createQuickLink,
  updateQuickLink,
  deleteQuickLink,
  reorderQuickLinks,
} from '../controllers/quickLinks';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', getQuickLinks);
router.post('/', createQuickLink);
router.put('/reorder', reorderQuickLinks);
router.put('/:id', updateQuickLink);
router.delete('/:id', deleteQuickLink);

export default router;
```

**Step 2: 在主应用中添加路由**

修改 `backend/src/index.ts`：

在导入区域添加：
```typescript
import quickLinksRoutes from './routes/quickLinks';
```

在路由注册区域添加：
```typescript
app.use('/api/users/quick-links', quickLinksRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/quickLinks.ts backend/src/index.ts
git commit -m "feat(api): add quick links routes"
```

---

## Task 4: 前端 API 服务

**Files:**
- Create: `frontend/src/services/quickLinkApi.ts`

**Step 1: 创建 API 服务**

```typescript
import api from '@/lib/axios';

export interface QuickLink {
  id: string;
  name: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickLinkInput {
  name: string;
  path: string;
  icon: string;
}

export interface UpdateQuickLinkInput {
  name?: string;
  path?: string;
  icon?: string;
  isActive?: boolean;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

export const quickLinkApi = {
  getQuickLinks: async (): Promise<QuickLink[]> => {
    const response = await api.get('/users/quick-links');
    return response.data.data;
  },

  createQuickLink: async (data: CreateQuickLinkInput): Promise<QuickLink> => {
    const response = await api.post('/users/quick-links', data);
    return response.data.data;
  },

  updateQuickLink: async (id: string, data: UpdateQuickLinkInput): Promise<QuickLink> => {
    const response = await api.put(`/users/quick-links/${id}`, data);
    return response.data.data;
  },

  deleteQuickLink: async (id: string): Promise<void> => {
    await api.delete(`/users/quick-links/${id}`);
  },

  reorderQuickLinks: async (items: ReorderItem[]): Promise<void> => {
    await api.put('/users/quick-links/reorder', { items });
  },
};
```

**Step 2: Commit**

```bash
git add frontend/src/services/quickLinkApi.ts
git commit -m "feat(frontend): add quick links API service"
```

---

## Task 5: 前端 - 创建快捷入口设置页面

**Files:**
- Create: `frontend/src/pages/settings/QuickLinksSettings.tsx`

**Step 1: 创建设置页面组件**

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { quickLinkApi, type QuickLink, type CreateQuickLinkInput } from '@/services/quickLinkApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { iconMap } from '@/components/Sidebar/iconMap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 预定义功能列表
const PREDEFINED_FUNCTIONS = [
  { name: '报销申请', path: '/approval/new?type=reimbursement', icon: 'Receipt' },
  { name: '请假申请', path: '/approval/new?type=leave', icon: 'Calendar' },
  { name: '加班申请', path: '/approval/new?type=overtime', icon: 'Clock' },
  { name: '打卡签到', path: '/attendance/clock-in', icon: 'MapPin' },
  { name: '会议室预订', path: '/meetings/booking', icon: 'Video' },
  { name: '新建任务', path: '/tasks/new', icon: 'PlusSquare' },
  { name: '新建公告', path: '/announcements/new', icon: 'Bell' },
  { name: '设备报修', path: '/equipment/maintenance/records/new', icon: 'Wrench' },
  { name: '配件领用', path: '/equipment/parts/usage/new', icon: 'Package' },
  { name: '文档中心', path: '/documents', icon: 'FolderOpen' },
  { name: '报表中心', path: '/reports', icon: 'BarChart3' },
  { name: '通讯录', path: '/contacts', icon: 'Users' },
];

// 可用图标列表
const AVAILABLE_ICONS = Object.keys(iconMap);

export default function QuickLinksSettings() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateQuickLinkInput>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState<CreateQuickLinkInput>({
    name: '',
    path: '',
    icon: 'Link',
  });

  const { data: quickLinks = [], isLoading } = useQuery({
    queryKey: ['quickLinks'],
    queryFn: quickLinkApi.getQuickLinks,
  });

  const createMutation = useMutation({
    mutationFn: quickLinkApi.createQuickLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
      toast.success('快捷入口已添加');
      setIsAddDialogOpen(false);
      setNewLink({ name: '', path: '', icon: 'Link' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || '添加失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateQuickLinkInput> }) =>
      quickLinkApi.updateQuickLink(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
      toast.success('快捷入口已更新');
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: quickLinkApi.deleteQuickLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
      toast.success('快捷入口已删除');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || '删除失败');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: quickLinkApi.reorderQuickLinks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || '排序失败');
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(quickLinks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    reorderMutation.mutate(updatedItems);
  };

  const handleEdit = (link: QuickLink) => {
    setEditingId(link.id);
    setEditForm({
      name: link.name,
      path: link.path,
      icon: link.icon,
    });
  };

  const handleSaveEdit = (id: string) => {
    if (editForm.name && editForm.path && editForm.icon) {
      updateMutation.mutate({ id, data: editForm });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handlePredefinedSelect = (value: string) => {
    const predefined = PREDEFINED_FUNCTIONS.find((f) => f.name === value);
    if (predefined) {
      setNewLink({
        name: predefined.name,
        path: predefined.path,
        icon: predefined.icon,
      });
    }
  };

  const handleCreate = () => {
    if (newLink.name && newLink.path && newLink.icon) {
      createMutation.mutate(newLink);
    }
  };

  const renderIcon = (iconName: string) => {
    const Icon = iconMap[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  if (isLoading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">快捷入口设置</h1>
          <p className="text-gray-500 mt-1">自定义侧边栏快捷入口，最多可添加 10 个</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={quickLinks.length >= 10}>
              <Plus className="h-4 w-4 mr-2" />
              添加快捷入口
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加快捷入口</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">选择常用功能</label>
                <Select onValueChange={handlePredefinedSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择预设功能或自定义" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_FUNCTIONS.map((func) => (
                      <SelectItem key={func.path} value={func.name}>
                        {func.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">名称</label>
                <Input
                  value={newLink.name}
                  onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  placeholder="显示名称"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">路径</label>
                <Input
                  value={newLink.path}
                  onChange={(e) => setNewLink({ ...newLink, path: e.target.value })}
                  placeholder="例如：/approval/new"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">图标</label>
                <Select
                  value={newLink.icon}
                  onValueChange={(value) => setNewLink({ ...newLink, icon: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {iconMap[icon] && iconMap[icon]({ className: 'h-4 w-4' })}
                          {icon}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newLink.name || !newLink.path || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? '添加中...' : '添加'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>我的快捷入口 ({quickLinks.length}/10)</CardTitle>
        </CardHeader>
        <CardContent>
          {quickLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无快捷入口，点击右上角添加
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="quickLinks">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerref} className="space-y-2">
                    {quickLinks.map((link, index) => (
                      <Draggable key={link.id} draggableId={link.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerref}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              snapshot.isDragging ? 'bg-gray-50 shadow-lg' : 'bg-white'
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="flex-shrink-0 text-gray-600">
                              {renderIcon(link.icon)}
                            </div>
                            {editingId === link.id ? (
                              <>
                                <Input
                                  value={editForm.name || ''}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, name: e.target.value })
                                  }
                                  className="flex-1"
                                />
                                <Input
                                  value={editForm.path || ''}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, path: e.target.value })
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(link.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <div className="font-medium">{link.name}</div>
                                  <div className="text-sm text-gray-500">{link.path}</div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(link)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(link.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: 添加路由**

修改 `frontend/src/routes/index.tsx`（或其他路由配置文件），添加：

```typescript
import QuickLinksSettings from '@/pages/settings/QuickLinksSettings';

// 在 settings 路由中添加
{
  path: 'quick-links',
  element: <QuickLinksSettings />,
}
```

**Step 3: 在设置菜单中添加入口**

修改 `frontend/src/pages/settings/SettingsLayout.tsx`（或类似文件），在设置侧边栏添加：

```typescript
{
  name: '快捷入口',
  path: '/settings/quick-links',
  icon: 'Zap',
}
```

**Step 4: Commit**

```bash
git add frontend/src/pages/settings/QuickLinksSettings.tsx frontend/src/routes/
git commit -m "feat(settings): add quick links settings page with drag-drop reorder"
```

---

## Task 6: 改造 Sidebar 组件

**Files:**
- Modify: `frontend/src/components/Sidebar/Sidebar.tsx`

**Step 1: 修改 Sidebar.tsx 获取动态快捷入口**

在文件顶部添加导入：
```typescript
import { useQuery } from '@tanstack/react-query';
import { quickLinkApi } from '@/services/quickLinkApi';
```

替换原有的 `favouriteItems` 定义（第 151-158 行）：

```typescript
// 获取用户快捷入口
const { data: quickLinks = [] } = useQuery({
  queryKey: ['quickLinks'],
  queryFn: quickLinkApi.getQuickLinks,
});

// 转换为 NavItem 格式
const favouriteItems: NavItemType[] = useMemo(() => {
  return quickLinks.map((link) => ({
    path: link.path,
    name: link.name,
    icon: link.icon,
    show: link.isActive,
  }));
}, [quickLinks]);
```

**Step 2: 为 NavSection 添加空状态处理**

当快捷入口为空时，不显示该区域。NavSection 组件会自动处理（当 items 为空时返回 null）。

**Step 3: Commit**

```bash
git add frontend/src/components/Sidebar/Sidebar.tsx
git commit -m "feat(sidebar): fetch quick links from API instead of hardcoded"
```

---

## Task 7: 添加图标映射

**Files:**
- Create: `frontend/src/components/Sidebar/iconMap.ts`

**Step 1: 创建图标映射文件**

```typescript
import {
  LayoutGrid,
  KanbanSquare,
  FolderOpen,
  Users,
  Bell,
  FileCheck,
  List,
  Plus,
  CheckCircle,
  Monitor,
  Gauge,
  Zap,
  Calendar,
  Clock,
  Video,
  BarChart3,
  Settings,
  HelpCircle,
  Settings2,
  Receipt,
  PlusSquare,
  MapPin,
  Wrench,
  Package,
  Trash2,
  RefreshCcw,
  ClipboardList,
  FileText,
  Link,
  type LucideIcon,
} from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  KanbanSquare,
  FolderOpen,
  Users,
  Bell,
  FileCheck,
  List,
  Plus,
  CheckCircle,
  Monitor,
  Gauge,
  Zap,
  Calendar,
  Clock,
  Video,
  BarChart3,
  Settings,
  HelpCircle,
  Settings2,
  Receipt,
  PlusSquare,
  MapPin,
  Wrench,
  Package,
  Trash2,
  RefreshCcw,
  ClipboardList,
  FileText,
  Link,
};

export default iconMap;
```

**Step 2: 修改 NavItem 组件使用 iconMap**

修改 `frontend/src/components/Sidebar/NavItem.tsx`：

```typescript
import { iconMap } from './iconMap';

// 在组件中
const Icon = iconMap[item.icon];
```

**Step 3: Commit**

```bash
git add frontend/src/components/Sidebar/iconMap.ts frontend/src/components/Sidebar/NavItem.tsx
git commit -m "feat(sidebar): add icon map for dynamic icon rendering"
```

---

## Task 8: 安装依赖

**Files:**
- N/A

**Step 1: 安装拖拽排序库**

```bash
cd frontend
npm install @hello-pangea/dnd
```

**Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(deps): add @hello-pangea/dnd for drag-drop functionality"
```

---

## Task 9: 初始化数据

**Files:**
- Modify: `backend/src/controllers/auth.ts`

**Step 1: 用户注册时添加快捷入口初始化**

找到用户注册逻辑，在创建用户后添加默认快捷入口：

```typescript
// 创建默认快捷入口
await prisma.userQuickLink.createMany({
  data: [
    { userId: user.id, name: '报销申请', path: '/approval/new?type=reimbursement', icon: 'Receipt', sortOrder: 0 },
    { userId: user.id, name: '请假申请', path: '/approval/new?type=leave', icon: 'Calendar', sortOrder: 1 },
  ],
});
```

**Step 2: Commit**

```bash
git add backend/src/controllers/auth.ts
git commit -m "feat(auth): initialize default quick links for new users"
```

---

## Task 10: 运行测试

**Files:**
- N/A

**Step 1: 启动后端服务**

```bash
cd backend
npm run dev
```

**Step 2: 启动前端服务**

```bash
cd frontend
npm run dev
```

**Step 3: 功能验证清单**

- [ ] 侧边栏显示用户快捷入口
- [ ] 进入设置-快捷入口页面
- [ ] 添加新的快捷入口
- [ ] 拖拽排序
- [ ] 编辑快捷入口
- [ ] 删除快捷入口
- [ ] 新用户注册时有默认快捷入口

---

## 完成总结

实现完成后，用户将能够：
1. 在侧边栏看到自定义的快捷入口
2. 在设置页面管理快捷入口
3. 添加、删除、编辑、排序快捷入口
4. 从预定义功能快速选择
