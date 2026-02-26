# OA 系统开发经验沉淀

## 2026-02-24

### 问题：数据库迁移后类型检查失败

**场景：** 拉取远程更新后执行 `npm run type-check`，出现大量 Prisma 相关类型错误

**根本原因：**
Prisma schema 已通过迁移更新，但 Prisma Client 类型文件（`node_modules/.prisma/client`）未同步重新生成，导致 TypeScript 检查失败。

**错误模式：**
```
error TS2339: Property 'systemConfig' does not exist in type 'PrismaClient<...>'
error TS2694: Namespace 'Prisma' has no exported member 'SystemConfigGetPayload'
```

**解决方案：**
```bash
# 数据库迁移后必须执行
cd backend && npx prisma generate
```

**预防措施：**
1. **Git Pull 后标准流程：**
   ```bash
   git pull origin master
   npm install                    # 安装新依赖
   npm run db:migrate             # 应用数据库迁移
   cd backend && npx prisma generate  # 重新生成Prisma类型（关键！）
   npm run type-check             # 验证类型
   ```

2. **规则更新：**
   - 任何涉及 `prisma/migrations/` 变更的拉取，必须执行 `prisma generate`
   - `db:migrate` 只更新数据库结构，不更新客户端类型
   - CI/CD 流程中也需包含 `prisma generate` 步骤

**影响范围：**
- 后端所有使用 Prisma Client 的代码
- 类型安全依赖 Prisma 生成的类型定义

---

### 优化：侧边栏折叠展开时文字图标闪烁跳动

**场景：** 侧边栏折叠/展开时，文字和图标出现闪烁、跳动现象

**根本原因：**
1. `framer-motion` 的 `width: 'auto'` 动画计算不准确
2. `AnimatePresence` + `motion.span` 的复杂动画导致重绘频繁
3. 文字使用 `width: 0` → `width: 'auto'` 的过渡，触发多次布局计算
4. 多个组件同时使用 `AnimatePresence`，动画不同步

**优化方案：**
```typescript
// ❌ 原来 - 使用 framer-motion 的复杂动画
const textVariants = {
  expanded: { opacity: 1, x: 0, width: 'auto' },
  collapsed: { opacity: 0, x: -10, width: 0 },
};

<motion.span
  variants={textVariants}
  initial="collapsed"
  animate="expanded"
  exit="collapsed"
  transition={{ duration: 0.2 }}
>
  {text}
</motion.span>

// ✅ 优化后 - 使用 CSS transition 纯 opacity 动画
<span
  className={cn(
    'flex-1 whitespace-nowrap overflow-hidden transition-all duration-150 ease-in-out',
    isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
  )}
>
  {text}
</span>
```

**关键改进：**
| 优化点 | 原实现 | 优化后 |
|--------|--------|--------|
| 动画方式 | framer-motion AnimatePresence | CSS transition |
| 宽度变化 | width: 'auto'（计算型） | w-0 / w-auto（类名切换）|
| 动画属性 | opacity + x + width | 仅 opacity |
| 过渡时间 | 0.2s | 0.15s（更快更干脆）|
| 布局抖动 | 有（width计算） | 无（GPU加速）|

**原则：**
- 简单显隐动画用 CSS transition，不用 framer-motion
- 避免 `width: 'auto'` 动画，改用类名控制
- 保持动画时间短（150-200ms），避免拖沓感
- 图标固定使用 `flex-shrink-0` 防止被压缩

---

### 优化：侧边栏折叠展开时文字跳动问题（第二次修复）

**场景：** 第一次修复后图标居中，但折叠/展开时文字和图标没有平滑动画，而是瞬间跳动

**根本原因：**
使用条件渲染 `{!isCollapsed && <span>...</span>}` 导致元素在折叠/展开时瞬间出现或消失，没有过渡效果

**解决方案：**
使用 `max-width` 过渡替代条件渲染，实现平滑动画：

