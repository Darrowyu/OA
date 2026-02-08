import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { cn } from '@/lib/utils';

// 流程连线组件
export function FlowEdgeComponent({
  // id - 保留用于未来使用
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
  markerEnd,
  style = {},
}: EdgeProps) {
  // 使用平滑路径
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const isCondition = data?.condition || label;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#3b82f6' : style.stroke || '#94a3b8',
        }}
      />

      {/* 条件标签 */}
      {isCondition && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan pointer-events-auto absolute px-2 py-1 text-xs rounded-full',
              'bg-white border shadow-sm transition-all',
              selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200',
              // 根据条件值设置颜色
              label === '同意' || label === '通过' || (typeof data?.condition === 'string' && data.condition.includes('true'))
                ? 'text-green-600 border-green-200 bg-green-50'
                : label === '驳回' || label === '拒绝' || (typeof data?.condition === 'string' && data.condition.includes('false'))
                ? 'text-red-600 border-red-200 bg-red-50'
                : 'text-gray-600'
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {(data?.condition as string) || label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// 默认导出
export default FlowEdgeComponent;
