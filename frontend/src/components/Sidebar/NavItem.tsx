import { memo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getIcon } from './iconMap';
import type { NavItem as NavItemType } from './types';

// NavItem组件属性
interface NavItemProps {
  item: NavItemType;
  isCollapsed: boolean;
  textVariants: Variants;
  isNested?: boolean;
  onClick?: () => void;
}

// 导航项组件
export const NavItem = memo(function NavItem({
  item,
  isCollapsed,
  textVariants,
  isNested = false,
  onClick,
}: NavItemProps) {
  const location = useLocation();
  const Icon = getIcon(item.icon);

  // 判断是否激活
  const isActive = item.active ?? (
    item.path === '/dashboard'
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );

  // 处理点击
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <NavLink
      to={item.path}
      onClick={handleClick}
      className={cn(
        'flex items-center rounded-lg text-sm transition-all duration-300 group relative',
        isActive
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-600 hover:bg-gray-50',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
        isNested && 'px-3 py-1.5'
      )}
    >
      <Icon className={cn('flex-shrink-0', isNested ? 'h-4 w-4' : 'h-5 w-5')} />

      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            variants={textVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 whitespace-nowrap overflow-hidden"
          >
            {item.name}
          </motion.span>
        )}
      </AnimatePresence>

      {/* 徽章 */}
      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
        <Badge
          variant="secondary"
          className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600"
        >
          {item.badge > 99 ? '99+' : item.badge}
        </Badge>
      )}

      {/* 折叠状态下的tooltip */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {item.name}
        </div>
      )}
    </NavLink>
  );
});
