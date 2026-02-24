# 申请模块完善实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 根据APPLICATION_CORE_LOGIC.md完善申请模块，实现四种申请类型和完整的审批流程

**Architecture:**
- 后端：Express + Prisma，实现完整的四级审批流程（厂长并行→总监分流→经理并行→CEO）
- 前端：React + TypeScript，支持多种申请表单和审批界面
- 数据库：扩展现有schema支持新产品开发、可行性评估、出差申请等特殊字段

**Tech Stack:** Node.js, Express, Prisma, PostgreSQL, React, TypeScript, Tailwind, shadcn/ui, ExcelJS

---

## 当前状态分析

### 已实现
- 基础申请CRUD (backend/src/controllers/applications.ts)
- 标准申请审批流程框架 (backend/src/controllers/approvals.ts)
- 基础权限控制
- 前端申请列表、详情、创建页面

### 需要完善
1. 厂长并行审批逻辑（需所有厂长通过）
2. 总监审批分流（经理/CEO/直接完成）
3. 经理并行审批逻辑
4. 新产品开发企划表（PD编号、电子签名）
5. 可行性评估表（12项评估、5部门并行）
6. 出差申请单（简化流程）
7. Excel导出功能
8. 高金额通知机制

---

## 任务列表

### 任务1: 完善后端审批流程 - 厂长并行审批

**Files:**
- Modify: `backend/src/controllers/approvals.ts:130-160`
- Modify: `backend/src/utils/application.ts:51-76`

**Step 1: 实现厂长并行审批检查函数**

```typescript
// backend/src/utils/application.ts
export async function checkAllFactoryManagersApproved(
  tx: Prisma.TransactionClient,
  applicationId: string,
  factoryManagerIds: string[]
): Promise<boolean> {
  const approvals = await tx.factoryApproval.findMany({
    where: { applicationId, action: ApprovalAction.APPROVE }
  });
  const approvedIds = new Set(approvals.map(a => a.approverId));

  // 获取所有厂长对应的user.id
  const managers = await tx.user.findMany({
    where: { employeeId: { in: factoryManagerIds } },
    select: { id: true }
  });

  return managers.every(m => approvedIds.has(m.id));
}
```

**Step 2: 修改厂长审批逻辑**

在`factoryApprove`函数中，审批通过后检查是否所有厂长都已审批：

```typescript
// 更新审批记录后，检查是否所有厂长都已通过
const allApproved = await checkAllFactoryManagersApproved(
  tx, applicationId, application.factoryManagerIds
);

if (allApproved) {
  // 所有厂长通过，进入总监阶段
  await tx.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.PENDING_DIRECTOR }
  });
}
```

**Step 3: 测试并行审批**

1. 创建申请，选择多个厂长
2. 登录第一个厂长账号审批 → 状态应为PENDING_FACTORY
3. 登录第二个厂长账号审批 → 状态变为PENDING_DIRECTOR

**Step 4: Commit**

```bash
git add backend/src/utils/application.ts backend/src/controllers/approvals.ts
git commit -m "feat: 实现厂长并行审批逻辑"
```

---

### 任务2: 完善总监审批分流功能

**Files:**
- Modify: `backend/src/controllers/approvals.ts:281-388`
- Create: `backend/src/types/approvals.ts`

**Step 1: 定义总监审批选项类型**

```typescript
// backend/src/types/approvals.ts
export interface DirectorApprovalOptions {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  flowType: 'TO_MANAGER' | 'TO_CEO' | 'COMPLETE';
  selectedManagerIds?: string[];
}
```

**Step 2: 修改总监审批控制器**

