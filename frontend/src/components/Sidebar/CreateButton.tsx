import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// CreateButton组件属性
interface CreateButtonProps {
  isCollapsed: boolean;
}

// 新建按钮组件 - 单图标固定方案
export const CreateButton = memo(function CreateButton({
  isCollapsed,
}: CreateButtonProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate('/approval/new');
  }, [navigate]);

  return (
    <div className="px-4 py-4">
      <Button
        className={cn(
          'bg-gray-900 hover:bg-gray-800 text-white transition-colors duration-150 flex items-center',
          isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full justify-start px-4'
        )}
        onClick={handleClick}
      >
        {/* 图标 - 始终固定 */}
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <Plus className="h-4 w-4" />
        </div>

        {/* 文字容器 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-2'
          )}
        >
          <span className="whitespace-nowrap">新建申请</span>
        </div>
      </Button>
    </div>
  );
});
