import { memo, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getIcon } from './iconMap';
import type { NavItem as NavItemType } from './types';

// NavItem组件属性
interface NavItemProps {
  item: NavItemType;
  isCollapsed: boolean;
  isNested?: boolean;
  onClick?: () => void;
}

// 导航项组件 - 单图标固定方案
export const NavItem = memo(function NavItem({
  item,
  isCollapsed,
  isNested = false,
  onClick,
}: NavItemProps) {
  const location = useLocation();
  const Icon = getIcon(item.icon);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

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

  // 处理鼠标进入 - 计算tooltip位置
  const handleMouseEnter = useCallback(() => {
    if (isCollapsed && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right });
      setShowTooltip(true);
    }
  }, [isCollapsed]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return (
    <>
      <NavLink
        ref={linkRef}
        to={item.path}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'w-full flex items-center rounded-lg text-sm transition-colors duration-150 group relative',
          isActive
            ? 'bg-gray-100 text-gray-900 font-medium'
            : 'text-gray-600 hover:bg-gray-50',
          isCollapsed ? 'px-3 py-2.5' : 'px-3 py-2',
          isNested && 'px-3 py-1.5'
        )}
      >
        {/* 图标 - 始终固定在左侧，位置永不移动 */}
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <Icon className={cn(isNested ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>

        {/* 文字容器 - 使用max-width动画避免跳动 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out flex-1',
            isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'
          )}
        >
          <span className="whitespace-nowrap">{item.name}</span>
        </div>

        {/* 徽章 - 仅展开时显示，使用max-width避免跳动 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out flex-shrink-0',
            isCollapsed || !item.badge || item.badge <= 0 ? 'max-w-0 opacity-0 ml-0' : 'max-w-[60px] opacity-100 ml-2'
          )}
        >
          {item.badge !== undefined && item.badge > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600"
            >
              {item.badge > 99 ? '99+' : item.badge}
            </Badge>
          )}
        </div>
      </NavLink>

      {/* 折叠状态下的tooltip - 淡色样式，使用Portal渲染到body确保在最上层 */}
      {isCollapsed && showTooltip && createPortal(
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="ml-2 px-3 py-1.5 bg-white text-gray-700 text-xs rounded-md whitespace-nowrap shadow-lg border border-gray-200">
            {item.name}
          </div>
        </div>,
        document.body
      )}
    </>
  );
});
