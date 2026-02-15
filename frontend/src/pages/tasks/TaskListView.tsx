import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { tasksApi, Task, TaskStatus, TaskPriority } from '@/services/tasks'
import {
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TaskListViewProps {
  onTaskClick?: (task: Task) => void
  onAddTask?: () => void
  refreshTrigger?: number
}

const statusMap: Record<TaskStatus, { label: string; color: string }> = {
  [TaskStatus.TODO]: { label: '待办', color: 'bg-gray-100 text-gray-700' },
  [TaskStatus.IN_PROGRESS]: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  [TaskStatus.REVIEW]: { label: '审核中', color: 'bg-purple-100 text-purple-700' },
  [TaskStatus.DONE]: { label: '已完成', color: 'bg-green-100 text-green-700' },
}

const priorityMap: Record<TaskPriority, { label: string; color: string }> = {
  [TaskPriority.LOW]: { label: '低', color: 'bg-gray-100 text-gray-600' },
  [TaskPriority.MEDIUM]: { label: '中', color: 'bg-blue-100 text-blue-600' },
  [TaskPriority.HIGH]: { label: '高', color: 'bg-orange-100 text-orange-600' },
  [TaskPriority.URGENT]: { label: '紧急', color: 'bg-red-100 text-red-600' },
}

export function TaskListView({ onTaskClick, onAddTask, refreshTrigger }: TaskListViewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await tasksApi.getTasks({
        page: currentPage,
        pageSize,
        keyword: searchQuery || undefined,
      })
      if (response.success) {
        setTasks(response.data.items)
        setTotalPages(response.data.totalPages)
        setTotalCount(response.data.total)
      }
    } catch (error) {
      toast.error('加载任务列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery])

  useEffect(() => {
    loadTasks()
  }, [loadTasks, refreshTrigger])

  const handleSearch = () => {
    setCurrentPage(1)
    loadTasks()
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksApi.deleteTask(taskId)
      toast.success('任务已删除')
      loadTasks()
    } catch (error) {
      toast.error('删除任务失败')
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await tasksApi.updateTaskStatus(taskId, newStatus)
      toast.success('状态已更新')
      loadTasks()
    } catch (error) {
      toast.error('更新状态失败')
    }
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索任务标题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
        <Button variant="outline" onClick={onAddTask}>
          新建任务
        </Button>
      </div>

      {/* 任务表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">任务标题</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>优先级</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>截止日期</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  暂无任务
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onTaskClick?.(task)}
                >
                  <TableCell>
                    <div className="font-medium text-gray-900">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-500 truncate max-w-[250px]">
                        {task.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusMap[task.status].color} variant="secondary">
                      {statusMap[task.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityMap[task.priority].color} variant="secondary">
                      {priorityMap[task.priority].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                            {getInitials(task.assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">未分配</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <span className={isOverdue(task.dueDate) ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(task.dueDate), 'MM-dd', { locale: zhCN })}
                        {isOverdue(task.dueDate) && ' (逾期)'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(task.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTaskClick?.(task) }}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        {task.status !== TaskStatus.DONE && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, TaskStatus.DONE) }}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            标记完成
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id) }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          共 {totalCount} 条记录
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            第 {currentPage} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
