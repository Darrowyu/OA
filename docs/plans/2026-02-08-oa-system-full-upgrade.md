# OA系统全面升级实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 完善OA系统的所有核心功能模块，将5个占位页面实现为完整功能，并添加组织架构、消息通知、日志审计等关键模块

**Architecture:** 采用模块化设计，每个功能模块独立开发，使用Prisma ORM统一数据层，前后端分离架构，WebSocket实现实时通知

**Tech Stack:** React + TypeScript + Node.js + Express + Prisma + PostgreSQL + Socket.io + shadcn/ui

---

## 模块列表（按优先级排序）

### 阶段一：基础设施
- [ ] Task 1.1: 日志审计系统
- [ ] Task 1.2: 消息通知中心（WebSocket）
- [ ] Task 1.3: 组织架构管理

### 阶段二：核心功能
- [ ] Task 2.1: 考勤管理模块
- [ ] Task 2.2: 文档中心模块
- [ ] Task 2.3: 日程管理模块

### 阶段三：协作功能
- [ ] Task 3.1: 通讯录模块
- [ ] Task 3.2: 公告通知模块
- [ ] Task 3.3: 会议管理模块
- [ ] Task 3.4: 任务管理模块

### 阶段四：高级功能
- [ ] Task 4.1: 报表与数据分析
- [ ] Task 4.2: 知识库/帮助中心
- [ ] Task 4.3: 工作流设计器

---

## Task 1.1: 日志审计系统

**Files:**
- Create: `backend/prisma/migrations/add_audit_logs.sql`
- Create: `backend/src/models/auditLog.ts`
- Create: `backend/src/services/auditService.ts`
- Create: `backend/src/middleware/auditMiddleware.ts`
- Create: `backend/src/routes/audit.ts`
- Create: `backend/src/controllers/auditController.ts`
- Create: `frontend/src/services/audit.ts`
- Create: `frontend/src/pages/admin/AuditLogs.tsx`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/index.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: 数据库模型设计**

Add to `backend/prisma/schema.prisma`:
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  entityType  String   // User, Application, Equipment, etc.
  entityId    String?
  oldValues   Json?
  newValues   Json?
  ipAddress   String?
  userAgent   String?
  description String?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([action])
  @@index([entityType])
  @@index([createdAt])
  @@map("audit_logs")
}
```

**Step 2: 创建审计日志服务层**

Create `backend/src/services/auditService.ts`:
```typescript
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

interface AuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        ...data,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
      },
    });
    return log;
  } catch (error) {
    logger.error('创建审计日志失败', { error, data });
    // 审计日志失败不应影响主业务流程
    return null;
  }
}