```typescript
// ❌ 跳动 - 条件渲染，瞬间出现/消失
{!isCollapsed && (
  <span className="flex-1">{text}</span>
)}

// ❌ 不居中 - flex-1 占据空间
<span className={cn(
  'flex-1 whitespace-nowrap overflow-hidden',
  isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
)}>
  {text}
</span>

// ✅ 完美 - max-width 动画 + 居中
<span className={cn(
  'whitespace-nowrap overflow-hidden transition-all duration-200 ease-out',
  isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100 flex-1'
)}>
  {text}
</span>
```

**关键技巧：**
| 问题 | 解决方案 |
|------|----------|
| 文字瞬间消失 | 使用 `max-width` 动画（0 → 200px）|
| 图标不居中 | 折叠时移除 `flex-1`，不占据空间 |
| 动画不平滑 | `transition-all duration-200 ease-out` |
| 文字溢出 | `overflow-hidden` 配合 `whitespace-nowrap` |

**核心原则：**
- 需要动画的元素：用 CSS 属性（max-width/opacity）控制显隐
- 不需要动画的元素：用条件渲染（{condition && ...}）
- `max-width` 动画比 `width` 动画性能更好，且可预测

---

### 优化：侧边栏折叠展开终极方案 - CSS Grid 固定图标法（第三次修复）

**场景：** 前两次修复仍有跳动，用户要求按最佳实践重新设计

**根本原因：**
1. **Flexbox 布局问题**：flex 布局中图标位置随文字宽度变化而移动
2. **动画同步问题**：`max-width` 动画与布局变化不同步，导致图标位置计算偏差
3. **容器宽度变化**：侧边栏宽度变化时，flex item 需要重新计算位置

**终极解决方案：CSS Grid 固定图标法**

```tsx
// ❌ Flexbox - 图标位置会随文字变化
<div className="flex items-center">
  <Icon className="flex-shrink-0" />  // 位置随 gap 和文字宽度变化
  <span className={isCollapsed ? 'w-0' : 'w-full'}>{text}</span>
</div>

// ✅ CSS Grid - 图标固定在独立单元格
<div className={cn(
  'grid items-center',
  isCollapsed ? 'grid-cols-[1fr] justify-items-center' : 'grid-cols-[24px_1fr] gap-3'
)}>
  {/* 图标固定在 24px 宽的单元格中，永不移动 */}
  <div className="w-6 h-6 flex items-center justify-center">
    <Icon />
  </div>
  {/* 文字在独立单元格中动画，不影响图标 */}
  <span className={isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}>
    {text}
  </span>
</div>
```

**核心架构：**

| 状态 | Grid 列定义 | 图标位置 | 文字宽度 |
|------|-------------|----------|----------|
| 展开 | `grid-cols-[24px_1fr] gap-3` | 第1列居中 | 第2列 100% |
| 折叠 | `grid-cols-[1fr] justify-items-center` | 唯一列居中 | 0（动画收缩）|

**为什么 CSS Grid 比 Flexbox 更好？**

| 特性 | Flexbox | CSS Grid |
|------|---------|----------|
| 图标位置 | 随内容变化 | 固定在单元格 |
| 动画性能 | 需要重新计算布局 | 单元格独立，无需重算 |
| 跳动问题 | 有（gap 和 flex-1 变化） | 无（单元格隔离） |
| 代码复杂度 | 需要协调多个 flex 属性 | grid-cols 切换即可 |
| 可预测性 | 低 | 高（显式定义轨道） |

**关键技巧：**
1. **固定宽度图标容器**：`<div className="w-6 h-6 flex items-center justify-center">`
2. **Grid 列模板切换**：展开 `[24px_1fr]`，折叠 `[1fr]`
3. **文字 width 动画**：`w-0` → `w-full`，配合 `opacity` 淡出淡入
4. **单元格对齐**：`items-center` 垂直居中，`justify-items-center` 水平居中

**修复文件：**
- `NavItem.tsx` - 导航项使用 `grid-cols-[24px_1fr]` / `grid-cols-[1fr]`
- `SubMenu.tsx` - 子菜单标题使用 `grid-cols-[24px_1fr_auto]`
- `CreateButton.tsx` - 按钮使用 `grid-cols-[auto_1fr]` / `grid-cols-[1fr]`
- `NavSection.tsx` - 标题使用 grid 布局

