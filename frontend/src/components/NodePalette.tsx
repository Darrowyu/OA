import React from 'react';
import { Play, User, GitBranch, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 节点类型定义
export type PaletteNodeType = 'start' | 'approval' | 'condition' | 'parallel' | 'end';

// 节点工具栏项
interface PaletteItem {
  type: PaletteNodeType;
  icon: React.ReactNode;
  label: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

// 工具栏配置
const paletteItems: PaletteItem[] = [
  {
    type: 'start',
    icon: <Play className="h-5 w-5" />,
    label: '开始节点',
    description: '流程的起点',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-600',
  },
  {
    type: 'approval',
    icon: <User className="h-5 w-5" />,
    label: '审批节点',
    description: '单人审批处理',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
  },
  {
    type: 'condition',
    icon: <GitBranch className="h-5 w-5" />,
    label: '条件分支',
    description: '根据条件路由',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-600',
  },
  {
    type: 'parallel',
    icon: <Users className="h-5 w-5" />,
    label: '并行审批',
    description: '多人同时审批',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600',
  },
  {
    type: 'end',
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: '结束节点',
    description: '流程的终点',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
  },
];

// 节点工具栏组件属性
interface NodePaletteProps {
  onDragStart: (type: PaletteNodeType) => (event: React.DragEvent) => void;
  className?: string;
}

// 节点工具栏组件
export function NodePalette({ onDragStart, className }: NodePaletteProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm p-3',
        'flex flex-col gap-2',
        className
      )}
    >
      <div className="text-xs font-medium text-gray-500 px-1 mb-1">
        拖拽添加节点
      </div>

      {paletteItems.map((item) => (
        <div
          key={item.type}
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-lg cursor-grab',
            'border-2 transition-all duration-200',
            'hover:shadow-md hover:scale-[1.02] active:cursor-grabbing',
            item.bgColor,
            item.borderColor
          )}
          draggable
          onDragStart={onDragStart(item.type)}
          title={item.description}
        >
          <div className={cn('p-1.5 rounded-md bg-white/70', item.textColor)}>
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn('text-sm font-medium', item.textColor)}>
              {item.label}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              {item.description}
            </div>
          </div>
        </div>
      ))}

      <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 px-1">
        提示: 拖拽到画布添加节点
      </div>
    </div>
  );
}

// 默认导出
export default NodePalette;
