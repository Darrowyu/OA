# 设备管理模块实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现完整的设备管理模块，包含设备信息、维修保养、配件管理、健康度评估和产能管理功能

**Architecture:** 采用模块化设计，与现有审批模块架构一致。设备管理使用子路由结构，侧边栏支持多级展开菜单。

**Tech Stack:** React + TypeScript + React Router v6 + Tailwind CSS + shadcn/ui + Lucide Icons

---

## 模块结构概览

```
设备管理
├── 设备信息 (equipment)
├── 维修保养 (maintenance)
│   ├── 维修/保养记录 (maintenance/records)
│   ├── 保养计划 (maintenance/plans)
│   └── 保养模板 (maintenance/templates)
├── 配件管理 (parts)
│   ├── 配件列表 (parts/list)
│   ├── 生命周期 (parts/lifecycle)
│   ├── 日常领用 (parts/usage)
│   ├── 配件报废 (parts/scrap)
│   ├── 出入库流水 (parts/stock)
│   └── 使用统计 (parts/statistics)
├── 设备健康度评估 (health)
└── 设备产能管理 (capacity)
```

---

## Task 1: 创建设备管理页面目录结构

**Files:**
- Create: `frontend/src/pages/equipment/` 目录

**Step 1: 创建目录结构**

```bash
mkdir -p frontend/src/pages/equipment/maintenance
mkdir -p frontend/src/pages/equipment/parts
```

**Step 2: Commit**

---

## Task 2: 创建设备管理布局组件

**Files:**
- Create: `frontend/src/pages/equipment/layout.tsx`

**Step 1: 编写布局组件代码**

```tsx
import { Outlet } from "react-router-dom"
import { Header } from "@/components/Header"

export function EquipmentLayout() {
  return (
    <div className="h-screen overflow-auto">
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  )
}
```

**Step 2: Commit**

---

## Task 3: 创建设备信息页面

**Files:**
- Create: `frontend/src/pages/equipment/info.tsx`

**Step 1: 编写设备信息页面**

```tsx
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Monitor,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// 模拟设备数据
const equipmentData = [
  {
    id: "EQ001",
    name: "数控机床 A型",
    model: "CNC-2000X",
    location: "生产车间A-01",
    status: "running",
    health: 92,
    lastMaintenance: "2026-01-15",
    nextMaintenance: "2026-04-15",
  },
  {
    id: "EQ002",
    name: "注塑机 B型",
    model: "IMM-500T",
    location: "生产车间A-02",
    status: "warning",
    health: 78,
    lastMaintenance: "2026-01-20",
    nextMaintenance: "2026-02-20",
  },
  {
    id: "EQ003",
    name: "激光切割机",
    model: "LC-3000",
    location: "生产车间B-01",
    status: "stopped",
    health: 45,
    lastMaintenance: "2025-12-10",
    nextMaintenance: "2026-02-10",
  },
  {
    id: "EQ004",
    name: "自动焊接机器人",
    model: "AW-R01",
    location: "生产车间B-02",
    status: "running",
    health: 88,
    lastMaintenance: "2026-01-25",
    nextMaintenance: "2026-04-25",
  },
  {
    id: "EQ005",
    name: "冲压机 C型",
    model: "PM-100T",
    location: "生产车间A-03",
    status: "maintenance",
    health: 60,
    lastMaintenance: "2026-02-01",
    nextMaintenance: "2026-02-08",
  },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  running: { label: "运行中", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "预警", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  stopped: { label: "停机", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  maintenance: { label: "保养中", color: "bg-blue-100 text-blue-700", icon: <Settings className="h-3 w-3" /> },
}

export function EquipmentInfo() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEquipment = equipmentData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 页面标题 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备信息</h1>
          <p className="text-gray-500 mt-1">管理和监控企业所有生产设备</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          添加设备
        </Button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">设备总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Monitor className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">运行中</p>
                <p className="text-3xl font-bold text-green-600 mt-1">18</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待保养</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">4</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">故障停机</p>
                <p className="text-3xl font-bold text-red-600 mt-1">2</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 设备列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>设备列表</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索设备名称或编号..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>健康度</TableHead>
                  <TableHead>上次保养</TableHead>
                  <TableHead>下次保养</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => {
                  const status = statusMap[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.health >= 80
                                  ? "bg-green-500"
                                  : item.health >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${item.health}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{item.health}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.lastMaintenance}</TableCell>
                      <TableCell>{item.nextMaintenance}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
```

**Step 2: Commit**

---

## Task 4: 创建维修保养-记录页面

**Files:**
- Create: `frontend/src/pages/equipment/maintenance/records.tsx`

**Step 1: 编写维修保养记录页面**

