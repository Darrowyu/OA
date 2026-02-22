# 安全与类型修复实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复后端安全漏洞（速率限制、路径遍历、JSON查询）和前端类型安全问题

**Architecture:** 在认证路由添加严格速率限制，文件下载添加路径验证，Prisma查询改为内存过滤，前端移除 any 类型

**Tech Stack:** Express, TypeScript, Prisma, React, rate-limit

---

## Task 1: 公共密码修改端点速率限制

**Files:**
- Modify: `backend/src/routes/auth.ts`

**Step 1: 添加 rateLimit 导入和 strictLimiter 配置**

在文件顶部添加导入：
```typescript
import rateLimit from 'express-rate-limit';
```

在 `const router = Router();` 后添加：
```typescript
// 严格速率限制配置 - 用于敏感操作
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 每IP每小时5次
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '尝试次数过多，请1小时后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功请求不计入限制
});
```

**Step 2: 应用速率限制到公共密码修改端点**

找到 `/change-password-public` 路由，修改为：
```typescript
router.post('/change-password-public', strictLimiter, publicChangePassword);
```

**Step 3: 类型检查验证**

Run: `cd backend && npm run type-check`
Expected: PASS (no errors)

---

## Task 2: 登录/注册端点速率限制

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: 在全局限流后添加严格限流**

在 `app.use('/api/', limiter);` 后添加：
```typescript
// 严格限流 - 用于认证端点
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 5, // 每个IP 5次
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '登录尝试次数过多，请5分钟后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功请求不计入限制
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

**Step 2: 类型检查验证**

Run: `cd backend && npm run type-check`
Expected: PASS (no errors)

---

## Task 3: 文件下载路径遍历防护

**Files:**
- Modify: `backend/src/routes/uploads.ts:203-210`

**Step 1: 在下载端点添加路径验证**

在 `if (!attachment)` 检查之后，`if (!fs.existsSync(attachment.path))` 之前添加：
```typescript
// 验证文件路径安全 - 防止路径遍历攻击
const resolvedPath = path.resolve(attachment.path);
const uploadDir = path.resolve(UPLOAD_CONFIG.uploadDir);
if (!resolvedPath.startsWith(uploadDir)) {
  logger.warn('检测到非法文件访问尝试', { path: attachment.path, user: req.user?.id });
  res.status(403).json({ error: '无权访问此文件' });
  return;
}
```

**Step 2: 类型检查验证**

Run: `cd backend && npm run type-check`
Expected: PASS (no errors)

---

## Task 4: Prisma JSON 字段查询修正

**Files:**
- Modify: `backend/src/services/reportService.ts:1060-1071`

**Step 1: 修改会议统计查询逻辑**

将：
```typescript
const meetingWhere: Record<string, unknown> = {
  attendees: { contains: userId },
};
if (startDate && endDate) {
  meetingWhere.startTime = { gte: startDate, lte: endDate };
}

const [organizedMeetings, attendedMeetings] = await Promise.all([
  prisma.meeting.count({ where: { organizerId: userId, ...meetingWhere } }),
  prisma.meeting.count({ where: meetingWhere }),
]);
```

替换为：
```typescript
const meetingTimeWhere: Record<string, unknown> = {};
if (startDate && endDate) {
  meetingTimeWhere.startTime = { gte: startDate, lte: endDate };
}

// 查询所有相关会议，在内存中过滤参与者（JSON字段不能用contains查询）
const [organizedMeetings, allMeetings] = await Promise.all([
  prisma.meeting.count({ where: { organizerId: userId, ...meetingTimeWhere } }),
  prisma.meeting.findMany({
    where: meetingTimeWhere,
    select: { organizerId: true, attendees: true },
  }),
]);

