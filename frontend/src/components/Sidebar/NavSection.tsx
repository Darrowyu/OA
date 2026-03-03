import { memo } from 'react';
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
      {/* 区块标题 - 使用CSS transition代替framer-motion，避免闪烁 */}
      <div
        className={cn(
          'px-3 mb-2 overflow-hidden transition-all duration-200 ease-out',
          isCollapsed || !showTitle || !title ? 'h-0 opacity-0' : 'h-5 opacity-100'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {title}
          </span>
        </div>
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