```tsx
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Wrench,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// 模拟维修保养记录数据
const maintenanceRecords = [
  {
    id: "MR001",
    equipmentId: "EQ001",
    equipmentName: "数控机床 A型",
    type: "保养",
    content: "定期润滑、清洁、检查刀具磨损",
    operator: "张师傅",
    startTime: "2026-01-15 08:00",
    endTime: "2026-01-15 12:00",
    duration: "4小时",
    status: "completed",
    cost: 500,
  },
  {
    id: "MR002",
    equipmentId: "EQ002",
    equipmentName: "注塑机 B型",
    type: "维修",
    content: "更换液压密封件、调试压力参数",
    operator: "李师傅",
    startTime: "2026-01-20 09:00",
    endTime: "2026-01-20 16:00",
    duration: "7小时",
    status: "completed",
    cost: 2800,
  },
  {
    id: "MR003",
    equipmentId: "EQ003",
    equipmentName: "激光切割机",
    type: "维修",
    content: "激光器功率下降检修、光路校准",
    operator: "王师傅",
    startTime: "2026-01-22 08:30",
    endTime: null,
    duration: null,
    status: "in_progress",
    cost: null,
  },
  {
    id: "MR004",
    equipmentId: "EQ005",
    equipmentName: "冲压机 C型",
    type: "保养",
    content: "更换润滑油、检查安全装置",
    operator: "张师傅",
    startTime: "2026-02-01 10:00",
    endTime: "2026-02-01 14:00",
    duration: "4小时",
    status: "completed",
    cost: 300,
  },
]

const statusMap: Record<string, { label: string; color: string }> = {
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  pending: { label: "待处理", color: "bg-yellow-100 text-yellow-700" },
}

const typeMap: Record<string, { label: string; color: string }> = {
  保养: { label: "保养", color: "bg-purple-100 text-purple-700" },
  维修: { label: "维修", color: "bg-orange-100 text-orange-700" },
}

export function MaintenanceRecords() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecords = maintenanceRecords.filter(
    (item) =>
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 页面标题 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">维修/保养记录</h1>
          <p className="text-gray-500 mt-1">查看和管理设备维修保养历史记录</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          新建记录
        </Button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本月记录</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">12</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">进行中</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">3</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-3xl font-bold text-green-600 mt-1">9</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本月费用</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">¥12,580</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wrench className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 记录列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>维修保养记录</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索设备名称或记录编号..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>记录编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>保养/维修内容</TableHead>
                  <TableHead>操作人员</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>完成时间</TableHead>
                  <TableHead>费用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.equipmentName}</TableCell>
                    <TableCell>
                      <Badge className={typeMap[item.type].color}>
                        {typeMap[item.type].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.content}</TableCell>
                    <TableCell>{item.operator}</TableCell>
                    <TableCell>{item.startTime}</TableCell>
                    <TableCell>{item.endTime || "-"}</TableCell>
                    <TableCell>{item.cost ? `¥${item.cost}` : "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusMap[item.status].color}>
                        {statusMap[item.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
```

**Step 2: Commit**

---

## Task 5: 创建维修保养-计划页面

**Files:**
- Create: `frontend/src/pages/equipment/maintenance/plans.tsx`

**Step 1: 编写保养计划页面**

```tsx
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CalendarDays,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Bell,
  Repeat,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// 模拟保养计划数据
const maintenancePlans = [
  {
    id: "MP001",
    equipmentId: "EQ001",
    equipmentName: "数控机床 A型",
    planName: "月度定期保养",
    frequency: "每月一次",
    nextDate: "2026-02-15",
    responsible: "张师傅",
    status: "active",
    reminderDays: 7,
  },
  {
    id: "MP002",
    equipmentId: "EQ002",
    equipmentName: "注塑机 B型",
    planName: "季度深度保养",
    frequency: "每季度一次",
    nextDate: "2026-03-20",
    responsible: "李师傅",
    status: "active",
    reminderDays: 14,
  },
  {
    id: "MP003",
    equipmentId: "EQ003",
    equipmentName: "激光切割机",
    planName: "半年度专业保养",
    frequency: "每半年一次",
    nextDate: "2026-02-10",
    responsible: "王师傅",
    status: "warning",
    reminderDays: 2,
  },
  {
    id: "MP004",
    equipmentId: "EQ004",
    equipmentName: "自动焊接机器人",
    planName: "月度定期保养",
    frequency: "每月一次",
    nextDate: "2026-02-25",
    responsible: "张师傅",
    status: "active",
    reminderDays: 7,
  },
  {
    id: "MP005",
    equipmentId: "EQ005",
    equipmentName: "冲压机 C型",
    planName: "周度检查保养",
    frequency: "每周一次",
    nextDate: "2026-02-08",
    responsible: "赵师傅",
    status: "overdue",
    reminderDays: 0,
  },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "即将到期", color: "bg-yellow-100 text-yellow-700", icon: <Bell className="h-3 w-3" /> },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
}

export function MaintenancePlans() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPlans = maintenancePlans.filter(
    (item) =>
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.planName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 页面标题 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">保养计划</h1>
          <p className="text-gray-500 mt-1">管理设备定期保养计划，确保设备正常运行</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          新建计划
        </Button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">计划总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">15</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">正常</p>
                <p className="text-3xl font-bold text-green-600 mt-1">10</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">即将到期</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">3</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已逾期</p>
                <p className="text-3xl font-bold text-red-600 mt-1">2</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 计划列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>保养计划列表</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索设备或计划名称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>计划编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>计划名称</TableHead>
                  <TableHead>保养频率</TableHead>
                  <TableHead>下次保养日期</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>提前提醒</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((item) => {
                  const status = statusMap[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.equipmentName}</TableCell>
                      <TableCell>{item.planName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Repeat className="h-3 w-3 text-gray-400" />
                          {item.frequency}
                        </span>
                      </TableCell>
                      <TableCell>{item.nextDate}</TableCell>
                      <TableCell>{item.responsible}</TableCell>
                      <TableCell>{item.reminderDays}天</TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
```