export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}) {
  const { userId, action, entityType, startDate, endDate, page = 1, pageSize = 20 } = params;

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAuditStats(startDate: Date, endDate: Date) {
  const [actionStats, entityStats, dailyStats] = await Promise.all([
    // 按操作类型统计
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: { action: true },
    }),
    // 按实体类型统计
    prisma.auditLog.groupBy({
      by: ['entityType'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: { entityType: true },
    }),
    // 按天统计
    prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `,
  ]);

  return { actionStats, entityStats, dailyStats };
}
```

**Step 3: 创建审计中间件**

Create `backend/src/middleware/auditMiddleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '../services/auditService';

// 自动审计中间件
export function auditMiddleware(action: string, entityType: string, getEntityId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    // 保存原始请求体用于对比
    const oldValues = req.body;

    res.json = function(body: any) {
      // 恢复原始方法
      res.json = originalJson;

      // 异步记录审计日志
      if (userId) {
        createAuditLog({
          userId,
          action,
          entityType,
          entityId: getEntityId ? getEntityId(req) : req.params.id,
          newValues: body?.data || body,
          ipAddress,
          userAgent,
          description: `${action} ${entityType}`,
        }).catch(console.error);
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

// 登录审计
export async function auditLogin(req: Request, userId: string, success: boolean) {
  await createAuditLog({
    userId,
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    entityType: 'User',
    entityId: userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    description: success ? '用户登录成功' : '用户登录失败',
  });
}

// 登出审计
export async function auditLogout(req: Request, userId: string) {
  await createAuditLog({
    userId,
    action: 'LOGOUT',
    entityType: 'User',
    entityId: userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    description: '用户登出',
  });
}
```

**Step 4: 创建审计日志路由和控制器**

Create `backend/src/routes/audit.ts`:
```typescript
import { Router } from 'express';
import * as auditController from '../controllers/auditController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/logs', auditController.getLogs);
router.get('/stats', auditController.getStats);
router.get('/actions', auditController.getActions);
router.get('/entity-types', auditController.getEntityTypes);

export default router;
```

Create `backend/src/controllers/auditController.ts`:
```typescript
import { Request, Response } from 'express';
import * as auditService from '../services/auditService';

export async function getLogs(req: Request, res: Response) {
  const { userId, action, entityType, startDate, endDate, page, pageSize } = req.query;

  const result = await auditService.getAuditLogs({
    userId: userId as string,
    action: action as string,
    entityType: entityType as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });

  res.json({ success: true, data: result });
}

export async function getStats(req: Request, res: Response) {
  const { startDate, endDate } = req.query;

  const stats = await auditService.getAuditStats(
    startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate ? new Date(endDate as string) : new Date()
  );

  res.json({ success: true, data: stats });
}

export async function getActions(req: Request, res: Response) {
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'EXPORT', 'APPROVE', 'REJECT'];
  res.json({ success: true, data: actions });
}

export async function getEntityTypes(req: Request, res: Response) {
  const types = ['User', 'Application', 'Equipment', 'Part', 'Department', 'Setting'];
  res.json({ success: true, data: types });
}
```

**Step 5: 前端审计日志页面**

Create `frontend/src/pages/admin/AuditLogs.tsx`（完整页面实现，使用Table组件、筛选器、分页）

**Step 6: 注册路由和集成**

Modify `backend/src/index.ts`:
```typescript
import auditRoutes from './routes/audit';
app.use('/api/audit', auditRoutes);
```

**Step 7: 数据库迁移**

Run: `npm run db:migrate`

**Step 8: 在关键操作处添加审计**

Modify controllers to use audit middleware:
```typescript
// 示例：在审批控制器中使用
import { auditMiddleware } from '../middleware/auditMiddleware';

router.post('/:id/approve', authenticate, auditMiddleware('APPROVE', 'Application'), approveApplication);
```

---

## Task 1.2: 消息通知中心（WebSocket）

**Files:**
- Create: `backend/src/services/notificationService.ts`
- Create: `backend/src/services/socketService.ts`
- Create: `backend/src/routes/notifications.ts`
- Create: `backend/src/controllers/notificationController.ts`
- Create: `backend/prisma/migrations/add_notifications.sql`
- Create: `frontend/src/services/notifications.ts`
- Create: `frontend/src/hooks/useNotifications.ts`
- Create: `frontend/src/components/NotificationBell.tsx`
- Create: `frontend/src/components/NotificationPanel.tsx`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/index.ts`
- Modify: `frontend/src/components/Header.tsx`

**Step 1: 数据库模型**

Add to `backend/prisma/schema.prisma`:
```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String
  type        String   // APPROVAL, SYSTEM, MESSAGE, etc.
  title       String
  content     String
  data        Json?    // 关联数据
  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

**Step 2: Socket.io 服务**

Create `backend/src/services/socketService.ts`:
```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';

let io: Server;

export function initializeSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // 认证中间件
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected: ${userId}`);

    // 加入用户专属房间
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// 发送通知给特定用户
export function sendNotificationToUser(userId: string, notification: any) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

// 发送通知给多个用户
export function sendNotificationToUsers(userIds: string[], notification: any) {
  if (io) {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('notification', notification);
    });
  }
}

