import { useState } from 'react';
import { CheckCircle, XCircle, Trash2, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BatchActionsProps {
  selectedIds: string[];
  onBatchEnable: (ids: string[]) => Promise<void>;
  onBatchDisable: (ids: string[]) => Promise<void>;
  onBatchDelete: (ids: string[]) => Promise<void>;
  onExport: () => void;
  onClearSelection: () => void;
}

type ActionType = 'enable' | 'disable' | 'delete' | null;

export function BatchActions({
  selectedIds,
  onBatchEnable,
  onBatchDisable,
  onBatchDelete,
  onExport,
  onClearSelection,
}: BatchActionsProps) {
  const [actionType, setActionType] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!actionType) return;
    setLoading(true);

    try {
      switch (actionType) {
        case 'enable':
          await onBatchEnable(selectedIds);
          break;
        case 'disable':
          await onBatchDisable(selectedIds);
          break;
        case 'delete':
          await onBatchDelete(selectedIds);
          break;
      }
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const actionConfig = {
    enable: {
      title: '批量启用用户',
      description: `确定要启用选中的 ${selectedIds.length} 个用户吗？`,
      confirmText: '启用',
      icon: CheckCircle,
      variant: 'default' as const,
    },
    disable: {
      title: '批量禁用用户',
      description: `确定要禁用选中的 ${selectedIds.length} 个用户吗？禁用后用户将无法登录系统。`,
      confirmText: '禁用',
      icon: XCircle,
      variant: 'destructive' as const,
    },
    delete: {
      title: '批量删除用户',
      description: `确定要删除选中的 ${selectedIds.length} 个用户吗？此操作不可撤销。`,
      confirmText: '删除',
      icon: Trash2,
      variant: 'destructive' as const,
    },
  };

  if (selectedIds.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <FileDown className="mr-2 h-4 w-4" />
          导出Excel
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md">
        <span className="text-sm text-blue-700 font-medium">
          已选择 {selectedIds.length} 项
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-blue-600" onClick={onClearSelection}>
          取消选择
        </Button>
        <div className="h-4 w-px bg-blue-200 mx-1" />
        <Button variant="outline" size="sm" className="h-8" onClick={() => setActionType('enable')}>
          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
          启用
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setActionType('disable')}>
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          禁用
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-red-600 hover:text-red-700"
          onClick={() => setActionType('delete')}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          删除
        </Button>
        <div className="h-4 w-px bg-blue-200 mx-1" />
        <Button variant="outline" size="sm" className="h-8" onClick={onExport}>
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          导出
        </Button>
      </div>

      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionType && actionConfig[actionType].title}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionType && actionConfig[actionType].description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={
                actionType === 'enable'
                  ? 'bg-green-600 hover:bg-green-700'
                  : actionType === 'disable' || actionType === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType && actionConfig[actionType].confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
