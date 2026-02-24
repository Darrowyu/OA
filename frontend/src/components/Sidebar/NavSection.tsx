import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NavItem } from './NavItem';
import type { NavItem as NavItemType } from './types';

// NavSection组件属性
interface NavSectionProps {
  title?: string;
  items: NavItemType[];
  isCollapsed: boolean;
  className?: string;
  showTitle?: boolean;
}

// 动画配置
const titleAnimation = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.15 }
};

// 导航区块组件
export const NavSection = memo(function NavSection({
  title,
  items,
  isCollapsed,
  className,
  showTitle = true,
}: NavSectionProps) {
  // 过滤掉show为false的项
  const visibleItems = items.filter((item) => item.show !== false);

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn('mt-6', className)}>
      {/* 区块标题 - 固定高度，折叠时保持占位 */}
      <div className="h-5 px-3 mb-2">
        <AnimatePresence mode="wait" initial={false}>
          {!isCollapsed && showTitle && title && (
            <motion.div
              key={`section-title-${title}`}
              variants={titleAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center justify-between"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {title}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 导航项列表 */}
      <ul className="space-y-1">
        {visibleItems.map((item) => (
          <li key={item.path}>
            <NavItem
              item={item}
              isCollapsed={isCollapsed}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});