// 广播给所有用户
export function broadcastNotification(notification: any) {
  if (io) {
    io.emit('notification', notification);
  }
}
```

**Step 3: 通知服务层**

Create `backend/src/services/notificationService.ts`:
```typescript
import { prisma } from '../lib/prisma';
import { sendNotificationToUser } from './socketService';

interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  sendRealtime?: boolean;
}

export async function createNotification(data: CreateNotificationData) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      data: data.data || null,
    },
  });

  // 实时推送
  if (data.sendRealtime !== false) {
    sendNotificationToUser(data.userId, notification);
  }

  return notification;
}

export async function getUserNotifications(userId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
  const { unreadOnly, limit = 50 } = options;

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function deleteNotification(notificationId: string, userId: string) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

// 批量创建通知
export async function createNotificationsForUsers(data: Omit<CreateNotificationData, 'userId'> & { userIds: string[] }) {
  const { userIds, ...notificationData } = data;

  const notifications = await Promise.all(
    userIds.map(userId =>
      createNotification({
        ...notificationData,
        userId,
      })
    )
  );

  return notifications;
}
```

**Step 4: 前端通知组件**

Create `frontend/src/components/NotificationBell.tsx` 和 `NotificationPanel.tsx`
Create `frontend/src/hooks/useNotifications.ts` - WebSocket连接管理

**Step 5: 集成到审批流程**

Modify `backend/src/services/applicationService.ts`:
- 审批提交时通知审批人
- 审批完成时通知申请人

---

## Task 1.3: 组织架构管理

**Files:**
- Create: `backend/src/services/departmentService.ts`
- Create: `backend/src/routes/departments.ts`
- Create: `backend/src/controllers/departmentController.ts`
- Create: `frontend/src/services/department.ts`
- Create: `frontend/src/pages/admin/Departments.tsx`
- Create: `frontend/src/components/DepartmentTree.tsx`
- Modify: `backend/prisma/schema.prisma`
- Modify: `frontend/src/App.tsx`

**Step 1: 数据库模型**

Modify `backend/prisma/schema.prisma`:
```prisma
model Department {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  parentId    String?
  level       Int      @default(1)
  sortOrder   Int      @default(0)
  managerId   String?
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  parent      Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children    Department[] @relation("DepartmentHierarchy")
  users       User[]
  manager     User?        @relation(fields: [managerId], references: [id], name: "DepartmentManager")

  @@index([parentId])
  @@index([code])
  @@index([isActive])
  @@map("departments")
}

// 更新User模型添加department关联
model User {
  // ... existing fields
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
  managedDepartments Department[] @relation(name: "DepartmentManager")
}
```

**Step 2: 部门服务层**

Create `backend/src/services/departmentService.ts`:
```typescript
import { prisma } from '../lib/prisma';

export async function getDepartmentTree() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
  });

  // 构建树形结构
  const buildTree = (parentId: string | null = null): any[] => {
    return departments
      .filter(d => d.parentId === parentId)
      .map(d => ({
        ...d,
        children: buildTree(d.id),
      }));
  };

  return buildTree();
}

export async function getDepartmentById(id: string) {
  return prisma.department.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      users: {
        select: { id: true, name: true, position: true },
        where: { isActive: true },
      },
    },
  });
}

export async function createDepartment(data: {
  name: string;
  code: string;
  parentId?: string;
  managerId?: string;
  description?: string;
}) {
  // 计算层级
  let level = 1;
  if (data.parentId) {
    const parent = await prisma.department.findUnique({
      where: { id: data.parentId },
      select: { level: true },
    });
    if (parent) {
      level = parent.level + 1;
    }
  }

  return prisma.department.create({
    data: {
      ...data,
      level,
    },
  });
}

