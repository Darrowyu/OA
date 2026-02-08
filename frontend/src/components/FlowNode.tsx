import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Play, User, GitBranch, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 节点类型定义
export type FlowNodeType = 'start' | 'approval' | 'condition' | 'parallel' | 'end' | string;

// 节点数据接口 - 使用 Record 来满足 React Flow 的类型要求
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  assignee?: string;
  assigneeType?: 'user' | 'role' | 'department' | 'applicant';
  condition?: string;
  parallelType?: 'all' | 'any';
  timeout?: number;
  reminder?: number;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}

// 节点类型配置
const nodeConfig: Record<FlowNodeType, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  start: {
    icon: <Play className="h-4 w-4" />,
    label: '开始',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
  },
  approval: {
    icon: <User className="h-4 w-4" />,
    label: '审批',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700',
  },
  condition: {
    icon: <GitBranch className="h-4 w-4" />,
    label: '条件',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-700',
  },
  parallel: {
    icon: <Users className="h-4 w-4" />,
    label: '并行',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-700',
  },
  end: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: '结束',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-700',
  },
};

// 流程节点组件
export function FlowNodeComponent({ data, selected, type }: NodeProps<FlowNodeData>) {
  const config = nodeConfig[type as FlowNodeType] || nodeConfig.approval;
  const isParallel = type === 'parallel';
  const isCondition = type === 'condition';

  return (
    <div
      className={cn(
        'relative min-w-[140px] max-w-[200px] cursor-pointer transition-all duration-200',
        'rounded-lg border-2 shadow-sm hover:shadow-md',
        config.bgColor,
        config.borderColor,
        selected && 'ring-2 ring-offset-2 ring-blue-500 shadow-lg'
      )}
      onClick={data.onClick}
    >
      {/* 输入连接点 - 开始节点除外 */}
      {type !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* 节点内容 */}
      <div className="px-4 py-3">
        {/* 节点头部 */}
        <div className="flex items-center gap-2 mb-1">
          <div className={cn('p-1 rounded', config.bgColor, config.textColor)}>
            {config.icon}
          </div>
          <span className={cn('text-xs font-medium', config.textColor)}>
            {config.label}
          </span>
          {isParallel && data.parallelType && (
            <span className="text-[10px] px-1.5 py-0.5 bg-white rounded-full text-gray-600">
              {data.parallelType === 'all' ? '会签' : '或签'}
            </span>
          )}
        </div>

        {/* 节点标题 */}
        <div className="font-medium text-sm text-gray-900 truncate" title={data.label}>
          {data.label}
        </div>

        {/* 条件表达式 */}
        {isCondition && data.condition && (
          <div className="mt-1 text-[10px] text-gray-500 bg-white/50 px-1.5 py-0.5 rounded truncate">
            {data.condition}
          </div>
        )}

        {/* 审批人信息 */}
        {(type === 'approval' || type === 'parallel') && data.assigneeType && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
            <span className="text-gray-400">
              {data.assigneeType === 'user' && '指定人'}
              {data.assigneeType === 'role' && '角色'}
              {data.assigneeType === 'department' && '部门'}
              {data.assigneeType === 'applicant' && '申请人'}
            </span>
            {data.assignee && (
              <span className="truncate">: {data.assignee}</span>
            )}
          </div>
        )}

        {/* 超时设置 */}
        {data.timeout && data.timeout > 0 && (
          <div className="mt-1 text-[10px] text-orange-500">
            超时: {data.timeout}h
          </div>
        )}
      </div>

      {/* 输出连接点 - 结束节点除外 */}
      {type !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* 条件节点需要左右连接点 */}
      {isCondition && (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Right}
            className="!w-3 !h-3 !bg-green-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            id="false"
            position={Position.Right}
            className="!w-3 !h-3 !bg-red-400 !border-2 !border-white"
            style={{ top: '70%' }}
          />
        </>
      )}

      {/* 并行节点需要多个输出连接点 */}
      {isParallel && (
        <>
          <Handle
            type="source"
            id="out1"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white"
            style={{ left: '30%' }}
          />
          <Handle
            type="source"
            id="out2"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white"
            style={{ left: '70%' }}
          />
        </>
      )}
    </div>
  );
}

// 默认导出
export default FlowNodeComponent;