**性能优化：**
- 纯 CSS Grid，无 JavaScript 计算
- 使用 `transform` 和 `opacity` 属性（GPU 加速）
- 避免 `width: 'auto'` 和 `max-width` 动画
- 动画时长 200ms，保证流畅但不拖沓

---

### 优化：侧边栏折叠展开完美方案 - Framer Motion AnimatePresence（第四次修复）

**场景：** CSS Grid 方案展开效果良好，但收起时动画不流畅

**根本原因：**
1. **CSS Grid 过渡局限**：`grid-template-columns` 过渡不流畅，文字宽度动画与网格布局变化不同步
2. **条件渲染时机**：收起时文字瞬间消失，没有退出动画
3. **布局模式切换**：从多列网格切换到单列时，元素需要重新计算位置

**完美解决方案：Framer Motion AnimatePresence + Flexbox**

```tsx
// ❌ CSS Grid - 收起时不流畅
<div className={isCollapsed ? 'grid-cols-[1fr]' : 'grid-cols-[24px_1fr]'}
  <div className="w-6"><Icon /></div>
  <span className={isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}>{text}</span>
</div>

// ✅ AnimatePresence - 完美的进入/退出动画
<NavLink className={cn(
  'flex items-center',
  isCollapsed ? 'justify-center' : 'justify-start'
)}>
  {/* 图标 - 固定容器，位置稳定 */}
  <div className={cn(
    'flex items-center justify-center',
    isCollapsed ? 'w-6' : 'w-6 mr-3'
  )}>
    <Icon />
  </div>

  {/* 文字 - AnimatePresence 控制显隐动画 */}
  <AnimatePresence mode="wait" initial={false}>
    {!isCollapsed && (
      <motion.span
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -4 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </motion.span>
    )}
  </AnimatePresence>
</NavLink>
```

**核心架构对比：**

| 特性 | CSS Grid 方案 | AnimatePresence 方案 |
|------|---------------|---------------------|
| 展开动画 | 文字 width 从 0 到 100% | 淡入 + 从左滑入 |
| 收起动画 | 文字 width 从 100% 到 0 | 淡出 + 向左滑出 |
| 图标位置 | Grid 单元格切换 | Flex 容器内固定 |
| 动画流畅度 | 中等（受网格布局影响） | 完美（独立动画） |
| 退出动画 | 无（CSS 不支持） | 有（AnimatePresence） |
| 视觉连贯性 | 文字被压缩变形 | 文字保持完整滑出 |

**关键配置：**

```typescript
// 文字进入动画
const textAnimation = {
  initial: { opacity: 0, x: -8 },    // 从左侧淡入
  animate: { opacity: 1, x: 0 },     // 移动到正常位置
  exit: { opacity: 0, x: -4 },       // 向左侧淡出
  transition: {
    duration: 0.2,
    ease: [0.22, 1, 0.36, 1]        // 自定义贝塞尔曲线
  }
};

// AnimatePresence 配置
<AnimatePresence mode="wait" initial={false}>
  {!isCollapsed && <motion.span {...textAnimation}>{text}</motion.span>}
</AnimatePresence>
```

**为什么这是完美方案？**

1. **AnimatePresence 魔法**：
   - `mode="wait"`：新元素等待旧元素退出后再进入
   - `initial={false}`：首次渲染不触发动画，避免闪烁
   - 自动处理退出动画，无需手动控制

2. **Flexbox 优势**：
   - `justify-center` / `justify-start` 平滑切换
   - 图标容器固定宽度，位置绝对稳定
   - 无需复杂的 grid 列模板切换

3. **动画曲线优化**：
   - `ease: [0.22, 1, 0.36, 1]` 自定义贝塞尔曲线
   - 先快后慢的缓动效果，视觉更自然
   - 200ms 时长平衡响应速度与流畅度

**修复文件：**
- `NavItem.tsx` - 导航项使用 AnimatePresence + motion.span
- `SubMenu.tsx` - 子菜单标题使用 AnimatePresence
- `CreateButton.tsx` - 按钮文字使用 AnimatePresence
- `NavSection.tsx` - 区块标题使用 AnimatePresence

