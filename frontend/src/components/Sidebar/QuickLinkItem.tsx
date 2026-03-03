import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { NavItem } from './NavItem';
import type { NavItem as NavItemType } from './types';

interface QuickLinkItemProps {
  item: NavItemType;
  linkId: string;
  index: number;
  isEditing: boolean;
  isCollapsed: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (id: string) => void;
}

export function QuickLinkItem({
  item,
  linkId,
  index,
  isEditing,
  isCollapsed,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: QuickLinkItemProps) {
  return (
    <li className="group relative">
      <NavItem item={item} isCollapsed={isCollapsed} />
      {isEditing && !isCollapsed && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 pl-2">
          <button
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={isLast}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(linkId)}
            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </li>
  );
}
