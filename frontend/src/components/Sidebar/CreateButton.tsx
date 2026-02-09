import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// CreateButton组件属性
interface CreateButtonProps {
  isCollapsed: boolean;
  textVariants: Variants;
}

// 新建按钮组件
export const CreateButton = memo(function CreateButton({
  isCollapsed,
  textVariants,
}: CreateButtonProps) {
  const navigate = useNavigate();

  // 处理点击
  const handleClick = useCallback(() => {
    navigate('/approval/new');
  }, [navigate]);

  return (
    <div className={cn('px-4 py-4', isCollapsed ? 'flex justify-center' : '')}>
      <Button
        className={cn(
          'bg-gray-900 hover:bg-gray-800 text-white transition-all duration-300',
          isCollapsed ? 'w-10 h-10 p-0' : 'w-full'
        )}
        onClick={handleClick}
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              variants={textVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="ml-2 overflow-hidden"
            >
              新建申请
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </div>
  );
});
