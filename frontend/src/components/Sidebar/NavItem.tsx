import { memo, useCallback } from 'react';
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
        'flex items-center rounded-lg text-sm transition-colors duration-150 group relative',
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

      {/* 文字容器 - 宽度动画实现平滑展开/收起 */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'
        )}
      >
        <span className="whitespace-nowrap">{item.name}</span>
      </div>

      {/* 徽章 - 仅展开时显示 */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out flex-shrink-0',
          isCollapsed || !item.badge || item.badge <= 0 ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-2'
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

      {/* 折叠状态下的tooltip */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {item.name}
        </div>
      )}
    </NavLink>
  );
});
