// frontend/src/components/GanttChart.tsx
import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addDays,
  differenceInDays,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { GanttTask, TaskPriority, TaskStatus } from '@/services/tasks'

interface GanttChartProps {
  tasks: GanttTask[]
  onTaskClick?: (task: GanttTask) => void
  isLoading?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-green-400',
  MEDIUM: 'bg-yellow-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-red-400',
}

const statusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-300',
  IN_PROGRESS: 'bg-blue-400',
  REVIEW: 'bg-purple-400',
  DONE: 'bg-green-500',
}

export function GanttChart({ tasks, onTaskClick, isLoading }: GanttChartProps) {
  // 计算时间范围
  const { days, startDate, endDate } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date()
      const start = startOfMonth(today)
      const end = endOfMonth(today)
      return {
        days: eachDayOfInterval({ start, end }),
        startDate: start,
        endDate: end,
      }
    }

    const dates = tasks
      .flatMap(t => [t.startDate, t.endDate])
      .filter((d): d is string => !!d)
      .map(d => new Date(d))

    const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date()

    // 添加一些缓冲
    const start = startOfDay(addDays(minDate, -3))
    const end = endOfDay(addDays(maxDate, 7))

    return {
      days: eachDayOfInterval({ start, end }),
      startDate: start,
    }
  }, [tasks])

  // 计算任务在时间轴上的位置
  const getTaskPosition = (task: GanttTask) => {
    const taskStart = task.startDate ? new Date(task.startDate) : startDate
    const taskEnd = task.endDate ? new Date(task.endDate) : addDays(taskStart, 1)

    const startOffset = Math.max(0, differenceInDays(taskStart, startDate))
    const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1)

    return {
      left: startOffset * 40, // 每天40px
      width: duration * 40 - 8, // 减去间距
    }
  }

  // 按周分组
  const weeks = useMemo(() => {
    const result: { days: Date[]; weekStart: Date }[] = []
    let currentWeek: Date[] = []

    days.forEach((day, idx) => {
      if (idx === 0 || day.getDay() === 1) {
        if (currentWeek.length > 0) {
          result.push({ days: currentWeek, weekStart: currentWeek[0] })
        }
        currentWeek = [day]
      } else {
        currentWeek.push(day)
      }
    })

    if (currentWeek.length > 0) {
      result.push({ days: currentWeek, weekStart: currentWeek[0] })
    }

    return result
  }, [days])

  if (isLoading) {
    return (
      <div className="h-96 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* 表头 - 周 */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 flex-shrink-0 p-3 font-medium text-gray-700 border-r border-gray-200">
              任务名称
            </div>
            <div className="flex">
              {weeks.map((week) => (
                <div
                  key={week.weekStart.toISOString()}
                  className="w-[280px] flex-shrink-0 p-2 text-center border-r border-gray-200 text-sm text-gray-600"
                >
                  {format(week.weekStart, 'MM月第w周', { locale: zhCN })}
                </div>
              ))}
            </div>
          </div>

          {/* 表头 - 天 */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 flex-shrink-0 border-r border-gray-200" />
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`
                    w-10 flex-shrink-0 p-1 text-center text-xs border-r border-gray-100
                    ${isToday(day) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500'}
                  `}
                >
                  <div>{format(day, 'EEE', { locale: zhCN })}</div>
                  <div>{format(day, 'd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 任务行 */}
          <div className="divide-y divide-gray-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                暂无任务数据
              </div>
            ) : (
              tasks.map((task) => {
                const position = getTaskPosition(task)
                return (
                  <div key={task.id} className="flex hover:bg-gray-50">
                    {/* 任务信息 */}
                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`w-2 h-2 p-0 rounded-full ${priorityColors[task.priority]}`}
                        />
                        <span className="text-sm text-gray-900 truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.assignee ? (
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={task.assignee.avatar || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {task.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="text-xs text-gray-400">未分配</span>
                        )}
                      </div>
                    </div>

                    {/* 时间轴 */}
                    <div className="flex relative h-12">
                      {days.map((day) => (
                        <div
                          key={day.toISOString()}
                          className={`
                            w-10 flex-shrink-0 border-r border-gray-100
                            ${isToday(day) ? 'bg-blue-50/30' : ''}
                          `}
                        />
                      ))}

                      {/* 任务条 */}
                      {task.startDate && task.endDate && (
                        <div
                          className={`
                            absolute top-2 h-8 rounded-md cursor-pointer
                            ${statusColors[task.status]} opacity-80 hover:opacity-100
                            transition-opacity flex items-center px-2
                          `}
                          style={{
                            left: position.left,
                            width: position.width,
                          }}
                          onClick={() => onTaskClick?.(task)}
                        >
                          {/* 进度条 */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-black/10 rounded-l-md"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="relative text-xs text-white font-medium truncate">
                            {task.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
