import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { FlowNodeComponent, FlowNodeData } from './FlowNode';
import type { ComponentType } from 'react';
import { FlowEdgeComponent } from './FlowEdge';
import { NodePalette, PaletteNodeType } from './NodePalette';
import { cn } from '@/lib/utils';

// 节点类型映射
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, ComponentType<any>> = {
  start: FlowNodeComponent,
  approval: FlowNodeComponent,
  condition: FlowNodeComponent,
  parallel: FlowNodeComponent,
  end: FlowNodeComponent,
};

const edgeTypes = {
  default: FlowEdgeComponent,
};

// Dagre布局配置
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node<FlowNodeData>[], edges: Edge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 160, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 80,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// 画布内部组件
function WorkflowCanvasInner({
  initialNodes = [],
  initialEdges = [],
  readOnly = false,
  onChange,
  onNodeSelect,
  className,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(initialNodes as Node<FlowNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  
  // 连接节点
  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        type: 'default',
        animated: true,
        style: { stroke: '#94a3b8' },
      };

      setEdges((eds) => {
        const updated = addEdge(newEdge, eds);
        onChange?.(nodes, updated);
        return updated;
      });
    },
    [setEdges, nodes, onChange, readOnly]
  );

  // 拖拽开始
  const onDragStart = useCallback(
    (nodeType: PaletteNodeType) => (event: React.DragEvent) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // 拖拽结束
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 放置节点
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly) return;

      const type = event.dataTransfer.getData('application/reactflow') as PaletteNodeType;

      if (!type) return;

      const wrapperBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!wrapperBounds) return;

      const position = screenToFlowPosition({
        x: event.clientX - wrapperBounds.left,
        y: event.clientY - wrapperBounds.top,
      });

      // 生成节点ID
      const id = `${type}-${Date.now()}`;

      // 节点默认数据
      const defaultData: Record<PaletteNodeType, Partial<FlowNodeData>> = {
        start: { label: '开始' },
        approval: { label: '审批节点', assigneeType: 'user' },
        condition: { label: '条件判断', condition: '' },
        parallel: { label: '并行审批', assigneeType: 'user', parallelType: 'all' },
        end: { label: '结束' },
      };

      const newNode: Node<FlowNodeData> = {
        id,
        type,
        position,
        data: {
          ...defaultData[type],
          onClick: () => onNodeSelect?.(id),
        } as FlowNodeData,
      };

      setNodes((nds: Node<FlowNodeData>[]) => {
        const updated = [...nds, newNode];
        onChange?.(updated, edges);
        return updated;
      });
    },
    [screenToFlowPosition, setNodes, edges, onChange, onNodeSelect, readOnly]
  );

  // 节点点击
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  // 自动布局
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'TB'
    );
    setNodes(layoutedNodes as Node<FlowNodeData>[]);
    setEdges(layoutedEdges);
    onChange?.(layoutedNodes as Node<FlowNodeData>[], layoutedEdges);
  }, [nodes, edges, setNodes, setEdges, onChange]);

  // 清空画布
  const onClear = useCallback(() => {
    if (confirm('确定要清空画布吗？所有节点和连线将被删除。')) {
      setNodes([]);
      setEdges([]);
      onChange?.([], []);
    }
  }, [setNodes, setEdges, onChange]);

  // 验证流程
  const onValidate = useCallback(() => {
    const errors: string[] = [];

    // 检查开始节点
    const startNodes = nodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('缺少开始节点');
    } else if (startNodes.length > 1) {
      errors.push('只能有一个开始节点');
    }

    // 检查结束节点
    const endNodes = nodes.filter((n) => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('缺少结束节点');
    }

    // 检查孤立节点
    const connectedIds = new Set<string>();
    edges.forEach((e) => {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    });

    nodes.forEach((node) => {
      if (
        node.type !== 'start' &&
        node.type !== 'end' &&
        !connectedIds.has(node.id)
      ) {
        errors.push(`节点 "${(node.data as FlowNodeData)?.label}" 未连接`);
      }
    });

    return errors;
  }, [nodes, edges]);

  return (
    <div
      ref={reactFlowWrapper}
      className={cn(
        'w-full h-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50',
        className
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={readOnly ? null : 'Delete'}
        connectionMode={undefined}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
      >
        <Background color="#e2e8f0" gap={16} size={1} />
        <Controls className="bg-white shadow-md border border-gray-200 rounded-lg" />
        <MiniMap
          className="bg-white shadow-md border border-gray-200 rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#22c55e';
              case 'approval':
                return '#3b82f6';
              case 'condition':
                return '#eab308';
              case 'parallel':
                return '#a855f7';
              case 'end':
                return '#6b7280';
              default:
                return '#94a3b8';
            }
          }}
        />

        {/* 工具栏面板 */}
        {!readOnly && (
          <>
            <Panel position="top-left" className="m-4">
              <NodePalette onDragStart={onDragStart} />
            </Panel>

            <Panel position="top-right" className="m-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={onLayout}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  自动布局
                </button>
                <button
                  onClick={onClear}
                  className="px-3 py-2 bg-white border border-red-200 rounded-lg shadow-sm text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  清空画布
                </button>
                <button
                  onClick={() => {
                    const errors = onValidate();
                    if (errors.length === 0) {
                      alert('流程验证通过！');
                    } else {
                      alert(`流程验证失败:\n${errors.join('\n')}`);
                    }
                  }}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-lg shadow-sm text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  验证流程
                </button>
              </div>
            </Panel>
          </>
        )}
      </ReactFlow>
    </div>
  );
}

// 画布组件属性
interface WorkflowCanvasProps {
  initialNodes?: Node<FlowNodeData>[];
  initialEdges?: Edge[];
  readOnly?: boolean;
  onChange?: (nodes: Node<FlowNodeData>[], edges: Edge[]) => void;
  onNodeSelect?: (nodeId: string) => void;
  className?: string;
}

// 导出带Provider的画布组件
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// 默认导出
export default WorkflowCanvas;
