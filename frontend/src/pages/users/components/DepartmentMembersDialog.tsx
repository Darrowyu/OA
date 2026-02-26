import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Department, DepartmentMember } from '@/services/departments';

interface DepartmentMembersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  members: DepartmentMember[];
}

export function DepartmentMembersDialog({
  isOpen,
  onOpenChange,
  department,
  members,
}: DepartmentMembersDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{department?.name} - 部门成员</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] mt-4">
          {members.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无成员</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  {member.position && (
                    <span className="text-xs text-gray-400">{member.position}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
