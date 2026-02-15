// frontend/src/pages/tasks/TaskDetailDialog.tsx
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Flag, User as UserIcon, CheckCircle2 } from 'lucide-react'
import { tasksApi, type Task, TaskStatus, TaskPriority, getStatusText, getPriorityText, getStatusColor, getPriorityColor } from '@/services/tasks'
import { usersApi } from '@/services/users'
import type { User as UserType } from '@/types'

interface TaskDetailDialogProps {
  taskId: string | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TaskDetailDialog({ taskId, open, onClose, onSuccess }: TaskDetailDialogProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Task>>({})

  useEffect(() => {
    if (open && taskId) {
      loadTask()
      loadUsers()
    }
  }, [open, taskId])

  const loadTask = async () => {
    if (!taskId) return
    setIsLoading(true)
    try {
      const res = await tasksApi.getTask(taskId)
      if (res.success) {
        setTask(res.data)
        setEditData(res.data)
      }
    } catch {
      toast.error('加载任务详情失败')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleUpdate = async () => {
    if (!taskId || !editData) return
    setIsLoading(true)
    try {
      const res = await tasksApi.updateTask(taskId, {
        title: editData.title,
        description: editData.description ?? undefined,
        status: editData.status,
        priority: editData.priority,
        assigneeId: editData.assigneeId,
        dueDate: editData.dueDate,
      })
      if (res.success) {
        toast.success('任务更新成功')
        setTask(res.data)
        setIsEditing(false)
        onSuccess?.()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新任务失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!taskId) return
    if (!confirm('确定要删除此任务吗？')) return
    setIsLoading(true)
    try {
      const res = await tasksApi.deleteTask(taskId)
      if (res.success) {
        toast.success('任务已删除')
        onClose()
        onSuccess?.()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除任务失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (status: TaskStatus) => {
    if (!taskId) return
    try {
      const res = await tasksApi.updateTaskStatus(taskId, status)
      if (res.success) {
        toast.success('状态已更新')
        loadTask()
        onSuccess?.()
      }
    } catch {
      toast.error('更新状态失败')
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '未设置'
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === TaskStatus.DONE) return false
    return new Date(dueDate) < new Date()
  }

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="py-8 text-center text-gray-500">
            {isLoading ? '加载中...' : '任务不存在'}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <Input
                value={editData.title || ''}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="font-semibold"
                placeholder="任务标题"
              />
            ) : (
              <span className="text-xl">{task.title}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 状态栏 */}
          <div className="flex items-center gap-3 flex-wrap">
            {isEditing ? (
              <Select
                value={editData.status}
                onValueChange={(v) => setEditData({ ...editData, status: v as TaskStatus })}
              >
                <SelectTrigger className="w-32">
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
            ) : (
              <Badge className={getStatusColor(task.status)}>
                {getStatusText(task.status)}
              </Badge>
            )}

            {isEditing ? (
              <Select
                value={editData.priority}
                onValueChange={(v) => setEditData({ ...editData, priority: v as TaskPriority })}
              >
                <SelectTrigger className="w-32">
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
            ) : (
              <Badge className={getPriorityColor(task.priority)} variant="outline">
                <Flag className="h-3 w-3 mr-1" />
                {getPriorityText(task.priority)}
              </Badge>
            )}

            {!isEditing && isOverdue(task.dueDate, task.status) && (
              <Badge variant="destructive">已逾期</Badge>
            )}
          </div>

          {/* 描述 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">描述</h4>
            {isEditing ? (
              <Textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="任务描述..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {task.description || '暂无描述'}
              </p>
            )}
          </div>

          {/* 负责人和日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <UserIcon className="h-4 w-4 mr-1" />
                负责人
              </h4>
              {isEditing ? (
                <Select
                  value={editData.assigneeId || 'unassigned'}
                  onValueChange={(v) => setEditData({ ...editData, assigneeId: v === 'unassigned' ? null : v })}
                >
                  <SelectTrigger>
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
              ) : (
                <div className="flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.assignee.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">未分配</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                截止日期
              </h4>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.dueDate ? editData.dueDate.split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              ) : (
                <span className={`text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-500 font-medium' : ''}`}>
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>

          {/* 创建信息 */}
          <div className="pt-4 border-t text-xs text-gray-400 space-y-1">
            <p>创建者: {task.creator?.name || '-'}</p>
            <p>创建时间: {formatDate(task.createdAt)}</p>
            {task.completedAt && (
              <p className="flex items-center text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                完成时间: {formatDate(task.completedAt)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { setIsEditing(false); setEditData(task) }} disabled={isLoading}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={isLoading}>
                {isLoading ? '保存中...' : '保存'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                删除
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                编辑
              </Button>
              {task.status !== TaskStatus.DONE && (
                <Button
                  onClick={() => handleStatusChange(TaskStatus.DONE)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  标记完成
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
