// frontend/src/pages/tasks/TaskCreateDialog.tsx
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { tasksApi, TaskStatus, TaskPriority, getStatusText, getPriorityText } from '@/services/tasks'
import { usersApi } from '@/services/users'
import type { User } from '@/types'

interface TaskCreateDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultStatus?: TaskStatus
}

export function TaskCreateDialog({ open, onClose, onSuccess, defaultStatus = TaskStatus.TODO }: TaskCreateDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: TaskPriority.MEDIUM,
    assigneeId: '',
    dueDate: '',
  })

  useEffect(() => {
    if (open) {
      loadUsers()
      setFormData(prev => ({ ...prev, status: defaultStatus }))
    }
  }, [open, defaultStatus])

  const loadUsers = async () => {
    try {
      const res = await usersApi.getUsers({ pageSize: 100 })
      if (res.success) {
        setUsers(res.data.items)
      }
    } catch {
      // 静默失败
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入任务标题')
      return
    }

    setIsLoading(true)
    try {
      const res = await tasksApi.createTask({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        assigneeId: formData.assigneeId || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      })
      if (res.success) {
        toast.success('任务创建成功')
        onSuccess?.()
        handleClose()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建任务失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      status: defaultStatus,
      priority: TaskPriority.MEDIUM,
      assigneeId: '',
      dueDate: '',
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">任务标题 <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入任务标题"
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入任务描述（可选）"
              rows={3}
            />
          </div>

          {/* 状态和优先级 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as TaskStatus })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusText(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskPriority).map((p) => (
                    <SelectItem key={p} value={p}>
                      {getPriorityText(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 负责人 */}
          <div className="space-y-2">
            <Label htmlFor="assignee">负责人</Label>
            <Select
              value={formData.assigneeId || 'unassigned'}
              onValueChange={(v) => setFormData({ ...formData, assigneeId: v === 'unassigned' ? '' : v })}
            >
              <SelectTrigger id="assignee">
                <SelectValue placeholder="选择负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">未分配</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 截止日期 */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">截止日期</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '创建中...' : '创建任务'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