```typescript
// backend/src/controllers/approvals.ts
directorApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().max(500).optional(),
  flowType: z.enum(['TO_MANAGER', 'TO_CEO', 'COMPLETE']),
  selectedManagerIds: z.array(z.string()).optional(),
});

// 在审批通过时根据flowType分流
if (action === 'APPROVE') {
  let nextStatus: ApplicationStatus;

  switch (flowType) {
    case 'TO_MANAGER':
      if (!selectedManagerIds?.length) {
        throw new Error('请选择审批经理');
      }
      nextStatus = ApplicationStatus.PENDING_MANAGER;
      // 创建经理审批记录
      const managers = await tx.user.findMany({
        where: { employeeId: { in: selectedManagerIds } }
      });
      await tx.managerApproval.createMany({
        data: managers.map(m => ({
          applicationId,
          approverId: m.id,
          action: ApprovalAction.PENDING,
        }))
      });
      break;

    case 'TO_CEO':
      nextStatus = ApplicationStatus.PENDING_CEO;
      // 创建CEO审批记录
      const ceo = await tx.user.findFirst({ where: { role: 'CEO' } });
      if (ceo) {
        await tx.ceoApproval.create({
          data: {
            applicationId,
            approverId: ceo.id,
            action: ApprovalAction.PENDING,
          }
        });
      }
      break;

    case 'COMPLETE':
      nextStatus = ApplicationStatus.APPROVED;
      break;
  }

  await tx.application.update({
    where: { id: applicationId },
    data: {
      status: nextStatus,
      managerIds: flowType === 'TO_MANAGER' ? selectedManagerIds : [],
      completedAt: flowType === 'COMPLETE' ? new Date() : null,
    }
  });
}
```

**Step 3: 测试三种分流路径**

1. 创建申请并让所有厂长通过
2. 总监选择"流转到经理" → 状态变为PENDING_MANAGER
3. 总监选择"流转到CEO" → 状态变为PENDING_CEO
4. 总监选择"直接完成" → 状态变为APPROVED

**Step 4: Commit**

```bash
git add backend/src/controllers/approvals.ts backend/src/types/approvals.ts
git commit -m "feat: 实现总监审批分流功能"
```

---

### 任务3: 实现经理并行审批逻辑

**Files:**
- Modify: `backend/src/controllers/approvals.ts:394-404`
- Modify: `backend/src/utils/application.ts`

**Step 1: 添加经理并行审批检查函数**

```typescript
// backend/src/utils/application.ts
export async function checkAllManagersApproved(
  tx: Prisma.TransactionClient,
  applicationId: string,
  managerIds: string[]
): Promise<boolean> {
  const approvals = await tx.managerApproval.findMany({
    where: { applicationId, action: ApprovalAction.APPROVE }
  });
  const approvedIds = new Set(approvals.map(a => a.approverId));

  const managers = await tx.user.findMany({
    where: { employeeId: { in: managerIds } },
    select: { id: true }
  });

  return managers.every(m => approvedIds.has(m.id));
}
```

**Step 2: 修改经理审批逻辑**

```typescript
// 在managerApprove中
const allApproved = await checkAllManagersApproved(
  tx, applicationId, application.managerIds
);

if (allApproved) {
  // 所有经理通过，进入CEO阶段
  await tx.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.PENDING_CEO }
  });

  // 创建CEO审批记录
  const ceo = await tx.user.findFirst({ where: { role: 'CEO' } });
  if (ceo) {
    await tx.ceoApproval.create({
      data: {
        applicationId,
        approverId: ceo.id,
        action: ApprovalAction.PENDING,
      }
    });
  }
}
```

**Step 3: Commit**

```bash
git add backend/src/utils/application.ts backend/src/controllers/approvals.ts
git commit -m "feat: 实现经理并行审批逻辑"
```

---

### 任务4: 扩展Prisma Schema支持多申请类型

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: 添加申请类型枚举**

```prisma
enum ApplicationType {
  STANDARD
  PRODUCT_DEVELOPMENT
  FEASIBILITY_STUDY
  BUSINESS_TRIP
  OTHER
}
```

**Step 2: 扩展Application模型**