// 在内存中过滤参与者
const attendedMeetings = allMeetings.filter((m) =>
  m.attendees &&
  Array.isArray(m.attendees) &&
  m.attendees.some((a) => a && typeof a === 'object' && 'userId' in a && (a as { userId: string }).userId === userId)
).length;
```

**Step 2: 类型检查验证**

Run: `cd backend && npm run type-check`
Expected: PASS (no errors)

---

## Task 5: CORS 配置安全加固

**Files:**
- Modify: `backend/src/config/index.ts:55-58`

**Step 1: 限制 CORS 来源**

将：
```typescript
cors: {
  origin: process.env.CORS_ORIGIN?.split(',') || true,
  credentials: true,
},
```

替换为：
```typescript
cors: {
  origin: process.env.CORS_ORIGIN?.split(',') || (process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3000']),
  credentials: true,
},
```

**Step 2: 类型检查验证**

Run: `cd backend && npm run type-check`
Expected: PASS (no errors)

---

## Task 6: 前端 any 类型修复

**Files:**
- Modify: `frontend/src/components/DashboardWidgets.tsx:427-437`

**Step 1: 修改 DataTable 类型定义**

将：
```typescript
interface DataTableColumn {
  key: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, record: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
```

替换为：
```typescript
interface DataTableColumn {
  key: string;
  title: string;
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
```

**Step 2: 修改表格行 key**

将：
```typescript
<tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
```

替换为：
```typescript
<tr key={row.id as string || `row-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
```

**Step 3: 类型检查验证**

Run: `cd frontend && npm run type-check`
Expected: PASS (no errors)

---

## Task 7: 修复报表组件类型

**Files:**
- Modify: `frontend/src/pages/reports/components/ApprovalReport.tsx:29-41`
- Modify: `frontend/src/pages/reports/components/AttendanceReport.tsx:21-44`
- Modify: `frontend/src/pages/reports/components/EquipmentReport.tsx:34-40`

**Step 1: 修复 ApprovalReport 中的 render 类型**

将：
```typescript
{ key: 'rejectionRate', title: '驳回率', render: (value: number) => `${value}%` },
{ key: 'avgWaitTime', title: '平均等待(小时)', render: (value: number) => `${value}h` },
{ key: 'avgResponseTime', title: '平均响应(小时)', render: (value: number) => `${value}h` },
```

替换为：
```typescript
{ key: 'rejectionRate', title: '驳回率', render: (value: unknown) => `${value}%` },
{ key: 'avgWaitTime', title: '平均等待(小时)', render: (value: unknown) => `${value}h` },
{ key: 'avgResponseTime', title: '平均响应(小时)', render: (value: unknown) => `${value}h` },
```

**Step 2: 修复 AttendanceReport 中的 render 类型**

将：
```typescript
{ key: 'attendanceRate', title: '出勤率', render: (value: number) => `${value}%` },
render: (value: string) => {
  return (
    <Badge variant="secondary" className={value === 'LATE' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}>
      {value === 'LATE' ? '迟到' : value === 'EARLY_LEAVE' ? '早退' : '缺勤'}
    </Badge>
  );
},
```

替换为：
```typescript
{ key: 'attendanceRate', title: '出勤率', render: (value: unknown) => `${value}%` },
render: (value: unknown) => {
  const type = value as string;
  return (
    <Badge variant="secondary" className={type === 'LATE' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}>
      {type === 'LATE' ? '迟到' : type === 'EARLY_LEAVE' ? '早退' : '缺勤'}
    </Badge>
  );
},
```

**Step 3: 修复 EquipmentReport 中的 render 类型**

将：
```typescript
{ key: 'totalCost', title: '总费用', render: (value: number) => `¥${Number(value).toLocaleString()}` },
```

替换为：
```typescript
{ key: 'totalCost', title: '总费用', render: (value: unknown) => `¥${Number(value).toLocaleString()}` },
```

**Step 4: 类型检查验证**

Run: `cd frontend && npm run type-check`
Expected: PASS (no errors)

---

## Task 8: 前端 DOM 操作修复

**Files:**
- Modify: `frontend/src/pages/announcements/AnnouncementForm.tsx:1,121,179-196,431-442`

**Step 1: 添加 useRef 导入**

将：
```typescript
import { useState, useEffect } from 'react';
```

替换为：
```typescript
import { useState, useEffect, useRef } from 'react';
```

**Step 2: 添加 editorRef**

在 `const [attachments, setAttachments] = useState<Attachment[]>([]);` 后添加：
```typescript
// 使用 ref 替代 getElementById
const editorRef = useRef<HTMLDivElement>(null);
```

**Step 3: 修改 handleEditorCommand 函数**

将：
```typescript
const handleEditorCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value);
  // 更新内容
  const editor = document.getElementById('content-editor');
  if (editor) {
    setContent(editor.innerHTML);
  }
};
```

替换为：
```typescript
const handleEditorCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value);
  // 更新内容
  if (editorRef.current) {
    setContent(editorRef.current.innerHTML);
  }
};
```

**Step 4: 修改 handleContentChange 函数**

将：
```typescript
const handleContentChange = () => {
  const editor = document.getElementById('content-editor');
  if (editor) {
    setContent(editor.innerHTML);
  }
};
```

替换为：
```typescript
const handleContentChange = () => {
  if (editorRef.current) {
    setContent(editorRef.current.innerHTML);
  }
};
```

**Step 5: 添加 ref 到编辑器元素**

将：
```typescript
<div
  id="content-editor"
  contentEditable
```

替换为：
```typescript
<div
  id="content-editor"
  ref={editorRef}
  contentEditable
```

**Step 6: 类型检查验证**

Run: `cd frontend && npm run type-check`
Expected: PASS (no errors)

---

## Final Verification

**Run full type check:**
```bash
npm run type-check
```
Expected: Backend PASS, Frontend PASS

**Run build:**
```bash
npm run build
```
Expected: Build successful
