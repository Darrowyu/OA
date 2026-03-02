import { useState } from 'react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 预定义功能列表
const PREDEFINED_FUNCTIONS = [
  { name: '报销申请', path: '/approval/new?type=reimbursement', icon: 'Receipt' },
  { name: '请假申请', path: '/approval/new?type=leave', icon: 'Calendar' },
  { name: '加班申请', path: '/approval/new?type=overtime', icon: 'Clock' },
  { name: '打卡签到', path: '/attendance/clock-in', icon: 'MapPin' },
  { name: '会议室预订', path: '/meetings/booking', icon: 'Video' },
  { name: '新建任务', path: '/tasks/new', icon: 'PlusSquare' },
  { name: '新建公告', path: '/announcements/new', icon: 'Bell' },
  { name: '设备报修', path: '/equipment/maintenance/records/new', icon: 'Wrench' },
  { name: '配件领用', path: '/equipment/parts/usage/new', icon: 'Package' },
  { name: '文档中心', path: '/documents', icon: 'FolderOpen' },
  { name: '报表中心', path: '/reports', icon: 'BarChart3' },
  { name: '通讯录', path: '/contacts', icon: 'Users' },
];

// 常用图标列表
const COMMON_ICONS = [
  'Link', 'LayoutGrid', 'KanbanSquare', 'FolderOpen', 'Users', 'Bell',
  'FileCheck', 'List', 'Plus', 'CheckCircle', 'Monitor', 'Gauge',
  'Zap', 'Calendar', 'Clock', 'Video', 'BarChart3', 'Settings',
  'HelpCircle', 'Receipt', 'PlusSquare', 'MapPin', 'Wrench', 'Package',
  'ClipboardList', 'FileText', 'Home', 'Star', 'Heart',
  'Bookmark', 'Flag', 'Tag', 'Mail', 'Phone', 'MessageSquare',
];

interface AddQuickLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; path: string; icon: string }) => void;
  currentCount: number;
  maxCount?: number;
  isPending?: boolean;
}

export function AddQuickLinkDialog({
  open,
  onOpenChange,
  onSubmit,
  currentCount,
  maxCount = 10,
  isPending = false,
}: AddQuickLinkDialogProps) {
  const [newLink, setNewLink] = useState({
    name: '',
    path: '',
    icon: 'Link',
  });

  const handlePredefinedSelect = (value: string) => {
    const predefined = PREDEFINED_FUNCTIONS.find((f) => f.name === value);
    if (predefined) {
      setNewLink({
        name: predefined.name,
        path: predefined.path,
        icon: predefined.icon,
      });
    }
  };

  const handleSubmit = () => {
    if (newLink.name && newLink.path && newLink.icon) {
      onSubmit(newLink);
      setNewLink({ name: '', path: '', icon: 'Link' });
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加快捷入口 ({currentCount}/{maxCount})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">选择常用功能</label>
            <Select onValueChange={handlePredefinedSelect}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择预设功能或自定义" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_FUNCTIONS.map((func) => (
                  <SelectItem key={func.path} value={func.name}>
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">名称</label>
            <Input
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              placeholder="显示名称"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">路径</label>
            <Input
              value={newLink.path}
              onChange={(e) => setNewLink({ ...newLink, path: e.target.value })}
              placeholder="例如：/approval/new"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">图标</label>
            <Select
              value={newLink.icon}
              onValueChange={(value) => setNewLink({ ...newLink, icon: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {COMMON_ICONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    <div className="flex items-center gap-2">
                      {renderIcon(icon)}
                      <span>{icon}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!newLink.name || !newLink.path || isPending}
            className="w-full"
          >
            {isPending ? '添加中...' : '添加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