```prisma
model Application {
  // ... 现有字段

  // 新增字段
  type              ApplicationType @default(STANDARD)
  formType          String?         // 具体表单类型
  customFields      Json?           // 自定义字段存储

  // 新产品开发企划表字段
  projectNo         String?         @unique  // PD编号
  projectName       String?
  customerName      String?
  projectSources    String[]        // 开发源由
  projectContent    Json?           // 7个维度的内容
  projectReviewerId String?         // 项目审核人
  projectProposerId String?         // 项目申请人

  // 可行性评估表字段
  evaluationItems   Json?           // 12项评估内容
  evaluationResult  String?         // 评估结论

  // 出差申请字段
  tripStartDate     DateTime?
  tripEndDate       DateTime?
  tripDestination   String?
  tripPurpose       String?
  selectedSupervisorId String?      // 主管审批人

  // 通知标记
  highAmountNotified Boolean @default(false)  // 高金额已通知
}
```

**Step 3: 运行迁移**

```bash
cd backend
npx prisma migrate dev --name add_application_types
```

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: 扩展数据库schema支持多申请类型"
```

---

### 任务5: 实现新产品开发企划表API

**Files:**
- Create: `backend/src/controllers/productDevelopment.ts`
- Create: `backend/src/routes/productDevelopment.ts`

**Step 1: 创建控制器**

```typescript
// backend/src/controllers/productDevelopment.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Priority, ApplicationStatus, ApplicationType } from '@prisma/client';
import { fail } from '../utils/response';
import logger from '../lib/logger';

