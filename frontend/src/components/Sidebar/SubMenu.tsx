import { memo, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getIcon } from './iconMap';
import type { SubMenuItem } from './types';

interface SubMenuProps {
  title: string;
  icon: string;
  items: SubMenuItem[];
  isExpanded: boolean;
  isCollapsed: boolean;
  isActive: boolean;
  onToggle: () => void;
  nestedLevel?: number;
}

// 子菜单组件 - 支持折叠时弹出菜单
export const SubMenu = memo(function SubMenu({
  title,
  icon,
  items,
  isExpanded,
  isCollapsed,
  isActive,
  onToggle,
  nestedLevel = 0,
}: SubMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const Icon = getIcon(icon);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  const openPopup = useCallback(() => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.top, left: rect.right });
    }
    setIsPopupOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setIsPopupOpen(false), 150);
  }, []);

  const totalBadge = items.reduce((sum, item) => sum + (item.badge || 0), 0);

  const handleClick = useCallback(() => {
    if (isCollapsed) {
      openPopup();
    } else {
      onToggle();
    }
  }, [isCollapsed, onToggle, openPopup]);

  const handleItemClick = useCallback((path: string) => {
    setIsPopupOpen(false);
    navigate(path);
  }, [navigate]);

  const isItemActive = useCallback(
    (path: string) => {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  const visibleItems = items.filter((item) => item.show !== false);

  return (
    <div className="relative">
      {/* 菜单标题按钮 */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => isCollapsed && openPopup()}
        onMouseLeave={() => isCollapsed && scheduleClose()}
        className={cn(
          'w-full flex items-center rounded-lg text-sm transition-colors duration-150 group relative',
          isActive
            ? 'bg-gray-100 text-gray-900 font-medium'
            : 'text-gray-600 hover:bg-gray-50',
          isCollapsed ? 'px-3 py-2.5' : 'px-3 py-2',
          nestedLevel > 0 && 'px-3 py-1.5 text-gray-500 hover:text-gray-700'
        )}
      >
        {/* 图标 */}
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <Icon className={cn(nestedLevel > 0 ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>

        {/* 文字容器 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out text-left',
            isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3 flex-1'
          )}
        >
          <span className="whitespace-nowrap">{title}</span>
        </div>

        {/* 展开箭头 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out flex-shrink-0',
            isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-2'
          )}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown
              className={cn(
                nestedLevel > 0 ? 'h-3 w-3 text-gray-400' : 'h-4 w-4 text-gray-400'
              )}
            />
          </motion.div>
        </div>

        {/* 徽章 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out flex-shrink-0',
            isCollapsed || totalBadge <= 0 ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-2'
          )}
        >
          {totalBadge > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600"
            >
              {totalBadge > 99 ? '99+' : totalBadge}
            </Badge>
          )}
        </div>

        {/* 折叠状态tooltip */}
        {isCollapsed && !isPopupOpen && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-40 pointer-events-none">
            {title}
          </div>
        )}
      </button>

      {/* 折叠状态弹出菜单 - Portal渲染到body，脱离nav的overflow裁剪 */}
      {isCollapsed && isPopupOpen && createPortal(
        <div
          className="fixed z-[100]"
          style={{ top: popupPos.top, left: popupPos.left }}
          onMouseEnter={openPopup}
          onMouseLeave={scheduleClose}
        >
          {/* 透明桥接区域 */}
          <div className="absolute left-0 top-0 w-2 h-full" />
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
          >
            {/* 弹出菜单标题 */}
            <div className="px-3 py-2 border-b border-gray-100 mb-1">
              <span className="font-medium text-gray-900">{title}</span>
              {totalBadge > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-4 min-w-4 flex items-center justify-center text-xs bg-red-100 text-red-600"
                >
                  {totalBadge > 99 ? '99+' : totalBadge}
                </Badge>
              )}
            </div>

            {/* 子菜单项 */}
            <div className="max-h-64 overflow-y-auto">
              {visibleItems.map((item) => {
                const ItemIcon = getIcon(item.icon);
                const active = isItemActive(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => handleItemClick(item.path)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-gray-50 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <ItemIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left whitespace-nowrap">{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 min-w-4 flex items-center justify-center text-xs bg-red-100 text-red-600"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* 展开状态下的子菜单 */}
      <AnimatePresence>
        {!isCollapsed && isExpanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'pt-1 pb-1 pl-4 border-l-2 border-gray-100 space-y-1',
                nestedLevel === 0 ? 'ml-5' : 'ml-3'
              )}
            >
              {visibleItems.map((item) => {
                const ItemIcon = getIcon(item.icon);
                const active = isItemActive(item.path);

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2 rounded-lg text-sm transition-all duration-150 px-3 py-1.5',
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
