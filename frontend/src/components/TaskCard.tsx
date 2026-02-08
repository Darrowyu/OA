// frontend/src/components/TaskCard.tsx
import { memo } from 'react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, MessageSquare, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Task, TaskPriority, TaskStatus } from '@/services/tasks'

interface TaskCardProps {
  task: Task
  onClick?: (task: Task) => void
  isDragging?: boolean
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  LOW: { label: '低', color: 'text-green-600', bg: 'bg-green-50' },
  MEDIUM: { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  HIGH: { label: '高', color: 'text-orange-600', bg: 'bg-orange-50' },
  URGENT: { label: '紧急', color: 'text-red-600', bg: 'bg-red-50' },
}

function TaskCardComponent({ task, onClick, isDragging }: TaskCardProps) {
  const priority = priorityConfig[task.priority]

  // 格式化截止日期显示
  const formatDueDate = (dateStr: string | null): { text: string; isOverdue: boolean } => {
    if (!dateStr) return { text: '', isOverdue: false }
    const date = new Date(dateStr)
    const isOverdue = isPast(date) && !isToday(date) && task.status !== 'DONE'

    if (isToday(date)) return { text: '今天', isOverdue }
    if (isTomorrow(date)) return { text: '明天', isOverdue }
    return { text: format(date, 'MM/dd', { locale: zhCN }), isOverdue }
  }

  const dueDate = formatDueDate(task.dueDate)
  const hasSubTasks = task.subTasks && task.subTasks.length > 0
  const completedSubTasks = hasSubTasks
    ? task.subTasks.filter(st => st.status === 'DONE').length
    : 0

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`
        group bg-white rounded-lg border border-gray-200 p-3 cursor-pointer
        hover:shadow-md hover:border-gray-300 transition-all duration-200
        ${isDragging ? 'shadow-lg rotate-2' : ''}
      `}
    >
      {/* 拖拽手柄 */}
      <div className="flex items-start gap-2">
        <div className="pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
            {task.title}
          </h4>

          {/* 标签 */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 bg-gray-100 text-gray-600"
                >
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 优先级 */}
              <Badge
                variant="secondary"
                className={`text-xs px-1.5 py-0 ${priority.bg} ${priority.color}`}
              >
                {priority.label}
              </Badge>

              {/* 截止日期 */}
              {dueDate.text && (
                <div
                  className={`
                    flex items-center gap-1 text-xs
                    ${dueDate.isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}
                  `}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{dueDate.text}</span>
                </div>
              )}

              {/* 子任务数 */}
              {hasSubTasks && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MessageSquare className="w-3 h-3" />
                  <span>{completedSubTasks}/{task.subTasks.length}</span>
                </div>
              )}
            </div>

            {/* 负责人头像 */}
            {task.assignee ? (
              <Avatar className="w-6 h-6">
                <AvatarImage src={task.assignee.avatar || undefined} />
                <AvatarFallback className="text-xs bg-gray-200">
                  {task.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-400">-</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const TaskCard = memo(TaskCardComponent)
