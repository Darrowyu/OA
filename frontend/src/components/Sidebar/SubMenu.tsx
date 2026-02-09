import { memo, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getIcon } from './iconMap';
import type { SubMenuItem } from './types';

// SubMenu组件属性
interface SubMenuProps {
  title: string;
  icon: string;
  items: SubMenuItem[];
  isExpanded: boolean;
  isCollapsed: boolean;
  isActive: boolean;
  textVariants: Variants;
  onToggle: () => void;
  nestedLevel?: number;
}

// 子菜单组件
export const SubMenu = memo(function SubMenu({
  title,
  icon,
  items,
  isExpanded,
  isCollapsed,
  isActive,
  textVariants,
  onToggle,
  nestedLevel = 0,
}: SubMenuProps) {
  const location = useLocation();
  const Icon = getIcon(icon);

  // 计算总的待办数量
  const totalBadge = items.reduce((sum, item) => sum + (item.badge || 0), 0);

  // 切换展开状态
  const handleToggle = useCallback(() => {
    if (!isCollapsed) {
      onToggle();
    }
  }, [isCollapsed, onToggle]);

  // 判断是否子项激活
  const isItemActive = useCallback(
    (path: string) => {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  return (
    <div>
      {/* 菜单标题按钮 */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center rounded-lg text-sm transition-all duration-300 group relative',
          isActive
            ? 'bg-gray-100 text-gray-900 font-medium'
            : 'text-gray-600 hover:bg-gray-50',
          isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
          nestedLevel > 0 && 'px-3 py-1.5 text-gray-500 hover:text-gray-700'
        )}
      >
        <Icon className={cn('flex-shrink-0', nestedLevel > 0 ? 'h-4 w-4' : 'h-5 w-5')} />

        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              variants={textVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 whitespace-nowrap text-left overflow-hidden"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>

        {/* 展开箭头 */}
        {!isCollapsed && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown
              className={cn(
                'flex-shrink-0',
                nestedLevel > 0 ? 'h-3 w-3 text-gray-400' : 'h-4 w-4 text-gray-400'
              )}
            />
          </motion.div>
        )}

        {/* 徽章 */}
        {!isCollapsed && totalBadge > 0 && (
          <Badge
            variant="secondary"
            className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600"
          >
            {totalBadge > 99 ? '99+' : totalBadge}
          </Badge>
        )}

        {/* 折叠状态下的tooltip */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {title}
          </div>
        )}
      </button>

      {/* 子菜单项 */}
      <AnimatePresence>
        {!isCollapsed && isExpanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'pt-1 pb-1 pl-4 border-l-2 border-gray-100 space-y-1',
                nestedLevel === 0 ? 'ml-5' : 'ml-3'
              )}
            >
              {items
                .filter((item) => item.show !== false)
                .map((item) => {
                  const ItemIcon = getIcon(item.icon);
                  const active = isItemActive(item.path);

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={cn(
                          'flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5',
                          active
                            ? 'bg-gray-50 text-gray-900 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <ItemIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 whitespace-nowrap">{item.name}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge
                            variant="secondary"
                            className="h-4 min-w-4 flex items-center justify-center text-xs bg-red-100 text-red-600"
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
});
