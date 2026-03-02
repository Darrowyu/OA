import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { quickLinkApi } from '@/services/quickLinkApi';
import type { NavItem as NavItemType } from './types';
import { QuickLinkItem } from './QuickLinkItem';
import { AddQuickLinkDialog } from './AddQuickLinkDialog';

const MAX_QUICK_LINKS = 10;

// 动画配置
const titleAnimation = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.15 }
};

interface QuickLinksSectionProps {
  isCollapsed: boolean;
}

export function QuickLinksSection({ isCollapsed }: QuickLinksSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: response } = useQuery({
    queryKey: ['quickLinks'],
    queryFn: quickLinkApi.getQuickLinks,
  });
  const quickLinks = response?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: quickLinkApi.deleteQuickLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
      toast.success('已删除');
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: quickLinkApi.reorderQuickLinks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || '排序失败');
    },
  });

  const createMutation = useMutation({
    mutationFn: quickLinkApi.createQuickLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks'] });
      toast.success('已添加');
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || '添加失败');
    },
  });

// 重新排序快捷入口
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= quickLinks.length) return;
    const newItems = Array.from(quickLinks);
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    reorderMutation.mutate(newItems.map((item, idx) => ({ id: item.id, sortOrder: idx })));
  };

  const handleMoveUp = (index: number) => handleReorder(index, index - 1);
  const handleMoveDown = (index: number) => handleReorder(index, index + 1);

  // 转换为 NavItem 格式
  const navItems: NavItemType[] = quickLinks.map((link) => ({
    path: link.path,
    name: link.name,
    icon: link.icon,
    show: link.isActive,
  }));

  if (navItems.length === 0 && !isEditing) {
    return (
      <div className="mt-6 px-3">
        <AnimatePresence mode="wait" initial={false}>
          {!isCollapsed && (
            <motion.div
              variants={titleAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center justify-between mb-2"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                快捷入口
              </span>
              <button
                onClick={() => setIsAddDialogOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                title="添加快捷入口"
              >
                <Plus className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {!isCollapsed && (
          <div className="text-xs text-gray-400 py-2 px-3">
            点击 + 添加常用功能
          </div>
        )}
        <AddQuickLinkDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={(data) => createMutation.mutate(data)}
          currentCount={quickLinks.length}
          isPending={createMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* 区块标题 */}
      <div className="h-5 px-3 mb-2">
        <AnimatePresence mode="wait" initial={false}>
          {!isCollapsed && (
            <motion.div
              variants={titleAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center justify-between"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                快捷入口
              </span>
              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                      title="添加快捷入口"
                      disabled={quickLinks.length >= MAX_QUICK_LINKS}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                      title="管理快捷入口"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                    title="完成"
                  >
                    <span className="text-xs">完成</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 导航项列表 */}
      <ul className="space-y-1 px-2">
        {navItems.map((item, index) => (
          <QuickLinkItem
            key={item.path}
            item={item}
            linkId={quickLinks[index].id}
            index={index}
            isEditing={isEditing}
            isCollapsed={isCollapsed}
            isFirst={index === 0}
            isLast={index === navItems.length - 1}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </ul>

      {/* 添加对话框 */}
      <AddQuickLinkDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        currentCount={quickLinks.length}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