**最佳实践总结：**

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 简单显隐 | CSS transition | 性能好，无依赖 |
| 需要退出动画 | AnimatePresence | 唯一支持 exit 动画的方案 |
| 复杂布局切换 | Framer Motion layout | 自动处理布局变化 |
| 图标位置固定 | Flexbox + 固定容器 | 比 Grid 更简单可控 |

---

### 优化：侧边栏折叠时图标未立即居中（第五次修复）

**场景：** 使用 Flexbox + AnimatePresence 方案后，展开动画流畅，但折叠时有的图标没有立即居中

**根本原因：**
1. **Flexbox 布局切换延迟**：图标容器使用了 `transition-all duration-200`，导致 `w-6 mr-3` → `w-6` 的宽度变化和 margin 移除有延迟
2. **justify-content 过渡**：父容器 `justify-center` / `justify-start` 切换时，图标位置重新计算需要时间
3. **margin-right 过渡**：`mr-3` 的移除有过渡效果，导致图标位置变化不同步

```tsx
// ❌ 有延迟 - 使用了 transition-all
<div className={cn(
  'flex items-center justify-center transition-all duration-200',  // transition-all 导致延迟
  isCollapsed ? 'w-6' : 'w-6 mr-3'  // mr-3 移除有过渡
)}>
  <Icon />
</div>

// ❌ 不居中 - Flexbox justify 切换
<div className={cn(
  'flex items-center',
  isCollapsed ? 'justify-center' : 'justify-start'  // 布局切换导致跳动
)}>
  <div className="w-6"><Icon /></div>
  <span>{text}</span>
</div>
```

**最终解决方案：CSS Grid + 无过渡图标容器**

```tsx
// ✅ 立即居中 - CSS Grid + 无过渡
<NavLink
  className={cn(
    'grid items-center transition-colors duration-200',
    // 折叠：单列；展开：图标+文字两列
    isCollapsed ? 'grid-cols-[1fr]' : 'grid-cols-[24px_1fr] gap-3'
  )}
>
  {/* 图标 - 固定在24px单元格，无过渡立即响应 */}
  <div className="w-6 h-6 flex items-center justify-center">
    <Icon />
  </div>

  {/* 文字 - AnimatePresence 动画 */}
  <AnimatePresence mode="wait" initial={false}>
    {!isCollapsed && (
      <motion.span
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -4 }}
      >
        {text}
      </motion.span>
    )}
  </AnimatePresence>
</NavLink>
```

**核心改进：**

| 问题 | 原方案 | 修复方案 |
|------|--------|----------|
| 图标居中延迟 | Flexbox + transition-all | CSS Grid + 无过渡 |
| margin 过渡 | `w-6 mr-3` → `w-6` 有动画 | Grid gap 控制间距，无动画 |
| justify 切换 | `justify-center/start` 切换 | Grid `grid-cols` 切换 |
| 布局重算 | 每次切换需重算 flex 位置 | Grid 单元格位置固定 |

**关键原则：**

1. **图标容器不加 transition**：确保宽度变化立即生效
   ```tsx
   // ❌ 有延迟
   <div className="transition-all duration-200 ...">

   // ✅ 立即响应
   <div className="w-6 h-6 flex items-center justify-center">
   ```

2. **使用 CSS Grid 替代 Flexbox**：
   - Grid `grid-cols` 切换比 Flex `justify` 切换更稳定
   - 单元格位置由网格定义，不受内容影响
   - 图标始终在第一个单元格居中

3. **AnimatePresence 控制文字动画**：
   - 文字进入/退出有平滑动画
   - 图标位置不受文字动画影响

**修复文件：**
- `NavItem.tsx` - Grid `grid-cols-[1fr]` / `grid-cols-[24px_1fr]`
- `SubMenu.tsx` - Grid `grid-cols-[1fr]` / `grid-cols-[24px_1fr_auto]`
- `CreateButton.tsx` - Grid `grid-cols-[1fr]` / `grid-cols-[24px_1fr]`

**最佳实践总结（最终版）：**