export async function updateDepartment(id: string, data: {
  name?: string;
  code?: string;
  parentId?: string;
  managerId?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  // 如果更换了父部门，需要更新层级
  let level: number | undefined;
  if (data.parentId !== undefined) {
    if (data.parentId === null) {
      level = 1;
    } else {
      const parent = await prisma.department.findUnique({
        where: { id: data.parentId },
        select: { level: true },
      });
      level = parent ? parent.level + 1 : 1;
    }
  }

  return prisma.department.update({
    where: { id },
    data: level !== undefined ? { ...data, level } : data,
  });
}

export async function deleteDepartment(id: string) {
  // 检查是否有子部门
  const children = await prisma.department.count({ where: { parentId: id } });
  if (children > 0) {
    throw new Error('该部门下有子部门，无法删除');
  }

  // 检查是否有用户
  const users = await prisma.user.count({ where: { departmentId: id } });
  if (users > 0) {
    throw new Error('该部门下有员工，无法删除');
  }

  return prisma.department.delete({ where: { id } });
}

export async function getDepartmentUsers(departmentId: string) {
  return prisma.user.findMany({
    where: { departmentId, isActive: true },
    select: { id: true, name: true, username: true, position: true, email: true },
    orderBy: { name: 'asc' },
  });
}
```

**Step 3: 前端部门管理页面**

Create `frontend/src/pages/admin/Departments.tsx` - 部门树形管理界面
Create `frontend/src/components/DepartmentTree.tsx` - 递归树形组件

---

## Task 2.1: 考勤管理模块

**功能点：**
1. 打卡记录（GPS定位、WiFi打卡）
2. 排班管理
3. 请假/加班/出差申请
4. 考勤统计报表
5. 与审批流程联动

**Files:**
- Create: `backend/prisma/migrations/add_attendance.sql`
- Create: `backend/src/services/attendanceService.ts`
- Create: `backend/src/services/scheduleService.ts`
- Create: `backend/src/routes/attendance.ts`
- Create: `backend/src/controllers/attendanceController.ts`
- Create: `frontend/src/pages/attendance/index.tsx`
- Create: `frontend/src/pages/attendance/ClockIn.tsx`
- Create: `frontend/src/pages/attendance/Schedule.tsx`
- Create: `frontend/src/pages/attendance/LeaveRequest.tsx`
- Create: `frontend/src/pages/attendance/Statistics.tsx`
- Modify: `backend/prisma/schema.prisma`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

**数据库模型：**
```prisma
model AttendanceRecord {
  id          String   @id @default(uuid())
  userId      String
  date        DateTime
  clockIn     DateTime?
  clockOut    DateTime?
  clockInLocation Json?  // { lat, lng, address }
  clockOutLocation Json?
  clockInType String   // GPS, WIFI, MANUAL
  clockOutType String?
  status      String   // NORMAL, LATE, EARLY_LEAVE, ABSENT
  workHours   Float?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
  @@map("attendance_records")
}

model Schedule {
  id          String   @id @default(uuid())
  userId      String
  date        DateTime
  shiftId     String
  isRestDay   Boolean  @default(false)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
  shift       Shift    @relation(fields: [shiftId], references: [id])

  @@unique([userId, date])
  @@map("schedules")
}

model Shift {
  id          String   @id @default(uuid())
  name        String
  startTime   String   // "09:00"
  endTime     String   // "18:00"
  breakTime   Int      // 分钟
  color       String?
  isActive    Boolean  @default(true)
  schedules   Schedule[]

  @@map("shifts")
}

model LeaveRequest {
  id          String   @id @default(uuid())
  userId      String
  type        String   // ANNUAL, SICK, PERSONAL, etc.
  startDate   DateTime
  endDate     DateTime
  days        Float
  reason      String
  status      String   @default("PENDING") // PENDING, APPROVED, REJECTED
  approverId  String?
  approvedAt  DateTime?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
  @@map("leave_requests")
}
```

---

## Task 2.2: 文档中心模块

**功能点：**
1. 文件夹权限管理
2. 文档版本控制
3. 在线预览（PDF/Office）
4. 文档审批流程
5. 全文搜索

**Files:**
- Create: `backend/src/services/documentService.ts`
- Create: `backend/src/routes/documents.ts`
- Create: `backend/src/controllers/documentController.ts`
- Create: `frontend/src/pages/documents/index.tsx`
- Create: `frontend/src/pages/documents/DocumentViewer.tsx`
- Create: `frontend/src/pages/documents/FolderManager.tsx`
- Modify: `backend/prisma/schema.prisma`

**数据库模型：**
```prisma
model DocumentFolder {
  id          String   @id @default(uuid())
  name        String
  parentId    String?
  ownerId     String
  permissions Json?    // { read: ['role1'], write: ['role2'] }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  parent      DocumentFolder? @relation("FolderHierarchy", fields: [parentId], references: [id])
  children    DocumentFolder[] @relation("FolderHierarchy")
  documents   Document[]
  owner       User     @relation(fields: [ownerId], references: [id])

  @@map("document_folders")
}

model Document {
  id          String   @id @default(uuid())
  folderId    String
  name        String
  type        String   // PDF, DOC, XLS, etc.
  size        Int
  path        String   // 存储路径
  version     Int      @default(1)
  ownerId     String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  folder      DocumentFolder @relation(fields: [folderId], references: [id])
  owner       User     @relation(fields: [ownerId], references: [id])
  versions    DocumentVersion[]

  @@index([folderId])
  @@index([ownerId])
  @@map("documents")
}

model DocumentVersion {
  id          String   @id @default(uuid())
  documentId  String
  version     Int
  path        String
  size        Int
  createdBy   String
  createdAt   DateTime @default(now())

  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("document_versions")
}
```

---

## Task 2.3: 日程管理模块

**功能点：**
1. 个人/团队日程
2. 会议邀请
3. 日程提醒
4. 与审批、会议联动
5. 日历视图（日/周/月）

**Files:**
- Create: `backend/src/services/calendarService.ts`
- Create: `backend/src/routes/calendar.ts`
- Create: `frontend/src/pages/schedule/index.tsx`
- Create: `frontend/src/components/CalendarView.tsx`
- Modify: `backend/prisma/schema.prisma`

**数据库模型：**
```prisma
model CalendarEvent {
  id          String   @id @default(uuid())
  userId      String
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  type        String   // MEETING, TASK, REMINDER, etc.
  isAllDay    Boolean  @default(false)
  recurrence  String?  // 重复规则
  attendees   Json?    // [{ userId, status }]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([startTime])
  @@map("calendar_events")
}
```

---

## Task 3.1: 通讯录模块

**功能点：**
1. 组织架构树展示
2. 员工信息详情
3. 快速搜索
4. 导出通讯录
5. 个人二维码名片

**Files:**
- Create: `frontend/src/pages/contacts/index.tsx`
- Create: `frontend/src/components/ContactCard.tsx`
- Create: `frontend/src/components/OrgTree.tsx`
- Modify: `backend/src/routes/users.ts`

---

## Task 3.2: 公告通知模块

**功能点：**
1. 公告发布（富文本编辑器）
2. 置顶/有效期设置
3. 已读/未读统计
4. 附件上传
5. 分类管理

**Files:**
- Create: `backend/src/services/announcementService.ts`
- Create: `backend/src/routes/announcements.ts`
- Create: `frontend/src/pages/announcements/index.tsx`
- Create: `frontend/src/pages/announcements/AnnouncementDetail.tsx`
- Modify: `backend/prisma/schema.prisma`

**数据库模型：**
```prisma
model Announcement {
  id          String   @id @default(uuid())
  title       String
  content     String
  type        String   // COMPANY, DEPARTMENT, SYSTEM
  targetDepts Json?    // 目标部门ID数组
  isTop       Boolean  @default(false)
  validFrom   DateTime
  validUntil  DateTime?
  attachments Json?
  viewCount   Int      @default(0)
  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author      User     @relation(fields: [authorId], references: [id])
  reads       AnnouncementRead[]

  @@index([type])
  @@index([isTop])
  @@index([validFrom])
  @@map("announcements")
}

model AnnouncementRead {
  id              String   @id @default(uuid())
  announcementId  String
  userId          String
  readAt          DateTime @default(now())

  announcement    Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@unique([announcementId, userId])
  @@map("announcement_reads")
}
```

---

## Task 3.3: 会议管理模块

**功能点：**
1. 会议室预订
2. 会议邀请/提醒
3. 会议纪要
4. 与日程联动
5. 会议资源管理

**Files:**
- Create: `backend/src/services/meetingService.ts`
- Create: `backend/src/routes/meetings.ts`
- Create: `frontend/src/pages/meetings/index.tsx`
- Create: `frontend/src/pages/meetings/RoomBooking.tsx`
- Modify: `backend/prisma/schema.prisma`

---

## Task 3.4: 任务管理模块

**功能点：**
1. 个人/团队任务
2. 任务看板（Kanban）
3. 任务提醒
4. 甘特图
5. 任务关联审批

**Files:**
- Create: `backend/src/services/taskService.ts`
- Create: `backend/src/routes/tasks.ts`
- Create: `frontend/src/pages/tasks/index.tsx`
- Create: `frontend/src/components/KanbanBoard.tsx`
- Create: `frontend/src/components/GanttChart.tsx`
- Modify: `backend/prisma/schema.prisma`

---

## Task 4.1: 报表与数据分析

**功能点：**
1. 审批效率分析
2. 设备利用率报表
3. 人员绩效仪表板
4. 考勤统计报表
5. 自定义报表设计器

**Files:**
- Create: `backend/src/services/reportService.ts`
- Create: `backend/src/routes/reports.ts`
- Create: `frontend/src/pages/reports/index.tsx`
- Create: `frontend/src/components/DashboardWidgets.tsx`
- Create: `frontend/src/components/ReportBuilder.tsx`

---

## Task 4.2: 知识库/帮助中心

**功能点：**
1. FAQ管理
2. 操作手册
3. 培训资料
4. 全文检索
5. 文章分类/标签

**Files:**
- Create: `backend/src/services/knowledgeService.ts`
- Create: `backend/src/routes/knowledge.ts`
- Create: `frontend/src/pages/knowledge/index.tsx`
- Create: `frontend/src/pages/knowledge/ArticleView.tsx`

---

## Task 4.3: 工作流设计器

**功能点：**
1. 拖拽式流程设计
2. 条件分支配置
3. 会签/或签设置
4. 流程版本管理
5. 流程模拟测试

**Files:**
- Create: `frontend/src/pages/workflow/index.tsx`
- Create: `frontend/src/components/WorkflowDesigner.tsx`
- Create: `frontend/src/components/FlowNode.tsx`
- Create: `frontend/src/components/FlowEdge.tsx`

---

## 执行建议

### 子代理分配策略

**子代理1：基础设施（Task 1.1-1.3）**
- 日志审计系统
- 消息通知中心
- 组织架构管理

**子代理2：核心功能（Task 2.1-2.3）**
- 考勤管理
- 文档中心
- 日程管理

**子代理3：协作功能（Task 3.1-3.4）**
- 通讯录
- 公告通知
- 会议管理
- 任务管理

**子代理4：高级功能（Task 4.1-4.3）**
- 报表与数据分析
- 知识库
- 工作流设计器

### 依赖关系

```
基础设施 (1.x)
    ↓
核心功能 (2.x)
    ↓
协作功能 (3.x)
    ↓
高级功能 (4.x)
```

### 数据库迁移策略

每个Task完成后执行：
1. 更新 `prisma/schema.prisma`
2. 运行 `npm run db:migrate`
3. 运行 `npm run db:seed`（如有需要）

### 测试策略

每个模块完成后：
1. 运行 `npm run type-check`
2. 运行 `npm run lint`
3. 手动测试主要功能路径
4. 提交并推送代码

---

## 完成标准

✅ **阶段一完成：** 系统管理员可以查看操作日志、用户收到实时通知、组织架构可视化

✅ **阶段二完成：** 员工可以打卡、申请请假、查看日程、上传文档

✅ **阶段三完成：** 员工可以使用通讯录、查看公告、预订会议室、管理任务

✅ **阶段四完成：** 管理层可以查看数据报表、员工可以查阅知识库、管理员可以设计工作流