**Step 2: Commit**

---

## Task 6: 创建维修保养-模板页面

**Files:**
- Create: `frontend/src/pages/equipment/maintenance/templates.tsx`

**Step 1: 编写保养模板页面**

```tsx
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileText,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Copy,
  Clock,
  CheckCircle2,
  Layers,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// 模拟保养模板数据
const maintenanceTemplates = [
  {
    id: "MT001",
    name: "数控机床月度保养模板",
    category: "数控机床",
    items: 8,
    estimatedTime: "4小时",
    createdBy: "张师傅",
    createdAt: "2025-12-01",
    usageCount: 12,
    status: "active",
  },
  {
    id: "MT002",
    name: "注塑机季度深度保养模板",
    category: "注塑机",
    items: 15,
    estimatedTime: "8小时",
    createdBy: "李师傅",
    createdAt: "2025-11-15",
    usageCount: 4,
    status: "active",
  },
  {
    id: "MT003",
    name: "激光切割机半年度保养模板",
    category: "激光设备",
    items: 12,
    estimatedTime: "6小时",
    createdBy: "王师傅",
    createdAt: "2025-10-20",
    usageCount: 2,
    status: "active",
  },
  {
    id: "MT004",
    name: "焊接机器人月度保养模板",
    category: "机器人",
    items: 10,
    estimatedTime: "3小时",
    createdBy: "张师傅",
    createdAt: "2025-12-10",
    usageCount: 3,
    status: "active",
  },
  {
    id: "MT005",
    name: "冲压机周度检查模板",
    category: "冲压设备",
    items: 6,
    estimatedTime: "1小时",
    createdBy: "赵师傅",
    createdAt: "2025-11-01",
    usageCount: 20,
    status: "draft",
  },
]

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "已启用", color: "bg-green-100 text-green-700" },
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700" },
}

export function MaintenanceTemplates() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = maintenanceTemplates.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 页面标题 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">保养模板</h1>
          <p className="text-gray-500 mt-1">管理标准化保养模板，提高保养效率</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          新建模板
        </Button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">模板总数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">8</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已启用</p>
                <p className="text-3xl font-bold text-green-600 mt-1">6</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">累计使用</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">156次</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均耗时</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">4.5小时</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 模板列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>保养模板列表</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索模板名称或分类..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模板编号</TableHead>
                  <TableHead>模板名称</TableHead>
                  <TableHead>适用分类</TableHead>
                  <TableHead>检查项数</TableHead>
                  <TableHead>预计耗时</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>使用次数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{item.items}项</TableCell>
                    <TableCell>{item.estimatedTime}</TableCell>
                    <TableCell>{item.createdBy}</TableCell>
                    <TableCell>{item.createdAt}</TableCell>
                    <TableCell>{item.usageCount}次</TableCell>
                    <TableCell>
                      <Badge className={statusMap[item.status].color}>
                        {statusMap[item.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
```

**Step 2: Commit**

---

（后续Task 7-13按照相同模式继续实现其他页面...）

## 总结

本计划包含13个Task，需要依次完成：
1. 创建设备管理页面目录结构
2. 创建设备管理布局组件
3. 创建设备信息页面
4. 创建维修保养-记录页面
5. 创建维修保养-计划页面
6. 创建维修保养-模板页面
7. 创建配件管理-列表页面
8. 创建配件管理-生命周期页面
9. 创建配件管理-日常领用页面
10. 创建配件管理-配件报废页面
11. 创建配件管理-出入库流水页面
12. 创建配件管理-使用统计页面
13. 创建设备健康度评估页面
14. 创建设备产能管理页面
15. 创建设备管理路由模块
16. 更新侧边栏配置
17. 更新App.tsx路由配置

预计总工作量约2-3小时。