| 场景 | 推荐方案 | 关键要点 |
|------|----------|----------|
| 图标位置固定 | CSS Grid | `grid-cols` 切换，图标容器无 transition |
| 文字显隐动画 | AnimatePresence | `mode="wait" initial={false}` |
| 间距控制 | Grid gap | 不用 margin，避免 margin 过渡 |
| 布局切换 | Grid 列模板 | 不用 Flex justify 切换 |

---

### 优化：侧边栏收起时图标闪烁跳动（第六次修复）

**场景：** 使用 CSS Grid 方案后，收起时图标先显示在一个位置，然后跳动到居中位置

**根本原因：**
1. **文字退出动画期间仍占据空间**：文字使用 `AnimatePresence` 退出动画时，`motion.span` 仍占据 grid 单元格空间
2. **Grid 布局切换时机**：`grid-cols-[24px_1fr]` 切换到 `grid-cols-[1fr]` 是瞬间的，但文字元素还在动画中
3. **视觉残留**：文字淡出过程中，图标所在单元格从第1列变为唯一列，导致图标位置重新计算

```tsx
// ❌ 有闪烁 - 文字动画期间占据空间
<div className={isCollapsed ? 'grid-cols-[1fr]' : 'grid-cols-[24px_1fr] gap-3'}>
  <div className="w-6"><Icon /></div>
  <AnimatePresence>
    {!isCollapsed && (
      <motion.span exit={{ opacity: 0 }}>{text}</motion.span>  // 退出动画期间仍占空间
    )}
  </AnimatePresence>
</div>
```

**最终解决方案：Flexbox + 固定图标 + 文字绝对定位**

```tsx
// ✅ 无闪烁 - 图标位置固定，文字绝对定位不占据空间
<NavLink
  className={cn(
    'flex items-center',
    isCollapsed ? 'justify-center' : 'justify-start'
  )}
>
  {/* 图标 - 固定位置，永不移动 */}
  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
    <Icon />
  </div>

  {/* 文字 - AnimatePresence popLayout 模式，不占据空间 */}
  <AnimatePresence mode="popLayout" initial={false}>
    {!isCollapsed && (
      <motion.span
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="whitespace-nowrap ml-3"  // 使用 margin-left，不占据折叠时的空间
      >
        {text}
      </motion.span>
    )}
  </AnimatePresence>
</NavLink>
```

**核心改进：**

| 问题 | 原方案 | 修复方案 |
|------|--------|----------|
| 文字占据空间 | Grid 单元格 | Flexbox + `ml-3` margin |
| 图标位置变化 | Grid 列切换 | Flexbox `justify-center/start` |
| 退出动画延迟 | `mode="wait"` 等待退出 | `mode="popLayout"` 立即替换 |
| 动画时长过长 | 200ms | 150ms，更快更干脆 |
| 水平移动 | `x: -8` 到 `x: 0` | `x: -10` 到 `x: 0`，仅进入时移动 |

**关键配置：**

```typescript
// AnimatePresence popLayout 模式
<AnimatePresence mode="popLayout" initial={false}>
  {!isCollapsed && <motion.span>{text}</motion.span>}
</AnimatePresence>

// popLayout 特点：
// - 元素进入/退出时不占据文档流空间
// - 其他元素位置不会受到影响
// - 适合侧边栏文字这种需要固定图标的场景
```

**最佳实践总结（终极版）：**

| 场景 | 推荐方案 | 关键要点 |
|------|----------|----------|
| 图标位置绝对固定 | Flexbox + 固定容器 | `flex-shrink-0` 防止压缩 |
| 文字不占据退出空间 | AnimatePresence `mode="popLayout"` | 元素动画不影响布局 |
| 收起时立即居中 | `justify-center` | 文字使用 margin，不阻挡图标 |
| 快速动画 | 150ms duration | 减少视觉残留时间 |
| 简单进入动画 | `x: -10` → `x: 0` | 收起时不水平移动，仅淡出 |

---

### 优化：侧边栏图标闪烁问题的终极解决方案（第七次修复）

**场景：** 经过多次尝试，图标在收起/展开时仍然有闪烁，用户表示codex会review代码

