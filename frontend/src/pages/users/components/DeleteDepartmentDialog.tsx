import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Department } from '@/services/departments';

interface DeleteDepartmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  onConfirm: () => void;
}

export function DeleteDepartmentDialog({
  isOpen,
  onOpenChange,
  department,
  onConfirm,
}: DeleteDepartmentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除部门「{department?.name}」吗？此操作不可恢复。
            {department?.children && department.children.length > 0 && (
              <p className="text-red-500 mt-2">该部门下存在子部门，无法删除。</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
