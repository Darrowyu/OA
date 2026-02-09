import { memo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NavItem } from './NavItem';
import type { NavItem as NavItemType } from './types';

// NavSection组件属性
interface NavSectionProps {
  title?: string;
  items: NavItemType[];
  isCollapsed: boolean;
  textVariants: Variants;
  className?: string;
  showTitle?: boolean;
}

// 导航区块组件
export const NavSection = memo(function NavSection({
  title,
  items,
  isCollapsed,
  textVariants,
  className,
  showTitle = true,
}: NavSectionProps) {
  // 过滤掉show为false的项
  const visibleItems = items.filter((item) => item.show !== false);

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn('mt-6', className)}>
      {/* 区块标题 */}
      <AnimatePresence>
        {!isCollapsed && showTitle && title && (
          <motion.div
            variants={textVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-between px-3 mb-2 overflow-hidden"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {title}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 导航项列表 */}
      <ul className="space-y-1">
        {visibleItems.map((item) => (
          <li key={item.path}>
            <NavItem
              item={item}
              isCollapsed={isCollapsed}
              textVariants={textVariants}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});