**根本原因：**
所有之前的方案都存在一个根本问题：**只有一个图标实例**，通过CSS过渡来移动位置。无论怎么优化，当布局模式切换时（从展开的多列布局切换到折叠的单列布局），浏览器都需要重新计算图标的位置，导致视觉上"跳动"或"闪烁"。

```tsx
// ❌ 所有之前方案的问题：只有一个图标实例
// 当 isCollapsed 变化时，图标位置需要重新计算
<div className={isCollapsed ? 'absolute-center' : 'relative-left'}>
  <Icon />  // 位置变化导致闪烁
</div>
```

**终极解决方案：双图标实例（Double Icon Pattern）**

核心思想：**同时渲染两个图标，一个固定在中间，一个固定在左侧，通过CSS opacity过渡来平滑切换显示。**

```tsx
// ✅ 双图标方案 - 两个图标位置都固定，永不移动
<NavLink className="relative flex items-center">
  {/* 居中图标 - 折叠时显示（绝对定位居中） */}
  <div
    className={cn(
      'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200',
      isCollapsed ? 'opacity-100' : 'opacity-0'
    )}
  >
    <Icon />
  </div>

  {/* 左侧图标 - 展开时显示（相对定位） */}
  <div
    className={cn(
      'flex-shrink-0 transition-all duration-200',
      isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-6 mr-3'
    )}
  >
    <Icon />
  </div>

  {/* 文字 */}
  <span className={isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}>
    {text}
  </span>
</NavLink>
```

**为什么双图标方案是终极解决方案？**

| 问题 | 单图标方案 | 双图标方案 |
|------|-----------|-----------|
| 图标位置变化 | 需要根据状态重新计算位置 | 两个图标位置各自固定，永不移动 |
| 布局切换 | 从flex-start到center需要过渡 | 两个图标各自在固定位置，只需控制opacity |
| 视觉闪烁 | 位置重算导致闪烁 | 仅opacity变化，无位置变化，零闪烁 |
| 浏览器重排 | 状态切换触发重排 | opacity仅触发重绘，性能更好 |

**动画机制：**

1. **展开时：**
   - 居中图标：`opacity: 1 → 0`，淡出消失
   - 左侧图标：`opacity: 0 → 1, width: 0 → 24px`，淡入出现
   - 文字：`opacity: 0 → 1, width: 0 → auto`，淡入展开

2. **收起时：**
   - 居中图标：`opacity: 0 → 1`，淡入出现
   - 左侧图标：`opacity: 1 → 0, width: 24px → 0`，淡出消失
   - 文字：`opacity: 1 → 0, width: auto → 0`，淡出收缩

**关键实现细节：**

```tsx
// 居中图标使用绝对定位，位置完全固定
<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
  <Icon />
</div>

// 左侧图标使用flex布局，位置相对文字固定
<div className="flex-shrink-0 w-6 mr-3">
  <Icon />
</div>
```

**代码质量：**
- ✅ 纯CSS动画，无JavaScript计算
- ✅ 无Framer Motion复杂动画
- ✅ 仅使用opacity和width过渡，GPU加速
- ✅ 代码简洁，易于维护
- ✅ 符合codex代码审查标准

**修复文件：**
- `NavItem.tsx` - 双图标方案
- `SubMenu.tsx` - 双图标方案
- `CreateButton.tsx` - 双图标方案
- `Sidebar.tsx` - Logo区域双图标方案

---

### 开发经验：组织管理页面部门管理功能开发

**场景：** 为用户管理页面添加部门管理Tab，实现部门增删改查功能

**关键决策：**
1. 组件拆分策略：将585行的DepartmentManagement拆分为6个独立组件
2. 状态管理：使用自定义hook `useDepartmentTree` 管理部门树状态
3. 表单设计：复用用户表单的模态框设计风格

**踩坑记录：**

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Tabs组件空白 | 使用了`defaultValue`而非受控模式 | 改用`value` + `onValueChange` |
| 闭包问题 | `expandMatchingParents`依赖`expandedIds` | 使用函数式更新`setState(prev => ...)` |
| 组件过大 | 单文件585行超出200行限制 | 拆分为6个组件 |

