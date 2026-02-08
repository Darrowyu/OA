import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Save,
  Play,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkflowCanvas } from '@/components/WorkflowCanvas';
import { workflowApi, Workflow, FlowNode, FlowEdge, SimulationResult } from '@/services/workflows';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// 审批人类型选项
const assigneeTypeOptions = [
  { value: 'user', label: '指定用户' },
  { value: 'role', label: '按角色' },
  { value: 'department', label: '按部门' },
  { value: 'applicant', label: '申请人' },
];

// 并行类型选项
const parallelTypeOptions = [
  { value: 'all', label: '会签（全部通过）' },
  { value: 'any', label: '或签（一人通过）' },
];

export default function WorkflowDesigner() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isCopy = searchParams.get('copy') === 'true';

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 节点配置面板
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false);

  // 模拟测试
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateResult, setSimulateResult] = useState<SimulationResult | null>(null);
  const [testVariables, setTestVariables] = useState('{}');

  // 加载工作流
  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    }
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    setLoading(true);
    try {
      const response = await workflowApi.getWorkflowById(workflowId);
      if (response.success) {
        const data = response.data;
        if (isCopy) {
          // 复制模式：重置ID和状态
          data.id = '';
          data.name = `${data.name} (复制)`;
          data.status = 'DRAFT';
          data.version = 1;
        }
        setWorkflow(data);

        // 转换节点格式
        const flowNodes: Node[] = (data.nodes || []).map((n: FlowNode) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            ...n.data,
            onClick: () => handleNodeSelect(n.id),
          },
        }));

        // 转换连线格式
        const flowEdges: Edge[] = (data.edges || []).map((e: FlowEdge) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: 'default',
          animated: true,
          style: { stroke: '#94a3b8' },
          data: { condition: e.condition },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (error) {
      console.error('加载工作流失败:', error);
      toast.error('加载工作流失败');
    } finally {
      setLoading(false);
    }
  };

  // 画布变化回调
  const handleCanvasChange = (newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  };

  // 节点选择
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setNodeConfigOpen(true);
  };

  // 获取当前选中节点
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // 更新节点配置
  const handleUpdateNode = (updates: Partial<FlowNode['data']>) => {
    if (!selectedNodeId) return;

    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              data: { ...n.data, ...updates },
            }
          : n
      )
    );
  };

  // 删除节点
  const handleDeleteNode = () => {
    if (!selectedNodeId) return;

    if (confirm('确定要删除这个节点吗？')) {
      setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
      );
      setNodeConfigOpen(false);
      setSelectedNodeId(null);
    }
  };

  // 保存工作流
  const handleSave = async () => {
    if (!workflow) return;

    setSaving(true);
    try {
      // 转换回保存格式
      const saveNodes: FlowNode[] = nodes.map((n) => ({
        id: n.id,
        type: n.type as FlowNode['type'],
        position: n.position,
        data: {
          label: n.data.label,
          assignee: n.data.assignee,
          assigneeType: n.data.assigneeType,
          condition: n.data.condition,
          parallelType: n.data.parallelType,
          timeout: n.data.timeout,
          reminder: n.data.reminder,
          description: n.data.description,
        },
      }));

      const saveEdges: FlowEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        condition: e.data?.condition,
      }));

      if (isCopy || !workflow.id) {
        // 创建新工作流
        const response = await workflowApi.createWorkflow({
          name: workflow.name,
          description: workflow.description,
          entityType: workflow.entityType,
          nodes: saveNodes,
          edges: saveEdges,
        });
        if (response.success) {
          toast.success('工作流创建成功');
          navigate(`/workflow/designer/${response.data.id}`);
        }
      } else {
        // 更新现有工作流
        const response = await workflowApi.updateWorkflow(workflow.id, {
          name: workflow.name,
          description: workflow.description,
          nodes: saveNodes,
          edges: saveEdges,
        });
        if (response.success) {
          toast.success('保存成功');
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 发布工作流
  const handlePublish = async () => {
    if (!workflow?.id) return;

    try {
      const response = await workflowApi.publishWorkflow(workflow.id);
      if (response.success) {
        toast.success('工作流已发布');
        setWorkflow(response.data);
      }
    } catch (error) {
      console.error('发布失败:', error);
      toast.error('发布失败');
    }
  };

  // 模拟测试
  const handleSimulate = async () => {
    if (!workflow?.id) return;

    setSimulateLoading(true);
    try {
      let variables = {};
      try {
        variables = JSON.parse(testVariables);
      } catch {
        toast.error('变量格式错误');
        return;
      }

      const response = await workflowApi.simulateWorkflow(workflow.id, variables);
      if (response.success) {
        setSimulateResult(response.data);
      }
    } catch (error) {
      console.error('模拟失败:', error);
      toast.error('模拟失败');
    } finally {
      setSimulateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* 工具栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/workflow')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col">
              <Input
                value={workflow?.name || ''}
                onChange={(e) =>
                  setWorkflow((prev) => (prev ? { ...prev, name: e.target.value } : null))
                }
                className="h-8 font-semibold text-lg border-none px-0 focus-visible:ring-0"
                placeholder="流程名称"
              />
              <Input
                value={workflow?.description || ''}
                onChange={(e) =>
                  setWorkflow((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                className="h-6 text-sm text-gray-500 border-none px-0 focus-visible:ring-0"
                placeholder="流程描述（可选）"
              />
            </div>

            {workflow?.status === 'PUBLISHED' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                已发布
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSimulateOpen(true)}
              disabled={!workflow?.id}
            >
              <Play className="h-4 w-4 mr-2" />
              模拟测试
            </Button>

            {workflow?.status !== 'PUBLISHED' && !isCopy && (
              <Button
                variant="outline"
                onClick={handlePublish}
                disabled={!workflow?.id}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                发布
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 hover:bg-gray-800"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 p-4">
        <WorkflowCanvas
          initialNodes={nodes}
          initialEdges={edges}
          onChange={handleCanvasChange}
          onNodeSelect={handleNodeSelect}
          readOnly={workflow?.status === 'PUBLISHED' && !isCopy}
        />
      </div>

      {/* 节点配置面板 */}
      <Sheet open={nodeConfigOpen} onOpenChange={setNodeConfigOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>节点配置</SheetTitle>
            <SheetDescription>配置当前节点的详细属性</SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>节点名称</Label>
                <Input
                  value={selectedNode.data?.label || ''}
                  onChange={(e) => handleUpdateNode({ label: e.target.value })}
                />
              </div>

              {(selectedNode.type === 'approval' || selectedNode.type === 'parallel') && (
                <>
                  <div className="grid gap-2">
                    <Label>审批类型</Label>
                    <Select
                      value={selectedNode.data?.assigneeType || 'user'}
                      onValueChange={(value) =>
                        handleUpdateNode({ assigneeType: value as FlowNode['data']['assigneeType'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedNode.data?.assigneeType !== 'applicant' && (
                    <div className="grid gap-2">
                      <Label>审批人/角色/部门</Label>
                      <Input
                        value={selectedNode.data?.assignee || ''}
                        onChange={(e) => handleUpdateNode({ assignee: e.target.value })}
                        placeholder="输入用户ID、角色名或部门名"
                      />
                    </div>
                  )}

                  {selectedNode.type === 'parallel' && (
                    <div className="grid gap-2">
                      <Label>并行类型</Label>
                      <Select
                        value={selectedNode.data?.parallelType || 'all'}
                        onValueChange={(value) =>
                          handleUpdateNode({ parallelType: value as 'all' | 'any' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {parallelTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {selectedNode.type === 'condition' && (
                <div className="grid gap-2">
                  <Label>条件表达式</Label>
                  <Textarea
                    value={selectedNode.data?.condition || ''}
                    onChange={(e) => handleUpdateNode({ condition: e.target.value })}
                    placeholder="例如: amount > 1000"
                  />
                  <p className="text-xs text-gray-500">
                    支持简单的比较运算: &gt;, &lt;, ==, !=
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label>超时时间（小时）</Label>
                <Input
                  type="number"
                  value={selectedNode.data?.timeout || ''}
                  onChange={(e) =>
                    handleUpdateNode({ timeout: parseInt(e.target.value) || undefined })
                  }
                  placeholder="不设置则不会超时"
                />
              </div>

              <div className="grid gap-2">
                <Label>节点描述</Label>
                <Textarea
                  value={selectedNode.data?.description || ''}
                  onChange={(e) => handleUpdateNode({ description: e.target.value })}
                  placeholder="节点说明（可选）"
                />
              </div>
            </div>
          )}

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setNodeConfigOpen(false)}>
              关闭
            </Button>
            {selectedNode?.type !== 'start' && selectedNode?.type !== 'end' && (
              <Button variant="destructive" onClick={handleDeleteNode}>
                删除节点
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 模拟测试对话框 */}
      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>流程模拟测试</DialogTitle>
            <DialogDescription>
              输入测试变量，验证流程执行路径
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>测试变量（JSON格式）</Label>
              <Textarea
                value={testVariables}
                onChange={(e) => setTestVariables(e.target.value)}
                placeholder='{"amount": 1500, "type": "urgent"}'
                rows={4}
              />
            </div>

            {simulateResult && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">
                  {simulateResult.success ? (
                    <span className="text-green-600">模拟成功</span>
                  ) : (
                    <span className="text-red-600">模拟失败</span>
                  )}
                </h4>

                {simulateResult.errors && simulateResult.errors.length > 0 && (
                  <div className="text-sm text-red-600 mb-3">
                    {simulateResult.errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}

                {simulateResult.path.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">执行路径:</div>
                    <div className="flex flex-wrap gap-2">
                      {simulateResult.path.map((node, index) => (
                        <React.Fragment key={node.nodeId}>
                          <span
                            className={cn(
                              'text-sm px-2 py-1 rounded',
                              node.nodeType === 'start' && 'bg-green-100 text-green-700',
                              node.nodeType === 'end' && 'bg-gray-100 text-gray-700',
                              node.nodeType === 'approval' && 'bg-blue-100 text-blue-700',
                              node.nodeType === 'condition' && 'bg-yellow-100 text-yellow-700',
                              node.nodeType === 'parallel' && 'bg-purple-100 text-purple-700'
                            )}
                          >
                            {node.nodeName}
                          </span>
                          {index < simulateResult.path.length - 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSimulateOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleSimulate} disabled={simulateLoading}>
              {simulateLoading ? '模拟中...' : '开始模拟'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
