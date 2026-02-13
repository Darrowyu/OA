import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Play,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { workflowApi, Workflow } from '@/services/workflows';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

// 业务类型选项
const entityTypeOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'Application', label: '审批申请' },
  { value: 'LeaveRequest', label: '请假申请' },
  { value: 'Equipment', label: '设备管理' },
  { value: 'Maintenance', label: '保养维修' },
];

export default function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityType, setEntityType] = useState('all');

  // 删除对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  // 创建对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    entityType: 'Application',
  });

  useEffect(() => {
    loadWorkflows();
  }, [entityType]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await workflowApi.getWorkflows(entityType === 'all' ? undefined : entityType);
      if (response.success) {
        setWorkflows(response.data);
      }
    } catch (error) {
      logger.error('加载工作流失败', { error });
      toast.error('加载工作流失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!workflowToDelete) return;

    try {
      await workflowApi.deleteWorkflow(workflowToDelete.id);
      toast.success('删除成功');
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowToDelete.id));
    } catch (error) {
      logger.error('删除工作流失败', { error });
      toast.error('删除失败');
    } finally {
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleCreate = async () => {
    if (!newWorkflow.name || !newWorkflow.entityType) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      // 创建带有默认开始和结束节点的流程
      const response = await workflowApi.createWorkflow({
        name: newWorkflow.name,
        description: newWorkflow.description,
        entityType: newWorkflow.entityType,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: '开始' },
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 100, y: 300 },
            data: { label: '结束' },
          },
        ],
        edges: [],
      });

      if (response.success) {
        toast.success('创建成功');
        navigate(`/workflow/designer/${response.data.id}`);
      }
    } catch (error) {
      logger.error('创建工作流失败', { error });
      toast.error('创建失败');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await workflowApi.setDefaultWorkflow(id);
      if (response.success) {
        toast.success('已设为默认流程');
        loadWorkflows();
      }
    } catch (error) {
      logger.error('设置默认流程失败', { error });
      toast.error('设置默认流程失败');
    }
  };

  // 过滤工作流
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 状态标签样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'ARCHIVED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return '已发布';
      case 'DRAFT':
        return '草稿';
      case 'ARCHIVED':
        return '已归档';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="p-6 max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工作流管理</h1>
            <p className="text-gray-500 mt-1">设计和管理审批流程模板</p>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建工作流
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索工作流..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="业务类型" />
            </SelectTrigger>
            <SelectContent>
              {entityTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 工作流列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card
              key={workflow.id}
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer',
                workflow.isDefault && 'ring-2 ring-blue-500'
              )}
              onClick={() => navigate(`/workflow/designer/${workflow.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {workflow.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {workflow.description || '暂无描述'}
                    </CardDescription>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workflow/designer/${workflow.id}`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workflow/designer/${workflow.id}?copy=true`);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        复制
                      </DropdownMenuItem>

                      {!workflow.isDefault && workflow.status === 'PUBLISHED' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(workflow.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          设为默认
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkflowToDelete(workflow);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      getStatusStyle(workflow.status)
                    )}
                  >
                    {getStatusText(workflow.status)}
                  </span>

                  {workflow.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      默认
                    </span>
                  )}

                  <span className="text-xs text-gray-500">
                    版本 {workflow.version}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {
                      entityTypeOptions.find((o) => o.value === workflow.entityType)
                        ?.label || workflow.entityType
                    }
                  </span>
                  <span>
                    创建于{' '}
                    {new Date(workflow.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <FileText className="h-4 w-4" />
                    <span>
                      {(workflow.nodes as unknown[])?.length || 0} 节点
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-gray-500">
                    <Play className="h-4 w-4" />
                    <span>
                      {(workflow.edges as unknown[])?.length || 0} 连线
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredWorkflows.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">暂无工作流</h3>
            <p className="text-gray-500 mt-1">
              点击"新建工作流"开始创建第一个流程模板
            </p>
          </div>
        )}
      </main>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除工作流 "{workflowToDelete?.name}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建工作流对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作流</DialogTitle>
            <DialogDescription>
              创建一个新的审批流程模板
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">流程名称</label>
              <Input
                value={newWorkflow.name}
                onChange={(e) =>
                  setNewWorkflow((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="例如：请假审批流程"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">业务类型</label>
              <Select
                value={newWorkflow.entityType}
                onValueChange={(value) =>
                  setNewWorkflow((prev) => ({ ...prev, entityType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypeOptions
                    .filter((o) => o.value)
                    .map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">流程描述</label>
              <Input
                value={newWorkflow.description}
                onChange={(e) =>
                  setNewWorkflow((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="简要描述流程用途（可选）"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