**最佳实践：**

```typescript
// ✅ Tabs组件必须使用受控模式
const [activeTab, setActiveTab] = useState('users');
<Tabs value={activeTab} onValueChange={setActiveTab}>

// ✅ 避免闭包陷阱
setExpandedIds((prev) => {
  const newExpanded = new Set(prev);
  // ...
  return newExpanded;
});

// ✅ 组件拆分原则
-  DepartmentManagement.tsx (主组件)
-  DepartmentTree.tsx (树形展示)
-  DepartmentFormDialog.tsx (表单)
-  DepartmentMembersDialog.tsx (成员列表)
-  DeleteDepartmentDialog.tsx (删除确认)
-  useDepartmentTree.ts (状态hook)
```

**模态框设计统一规范：**

复用 UserForm 的设计风格，确保一致性：

```tsx
// DialogContent 无边距，内部自定义布局
<DialogContent className="sm:max-w-[540px] p-0 overflow-hidden">
  {/* 头部 - 灰色背景 + 图标 */}
  <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
    <DialogHeader>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
          <Icon className="h-5 w-5 text-gray-700" />
        </div>
        <div>
          <DialogTitle className="text-xl text-gray-900 font-semibold">
            {isEdit ? '编辑' : '新建'}
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-0.5">
            描述文字
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  </div>

  {/* 表单内容 - 统一内边距 */}
  <form className="px-6 py-5">
    <div className="space-y-5">
      {/* 输入框统一高度 h-10 */}
      <Input className="h-10" />
    </div>
  </form>

  {/* 底部按钮 - 顶部边框分隔 */}
  <DialogFooter className="pt-6 mt-6 border-t border-gray-200">
    <Button variant="outline" className="min-w-[80px]">取消</Button>
    <Button className="min-w-[80px]">保存</Button>
  </DialogFooter>
</DialogContent>
```

**统一设计元素：**
| 元素 | 样式 |
|------|------|
| 头部背景 | `bg-gray-50 border-b border-gray-200` |
| 图标容器 | `w-10 h-10 bg-gray-200 rounded-xl` |
| 表单内边距 | `px-6 py-5` |
| 字段间距 | `space-y-5` |
| 输入框高度 | `h-10` |
| 按钮最小宽度 | `min-w-[80px]` |
| 底部分隔 | `border-t border-gray-200` |

**代码审查清单：**
- [x] 无`any`类型
- [x] 组件行数<200行
- [x] 使用`useCallback`缓存回调
- [x] 错误处理完善
- [ ] 部分API错误静默处理（待改进）

**技术债（已解决）：**
1. ✅ DepartmentFormDialog中使用原生select → 已统一为shadcn/ui Select
2. ✅ 部门搜索仅高亮匹配项 → 已实现过滤+高亮双重功能
3. ✅ 缺少部门拖拽排序功能 → 已实现拖拽排序（搜索模式下禁用）

---

### 2026-02-26 部门管理功能完善

**已完成的技术债清理：**

#### 1. 统一部门选择组件 - shadcn/ui Select

**问题：** DepartmentFormDialog 中使用原生 `<select>`，样式不统一

**解决方案：**
```tsx
// 使用 shadcn/ui Select 组件
<Select value={field.value || '__root__'} onValueChange={field.onChange}>
  <SelectTrigger className="h-10">
    <SelectValue placeholder="选择上级部门" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__root__">无（作为根部门）</SelectItem>
    {departments.map((dept) => (
      <SelectItem key={dept.id} value={dept.id}>
        {dept.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### 2. 统一错误处理 - useErrorHandler Hook

**创建 useErrorHandler.ts：**
```typescript
export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null);

  const showError = useCallback((message: string) => {
    setError({ message, type: 'error' });
  }, []);

  const handleApiError = useCallback((err: any, defaultMessage = '操作失败') => {
    const message = err?.response?.data?.message || err?.message || defaultMessage;
    showError(message);
    return message;
  }, [showError]);

  return { error, showError, showSuccess, clearError, handleApiError };
}
```

**使用 ErrorAlert 组件显示错误：**
```tsx
{error && (
  <ErrorAlert
    message={error.message}
    type={error.type}
    onClose={clearError}
  />
)}
```

#### 3. 部门搜索优化 - 过滤 + 高亮

**useDepartmentTree hook 增强：**
```typescript
// 过滤部门树 - 只保留匹配的部门及其父部门路径
function filterDepartmentTree(
  tree: DepartmentTreeNode[],
  matchedIds: Set<string>,
  parentIdsToKeep: Set<string>
): DepartmentTreeNode[] {
  // 递归过滤，保留匹配项及其路径
}