const createProductDevelopmentSchema = z.object({
  projectName: z.string().min(1, '项目名称不能为空'),
  customerName: z.string().min(1, '客户名称不能为空'),
  proposalDate: z.string().datetime(),
  projectSources: z.array(z.string()).min(1, '请至少选择一个开发源由'),
  projectContent: z.object({
    nature: z.string(),
    successProbability: z.string(),
    competition: z.string(),
    developmentCost: z.string(),
    productionCost: z.string(),
    compliance: z.string(),
    profitForecast: z.string(),
  }),
  reviewerId: z.string().min(1, '请选择项目审核人'),
  proposerId: z.string().min(1, '请选择项目申请人'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

// 生成PD编号: PD + YYYYMMDD + 流水号(3位)
async function generateProjectNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PD${dateStr}-`;

  const latest = await prisma.application.findFirst({
    where: { projectNo: { startsWith: prefix } },
    orderBy: { projectNo: 'desc' },
    select: { projectNo: true },
  });

  let nextNum = 1;
  if (latest?.projectNo) {
    const match = latest.projectNo.match(/-(\d{3})$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export async function createProductDevelopment(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const parseResult = createProductDevelopmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(fail('VALIDATION_ERROR', parseResult.error.errors[0]?.message));
      return;
    }

    const data = parseResult.data;
    const projectNo = await generateProjectNo();

    const application = await prisma.application.create({
      data: {
        applicationNo: projectNo,
        projectNo,
        type: ApplicationType.PRODUCT_DEVELOPMENT,
        formType: '新产品开发企划表',
        title: `新产品开发: ${data.projectName}`,
        content: JSON.stringify(data.projectContent),
        projectName: data.projectName,
        customerName: data.customerName,
        projectSources: data.projectSources,
        projectContent: data.projectContent,
        projectReviewerId: data.reviewerId,
        projectProposerId: data.proposerId,
        priority: data.priority as Priority,
        status: ApplicationStatus.PENDING_REVIEWER, // 待审核人审批
        applicantId: user.id,
        applicantName: user.name || '',
        applicantDept: user.department || '',
      },
    });

    res.status(201).json({
      success: true,
      message: '新产品开发企划表创建成功',
      data: application,
    });
  } catch (error) {
    logger.error('创建新产品开发企划表失败', { error });
    res.status(500).json(fail('INTERNAL_ERROR', '创建失败'));
  }
}
```

**Step 2: 创建路由**

```typescript
// backend/src/routes/productDevelopment.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createProductDevelopment } from '../controllers/productDevelopment';

const router = Router();

router.post('/', authenticate, createProductDevelopment);

export default router;
```

**Step 3: 注册路由**

```typescript
// backend/src/index.ts
import productDevelopmentRoutes from './routes/productDevelopment';

app.use('/api/product-development', productDevelopmentRoutes);
```

**Step 4: Commit**

```bash
git add backend/src/controllers/productDevelopment.ts backend/src/routes/productDevelopment.ts
git commit -m "feat: 实现新产品开发企划表API"
```

---

### 任务6: 实现可行性评估表API

**Files:**
- Create: `backend/src/controllers/feasibilityStudy.ts`
- Create: `backend/src/routes/feasibilityStudy.ts`

**Step 1: 定义评估项目结构**

```typescript
// backend/src/types/feasibility.ts
export interface EvaluationItem {
  id: number;
  content: string;      // 评估内容
  department: 'BUSINESS' | 'PRODUCTION' | 'QC' | 'R&D' | 'FACTORY';
  standard: string;     // 评估标准
  result?: 'FEASIBLE' | 'NOT_FEASIBLE' | 'PENDING';
  comment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

// 12项评估内容
export const defaultEvaluationItems: EvaluationItem[] = [
  { id: 1, content: '市场需求分析', department: 'BUSINESS', standard: '市场需求明确', result: 'PENDING' },
  { id: 2, content: '生产技术可行性', department: 'PRODUCTION', standard: '现有技术可生产', result: 'PENDING' },
  // ... 共12项
];
```

**Step 2: 创建控制器**

```typescript
// backend/src/controllers/feasibilityStudy.ts
export async function createFeasibilityStudy(req: Request, res: Response): Promise<void> {
  // 创建可行性评估表，初始化12项评估
  // 设置状态为等待5个部门并行审批
}

export async function evaluateItem(req: Request, res: Response): Promise<void> {
  // 部门主管评估某一项
  // 检查所有12项是否都已评估为FEASIBLE
}

export async function getEvaluationStatus(req: Request, res: Response): Promise<void> {
  // 获取各部门评估状态
}
```

**Step 3: Commit**

```bash
git add backend/src/controllers/feasibilityStudy.ts backend/src/routes/feasibilityStudy.ts
git commit -m "feat: 实现可行性评估表API"
```

---

### 任务7: 实现出差申请单API

**Files:**
- Create: `backend/src/controllers/businessTrip.ts`
- Create: `backend/src/routes/businessTrip.ts`

**Step 1: 创建控制器**

```typescript
// backend/src/controllers/businessTrip.ts
const createBusinessTripSchema = z.object({
  tripStartDate: z.string().datetime(),
  tripEndDate: z.string().datetime(),
  destination: z.string().min(1, '请输入目的地'),
  purpose: z.string().min(1, '请输入出差事由'),
  supervisorId: z.string().min(1, '请选择主管审批人'),
});

export async function createBusinessTrip(req: Request, res: Response): Promise<void> {
  // 创建出差申请，状态为待主管审批
  // 无金额字段，无附件要求
}
```

**Step 2: Commit**

```bash
git add backend/src/controllers/businessTrip.ts backend/src/routes/businessTrip.ts
git commit -m "feat: 实现出差申请单API"
```

---

### 任务8: 实现Excel导出功能

**Files:**
- Create: `backend/src/controllers/export.ts`
- Modify: `backend/src/routes/export.ts`

**Step 1: 安装依赖**

```bash
cd backend
npm install exceljs
```

**Step 2: 实现导出控制器**

```typescript
// backend/src/controllers/export.ts
import ExcelJS from 'exceljs';

export async function exportProductDevelopment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      projectReviewer: true,
      projectProposer: true,
    }
  });

  if (!application || application.type !== 'PRODUCT_DEVELOPMENT') {
    res.status(404).json(fail('NOT_FOUND', '申请不存在'));
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('新产品开发企划表');

  // 设置表头
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = '新产品开发企划表';
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // 添加项目信息
  worksheet.addRow(['项目编号', application.projectNo, '项目名称', application.projectName, '', '', '', '']);
  worksheet.addRow(['客户名称', application.customerName, '提案日期', application.createdAt.toLocaleDateString('zh-CN'), '', '', '', '']);

  // 添加开发源由
  worksheet.addRow(['开发源由']);
  const sources = [
    '因市场需求趋势而提出开发',
    '因本公司产品策略而主动提出开发',
    '因客户需求而提出开发',
    '因本公司上级决策而提出开发',
    '因客户对现有产品进行改善开发',
    '因本公司内部产品改善建议而提出开发',
  ];
  sources.forEach(source => {
    const isSelected = application.projectSources?.includes(source);
    worksheet.addRow([isSelected ? '☑' : '☐', source]);
  });

  // 添加项目内容（7个维度）
  worksheet.addRow(['项目内容']);
  const content = application.projectContent as Record<string, string>;
  if (content) {
    worksheet.addRow(['新产品性质介绍', content.nature || '']);
    worksheet.addRow(['开发成功可能性预估', content.successProbability || '']);
    // ... 其他维度
  }

  // 添加签名区域
  worksheet.addRow(['']);
  worksheet.addRow(['项目审核人', '', '项目申请人', '']);
  worksheet.addRow([application.projectReviewer?.name || '', '', application.projectProposer?.name || '', '']);

  // 设置响应
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${application.projectNo}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
}
```

**Step 3: Commit**

```bash
git add backend/src/controllers/export.ts
git commit -m "feat: 实现Excel导出功能"
```

---

### 任务9: 实现高金额通知机制

**Files:**
- Modify: `backend/src/controllers/approvals.ts:226-232`
- Create: `backend/src/services/notificationService.ts`

**Step 1: 添加高金额通知函数**

```typescript
// backend/src/services/notificationService.ts
const HIGH_AMOUNT_THRESHOLD = 100000; // 10万元

export async function notifyHighAmountApproval(
  applicationId: string,
  amount: number,
  applicantName: string
): Promise<void> {
  if (amount < HIGH_AMOUNT_THRESHOLD) return;

  // 获取财务人员（假设role为FINANCE或特定用户ID）
  const financeUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'FINANCE' },
        { id: 'E10015' } // 固定财务人员ID
      ]
    }
  });

  for (const user of financeUsers) {
    await createNotification({
      userId: user.id,
      type: 'HIGH_AMOUNT_ALERT',
      title: '高金额申请审批通过',
      content: `申请金额 ¥${amount.toLocaleString()} 已审批通过，申请人: ${applicantName}`,
      data: { applicationId, amount }
    });
  }
}
```

**Step 2: 在CEO审批通过时触发通知**

```typescript
// backend/src/controllers/approvals.ts
if (level === 'CEO' && action === 'APPROVE') {
  // 通知财务人员（高金额）
  if (application.amount && application.amount >= 100000) {
    await notifyHighAmountApproval(
      applicationId,
      Number(application.amount),
      application.applicantName
    );
  }
}
```

**Step 3: Commit**

```bash
git add backend/src/services/notificationService.ts backend/src/controllers/approvals.ts
git commit -m "feat: 实现高金额审批通知机制"
```

---

### 任务10: 前端 - 创建申请类型选择页面

**Files:**
- Create: `frontend/src/pages/applications/type-select.tsx`

**Step 1: 实现申请类型选择组件**

```tsx
// frontend/src/pages/applications/type-select.tsx
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Lightbulb, ClipboardCheck, Plane } from 'lucide-react';

const applicationTypes = [
  {
    id: 'standard',
    title: '标准申请',
    description: '一般业务申请、采购申请，支持多级审批',
    icon: FileText,
    path: '/approval/new/standard',
  },
  {
    id: 'product-development',
    title: '新产品开发企划表',
    description: '新产品开发项目提案，独立PD编号',
    icon: Lightbulb,
    path: '/approval/new/product-development',
  },
  {
    id: 'feasibility',
    title: '可行性评估表',
    description: '5个部门并行审批的评估表',
    icon: ClipboardCheck,
    path: '/approval/new/feasibility',
  },
  {
    id: 'business-trip',
    title: '出差申请单',
    description: '简化流程，仅需主管审批',
    icon: Plane,
    path: '/approval/new/business-trip',
  },
];

export function ApplicationTypeSelect() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">选择申请类型</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {applicationTypes.map((type) => (
          <Card
            key={type.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(type.path)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-coral-light rounded-lg">
                  <type.icon className="h-6 w-6 text-coral" />
                </div>
                <div>
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: 更新路由**

```tsx
// frontend/src/pages/applications/index.tsx
import { ApplicationTypeSelect } from './type-select';

<Route path="new" element={<ApplicationTypeSelect />} />
<Route path="new/standard" element={<StandardApplicationNew />} />
<Route path="new/product-development" element={<ProductDevelopmentNew />} />
```

**Step 3: Commit**

```bash
git add frontend/src/pages/applications/type-select.tsx
git commit -m "feat: 实现申请类型选择页面"
```

---

### 任务11: 前端 - 新产品开发企划表表单

**Files:**
- Create: `frontend/src/components/ProductDevelopmentForm.tsx`
- Create: `frontend/src/pages/applications/product-development-new.tsx`

**Step 1: 实现表单组件**

```tsx
// frontend/src/components/ProductDevelopmentForm.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const projectSourceOptions = [
  '因市场需求趋势而提出开发',
  '因本公司产品策略而主动提出开发',
  '因客户需求而提出开发',
  '因本公司上级决策而提出开发',
  '因客户对现有产品进行改善开发',
  '因本公司内部产品改善建议而提出开发',
];

interface ProductDevelopmentFormProps {
  users: User[];
  onSubmit: (data: ProductDevelopmentData) => void;
  loading?: boolean;
}

export function ProductDevelopmentForm({ users, onSubmit, loading }: ProductDevelopmentFormProps) {
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [projectContent, setProjectContent] = useState({
    nature: '',
    successProbability: '',
    competition: '',
    developmentCost: '',
    productionCost: '',
    compliance: '',
    profitForecast: '',
  });
  const [reviewerId, setReviewerId] = useState('');
  const [proposerId, setProposerId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      projectName,
      customerName,
      projectSources: selectedSources,
      projectContent,
      reviewerId,
      proposerId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>项目名称 *</Label>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </div>
        <div>
          <Label>客户名称 *</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>开发源由 *</Label>
        <div className="mt-2 space-y-2">
          {projectSourceOptions.map((source) => (
            <div key={source} className="flex items-center">
              <Checkbox
                checked={selectedSources.includes(source)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedSources([...selectedSources, source]);
                  } else {
                    setSelectedSources(selectedSources.filter((s) => s !== source));
                  }
                }}
              />
              <label className="ml-2 text-sm">{source}</label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>项目内容（7个维度）</Label>
        <div className="mt-2 space-y-4">
          <div>
            <Label className="text-sm text-gray-500">新产品性质介绍</Label>
            <Textarea
              value={projectContent.nature}
              onChange={(e) => setProjectContent({ ...projectContent, nature: e.target.value })}
              placeholder="材质、规格、包装方式等"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-500">开发成功可能性预估</Label>
            <Textarea
              value={projectContent.successProbability}
              onChange={(e) => setProjectContent({ ...projectContent, successProbability: e.target.value })}
              placeholder="客户接受之可能性"
            />
          </div>
          {/* ... 其他5个维度 */}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>项目审核人 *</Label>
          <select
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            className="w-full mt-1 rounded-md border border-gray-300 p-2"
          >
            <option value="">请选择</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.department})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>项目申请人 *</Label>
          <select
            value={proposerId}
            onChange={(e) => setProposerId(e.target.value)}
            className="w-full mt-1 rounded-md border border-gray-300 p-2"
          >
            <option value="">请选择</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? '提交中...' : '提交申请'}
      </Button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ProductDevelopmentForm.tsx
git commit -m "feat: 实现新产品开发企划表表单"
```

---

### 任务12: 前端 - 完善总监审批对话框（分流选择）

**Files:**
- Create: `frontend/src/components/DirectorApprovalDialog.tsx`
- Modify: `frontend/src/pages/applications/pending.tsx`

**Step 1: 实现总监审批对话框**

```tsx
// frontend/src/components/DirectorApprovalDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DirectorApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { action: 'APPROVE' | 'REJECT'; comment?: string; flowType?: string; selectedManagerIds?: string[] }) => void;
  managers: User[];
  loading?: boolean;
}

export function DirectorApprovalDialog({ open, onClose, onSubmit, managers, loading }: DirectorApprovalDialogProps) {
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [flowType, setFlowType] = useState<'TO_MANAGER' | 'TO_CEO' | 'COMPLETE'>('TO_MANAGER');
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  const handleSubmit = () => {
    onSubmit({
      action,
      comment,
      flowType: action === 'APPROVE' ? flowType : undefined,
      selectedManagerIds: flowType === 'TO_MANAGER' ? selectedManagers : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>总监审批</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={action} onValueChange={(v) => setAction(v as 'APPROVE' | 'REJECT')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="APPROVE" id="approve" />
              <Label htmlFor="approve">通过</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="REJECT" id="reject" />
              <Label htmlFor="reject">拒绝</Label>
            </div>
          </RadioGroup>

          {action === 'APPROVE' && (
            <div className="space-y-4 border rounded-lg p-4">
              <Label>审批流向</Label>
              <RadioGroup value={flowType} onValueChange={(v) => setFlowType(v as typeof flowType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TO_MANAGER" id="to-manager" />
                  <Label htmlFor="to-manager">流转到经理审批</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TO_CEO" id="to-ceo" />
                  <Label htmlFor="to-ceo">直接流转到CEO审批</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="COMPLETE" id="complete" />
                  <Label htmlFor="complete">直接完成</Label>
                </div>
              </RadioGroup>

              {flowType === 'TO_MANAGER' && (
                <div className="space-y-2">
                  <Label>选择审批经理 *</Label>
                  {managers.map((manager) => (
                    <div key={manager.id} className="flex items-center">
                      <Checkbox
                        checked={selectedManagers.includes(manager.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedManagers([...selectedManagers, manager.id]);
                          } else {
                            setSelectedManagers(selectedManagers.filter((id) => id !== manager.id));
                          }
                        }}
                      />
                      <label className="ml-2 text-sm">{manager.name}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Label>审批意见</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={action === 'REJECT' ? '请输入拒绝原因（必填）' : '请输入审批意见（可选）'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '处理中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/DirectorApprovalDialog.tsx
git commit -m "feat: 实现总监审批分流对话框"
```

---

### 任务13: 运行测试验证完整流程

**Step 1: 运行类型检查**

```bash
npm run type-check
```

**Step 2: 验证数据库迁移**

```bash
cd backend
npx prisma generate
npx prisma db push
```

**Step 3: 启动服务测试**

```bash
npm start
```

**测试场景：**
1. 创建标准申请，选择多个厂长
2. 所有厂长审批通过
3. 总监选择"流转到经理"
4. 所有经理审批通过
5. CEO审批通过
6. 验证高金额通知（如有）

**Step 4: Commit**

```bash
git commit -m "test: 验证完整审批流程"
```

---

## 执行清单

### 后端任务
- [ ] 任务1: 厂长并行审批
- [ ] 任务2: 总监审批分流
- [ ] 任务3: 经理并行审批
- [ ] 任务4: 扩展Prisma Schema
- [ ] 任务5: 新产品开发企划表API
- [ ] 任务6: 可行性评估表API
- [ ] 任务7: 出差申请单API
- [ ] 任务8: Excel导出功能
- [ ] 任务9: 高金额通知机制

### 前端任务
- [ ] 任务10: 申请类型选择页面
- [ ] 任务11: 新产品开发企划表表单
- [ ] 任务12: 总监审批对话框
- [ ] 任务13: 运行测试验证

---

## 注意事项

1. **并行审批逻辑**：厂长和经理阶段都是并行审批，需要所有指定人员通过后才进入下一阶段
2. **任一拒绝即结束**：任一审批人拒绝，申请立即结束
3. **总监分流**：总监审批时可以选择三种流向
4. **Excel导出**：只有新产品开发和可行性评估表支持导出
5. **高金额通知**：金额≥10万的申请在CEO通过后通知财务人员
