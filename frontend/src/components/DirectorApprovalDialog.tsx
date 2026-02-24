import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface DirectorApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    action: 'APPROVE' | 'REJECT';
    comment?: string;
    flowType?: 'TO_MANAGER' | 'TO_CEO' | 'COMPLETE';
    selectedManagerIds?: string[];
  }) => void;
  managers: { id: string; name: string; department?: string }[];
  loading?: boolean;
}

export function DirectorApprovalDialog({
  open,
  onClose,
  onSubmit,
  managers,
  loading,
}: DirectorApprovalDialogProps) {
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [flowType, setFlowType] = useState<'TO_MANAGER' | 'TO_CEO' | 'COMPLETE'>('TO_MANAGER');
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (action === 'REJECT' && !comment.trim()) {
      setError('拒绝时必须填写原因');
      return;
    }

    if (action === 'APPROVE' && flowType === 'TO_MANAGER' && selectedManagers.length === 0) {
      setError('请选择至少一位审批经理');
      return;
    }

    onSubmit({
      action,
      comment: comment.trim() || undefined,
      flowType: action === 'APPROVE' ? flowType : undefined,
      selectedManagerIds: flowType === 'TO_MANAGER' ? selectedManagers : undefined,
    });
  };

  const handleClose = () => {
    setAction('APPROVE');
    setComment('');
    setFlowType('TO_MANAGER');
    setSelectedManagers([]);
    setError('');
    onClose();
  };

  // 流向选项配置
  const flowOptions = [
    {
      value: 'TO_MANAGER' as const,
      label: '流转到经理审批',
      description: '需要选择一个或多个经理进行审批',
    },
    {
      value: 'TO_CEO' as const,
      label: '直接流转到CEO审批',
      description: '跳过经理审批，直接提交给CEO',
    },
    {
      value: 'COMPLETE' as const,
      label: '直接完成',
      description: '跳过经理和CEO审批，直接审批通过',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">总监审批</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 通过/拒绝选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">审批决定</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="APPROVE"
                  checked={action === 'APPROVE'}
                  onChange={(e) => setAction(e.target.value as 'APPROVE' | 'REJECT')}
                  className="w-4 h-4 text-coral focus:ring-coral"
                />
                <span>通过</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="REJECT"
                  checked={action === 'REJECT'}
                  onChange={(e) => setAction(e.target.value as 'APPROVE' | 'REJECT')}
                  className="w-4 h-4 text-red-600 focus:ring-red-600"
                />
                <span className="text-red-600">拒绝</span>
              </label>
            </div>
          </div>

          {/* 流向选择（仅通过时显示） */}
          {action === 'APPROVE' && (
            <div className="space-y-3 border rounded-xl p-4 bg-gray-50">
              <Label className="font-medium">审批流向</Label>
              <div className="space-y-3">
                {flowOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <input
                      type="radio"
                      name="flowType"
                      value={option.value}
                      checked={flowType === option.value}
                      onChange={(e) => setFlowType(e.target.value as typeof flowType)}
                      className="w-4 h-4 mt-0.5 text-coral focus:ring-coral"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* 经理选择 */}
              {flowType === 'TO_MANAGER' && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <Label className="font-medium text-sm">选择审批经理 <span className="text-red-500">*</span></Label>
                  <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3 bg-white">
                    {managers.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无可用经理</p>
                    ) : (
                      managers.map((manager) => (
                        <div key={manager.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`manager-${manager.id}`}
                            checked={selectedManagers.includes(manager.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedManagers([...selectedManagers, manager.id]);
                              } else {
                                setSelectedManagers(selectedManagers.filter((id) => id !== manager.id));
                              }
                              setError('');
                            }}
                          />
                          <label
                            htmlFor={`manager-${manager.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {manager.name}
                            {manager.department && (
                              <span className="text-gray-500 ml-1">({manager.department})</span>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedManagers.length > 0 && (
                    <p className="text-xs text-gray-500">已选择 {selectedManagers.length} 位经理</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 审批意见 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {action === 'REJECT' ? '拒绝原因 *' : '审批意见'}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => { setComment(e.target.value); setError(''); }}
              placeholder={action === 'REJECT' ? '请输入拒绝原因（必填）' : '请输入审批意见（可选）'}
              rows={3}
              className="rounded-xl"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="rounded-xl">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant={action === 'REJECT' ? 'destructive' : 'default'}
            className="rounded-xl"
          >
            {loading ? '处理中...' : (action === 'APPROVE' ? '确认通过' : '确认拒绝')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