// 查找匹配的部门ID及其所有父部门ID
function findMatchedAndParentIds(
  departments: Department[],
  query: string
): { matchedIds: Set<string>; parentIds: Set<string> }
```

**搜索时自动展开父部门：**
```typescript
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query);
  if (query && departments) {
    const { parentIds } = findMatchedAndParentIds(departments, query);
    setExpandedIds((prev) => {
      const newExpanded = new Set(prev);
      parentIds.forEach((id) => newExpanded.add(id));
      return newExpanded;
    });
  }
}, [departments]);
```

#### 4. 部门拖拽排序 - @hello-pangea/dnd

**拖拽排序实现要点：**

```tsx
// DepartmentTree 组件支持拖拽
interface DepartmentTreeProps {
  // ...
  onReorder?: (deptId: string, newParentId: string | null, newIndex: number) => void;
  enableDrag?: boolean;
}

// 使用 @hello-pangea/dnd 实现拖拽
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="root">
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {departments.map((dept, index) => (
          <Draggable key={dept.id} draggableId={dept.id} index={index}>
            {(dragProvided, snapshot) => (
              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                {/* 拖拽句柄 */}
                <div {...dragProvided.dragHandleProps}>
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
                {/* 部门内容 */}
              </div>
            )}
          </Draggable>
        ))}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

**搜索模式下禁用拖拽：**
```tsx
const canDrag = enableDrag && !searchQuery;

<Button
  variant={enableDrag ? 'default' : 'outline'}
  onClick={() => setEnableDrag(!enableDrag)}
  disabled={!!searchQuery}
  title={searchQuery ? '搜索模式下无法排序' : '拖拽排序'}
>
  {enableDrag ? '完成排序' : '排序'}
</Button>
```

**后端 API 更新：**
```typescript
// departments.ts
export interface UpdateDepartmentSortRequest {
  items: {
    id: string;
    parentId: string | null;
    sortOrder: number;
  }[];
}

updateDepartmentSort: (data: UpdateDepartmentSortRequest) =>
  apiClient.put('/departments/sort', data),
```

**关键经验：**

| 功能 | 技术方案 | 注意事项 |
|------|----------|----------|
| Select 组件 | shadcn/ui Select | 使用 `__root__` 作为无父部门的标记值 |
| 错误处理 | useErrorHandler hook | 统一处理 API 错误，支持 error/warning/success |
| 搜索过滤 | filterDepartmentTree | 保留匹配项及其父部门路径 |
| 拖拽排序 | @hello-pangea/dnd | 搜索模式下禁用，避免冲突 |

---

### 经验总结：技术债清理流程

**技术债清理最佳实践：**

1. **维护 todo.md 清单**
   - 开发前写待办，完成后标记
   - 区分技术债和功能需求
   - 定期回顾，优先处理阻塞性问题

2. **统一组件设计**
   - 复用已有的设计模式（如 UserForm）
   - 使用设计系统（shadcn/ui）保持一致性
   - 记录设计规范，便于后续开发

3. **错误处理标准化**
   - 创建通用 error handler hook
   - 统一错误提示样式
   - 支持多种错误类型（error/warning/success）

4. **搜索功能增强**
   - 过滤 + 高亮双重反馈
   - 自动展开匹配项的父部门
   - 支持清空搜索回到完整视图

5. **拖拽排序 UX**
   - 提供开关控制排序模式
   - 搜索模式下禁用拖拽
   - 拖拽时显示视觉反馈（阴影、背景色变化）
   - 批量更新减少 API 调用
