# Synchro 项目管理仪表板 - 技术规划文档

## 1. 组件清单

### shadcn/ui 内置组件

| 组件名 | 用途 | 安装命令 |
|--------|------|----------|
| Button | 各种按钮 | npx shadcn add button |
| Card | 卡片容器 | npx shadcn add card |
| Avatar | 用户头像 | npx shadcn add avatar |
| Badge | 标签 (优先级、数量) | npx shadcn add badge |
| Dialog | 任务详情弹窗 | npx shadcn add dialog |
| Input | 搜索框、评论输入 | npx shadcn add input |
| Tabs | 弹窗内标签切换 | npx shadcn add tabs |
| Textarea | 评论输入框 | npx shadcn add textarea |
| Tooltip | 图表悬停提示 | npx shadcn add tooltip |
| ScrollArea | 滚动区域 | npx shadcn add scroll-area |
| Separator | 分隔线 | npx shadcn add separator |
| DropdownMenu | 下拉菜单 | npx shadcn add dropdown-menu |

### 第三方组件

| 组件名 | 来源 | 用途 |
|--------|------|------|
| Recharts | npm | 里程碑追踪器柱状图 |

### 自定义组件

| 组件名 | 用途 | 位置 |
|--------|------|------|
| Sidebar | 左侧导航栏 | sections/Sidebar.tsx |
| Header | 顶部导航栏 | sections/Header.tsx |
| QuickActions | 快捷操作卡片 | sections/QuickActions.tsx |
| StatsCards | 统计卡片 | sections/StatsCards.tsx |
| ActivityMap | 时间轴活动图 | sections/ActivityMap.tsx |
| TeamList | 团队列表 | sections/TeamList.tsx |
| UpcomingMeetings | 即将到来的会议 | sections/UpcomingMeetings.tsx |
| TodayProjects | 今日项目 | sections/TodayProjects.tsx |
| MilestoneTracker | 里程碑追踪器 | sections/MilestoneTracker.tsx |
| ActivityFeed | 活动动态 | sections/ActivityFeed.tsx |
| TaskDetailModal | 任务详情弹窗 | components/TaskDetailModal.tsx |
| ProgressBar | 进度条组件 | components/ProgressBar.tsx |
| UserAvatarGroup | 用户头像组 | components/UserAvatarGroup.tsx |

---

## 2. 动画实现规划

| 动画效果 | 实现库 | 实现方式 | 复杂度 |
|----------|--------|----------|--------|
| 页面加载入场 | Framer Motion | AnimatePresence + motion.div | Medium |
| 侧边栏滑入 | Framer Motion | initial/animate with x | Low |
| 卡片依次入场 | Framer Motion | staggerChildren | Medium |
| 卡片悬停效果 | CSS/Tailwind | hover:shadow-lg hover:-translate-y-0.5 | Low |
| 按钮悬停 | CSS/Tailwind | hover:opacity-90 | Low |
| 弹窗打开/关闭 | Framer Motion | AnimatePresence + scale/opacity | Medium |
| 进度条动画 | Framer Motion | animate width | Low |
| 图表柱子悬停 | Recharts | 内置 tooltip | Low |
| 评论输入@高亮 | 自定义 | Regex + span styling | Medium |
| 滚动渐入 | Framer Motion | whileInView | Low |

### 动画详细规格

**1. 页面加载动画**
```typescript
// 容器变体
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

// 子元素变体
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}
```

**2. 弹窗动画**
```typescript
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}
```

**3. 侧边栏动画**
```typescript
const sidebarVariants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
}
```

---

## 3. 项目文件结构

```
/mnt/okcomputer/output/app/
├── public/
│   └── avatars/           # 用户头像图片
│       ├── sarah.jpg
│       ├── jerome.jpg
│       ├── brooklyn.jpg
│       ├── cameron.jpg
│       ├── robert.jpg
│       ├── kiara.jpg
│       ├── joe-tesla.jpg
│       ├── tania.jpg
│       ├── jane.jpg
│       └── joe-doe.jpg
├── src/
│   ├── sections/          # 页面区块组件
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── QuickActions.tsx
│   │   ├── StatsCards.tsx
│   │   ├── ActivityMap.tsx
│   │   ├── TeamList.tsx
│   │   ├── UpcomingMeetings.tsx
│   │   ├── TodayProjects.tsx
│   │   ├── MilestoneTracker.tsx
│   │   └── ActivityFeed.tsx
│   ├── components/        # 可复用组件
│   │   ├── TaskDetailModal.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── UserAvatarGroup.tsx
│   │   └── AnimatedCard.tsx
│   ├── hooks/             # 自定义 Hooks
│   │   └── useAnimatedEntry.ts
│   ├── lib/               # 工具函数
│   │   └── utils.ts
│   ├── types/             # TypeScript 类型
│   │   └── index.ts
│   ├── data/              # 模拟数据
│   │   └── mockData.ts
│   ├── App.tsx            # 主应用组件
│   ├── App.css            # 全局样式
│   └── main.tsx           # 入口文件
├── components/ui/         # shadcn/ui 组件
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 4. 依赖安装清单

### 核心依赖 (已包含在初始化中)
- react
- react-dom
- typescript
- vite
- tailwindcss
- @radix-ui/* (shadcn 依赖)
- class-variance-authority
- clsx
- tailwind-merge
- lucide-react

### 额外依赖
```bash
# 动画库
npm install framer-motion

# 图表库
npm install recharts

# 日期处理 (可选)
npm install date-fns
```

---

## 5. 类型定义

```typescript
// types/index.ts

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  assignees: User[];
  comments: number;
  links: number;
  dueDate?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: User[];
  comments: number;
  links: number;
}

export interface Activity {
  id: string;
  user: User;
  action: string;
  target: string;
  timestamp: string;
}

export interface MilestoneData {
  month: string;
  target: number;
  actual: number;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'figma' | 'doc' | 'other';
}
```

---

## 6. 关键实现细节

### 时间轴活动图
- 使用 CSS Grid 布局
- 横向时间刻度：09:00 AM - 04:00 PM
- 每个项目一行，进度条根据时间定位
- 进度条颜色根据项目类型区分

### 里程碑追踪器
- 使用 Recharts BarChart
- 双柱对比：目标(灰色) vs 实际(橙色)
- 自定义 Tooltip 显示详细数据
- 时间范围切换过滤数据

### 任务详情弹窗
- 使用 shadcn Dialog 组件
- 评论@提及功能：正则匹配 @username
- 标签页切换：Description / Comment / Setting
- 附件列表带文件图标

### 进度条组件
- 可配置颜色、高度、百分比
- 动画效果：width 从 0 到目标值
- 显示百分比标签

---

## 7. 性能优化

- 使用 React.memo 优化卡片组件
- 图片懒加载 (loading="lazy")
- 动画使用 transform 和 opacity (GPU加速)
- 大列表使用虚拟滚动 (如有需要)
- 组件按需加载

---

## 8. 可访问性

- 所有按钮有 aria-label
- 弹窗有 aria-modal 和 role="dialog"
- 颜色对比度符合 WCAG 2.1 AA 标准
- 键盘导航支持
- 焦点管理
