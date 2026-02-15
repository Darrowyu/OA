import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { tasksApi, Task, TaskStatus } from '@/services/tasks'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TaskCalendarViewProps {
  onTaskClick?: (task: Task) => void
  refreshTrigger?: number
}

const statusColors: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'bg-gray-100 text-gray-700 border-gray-200',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700 border-blue-200',
  [TaskStatus.REVIEW]: 'bg-purple-100 text-purple-700 border-purple-200',
  [TaskStatus.DONE]: 'bg-green-100 text-green-700 border-green-200',
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

export function TaskCalendarView({ onTaskClick, refreshTrigger }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await tasksApi.getTasks({
        page: 1,
        pageSize: 100, // 获取足够多的任务用于日历展示
      })
      if (response.success) {
        setTasks(response.data.items)
      }
    } catch (error) {
      toast.error('加载任务失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks, refreshTrigger])

  // 生成日历日期
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    })
  }

  const calendarDays = generateCalendarDays()

  // 获取某天的任务
  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (task.dueDate) {
        return isSameDay(new Date(task.dueDate), day)
      }
      return false
    })
  }

  // 获取某月开始结束期间的所有任务
  const getTasksInRange = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)

    return tasks.filter((task) => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate)
        return dueDate >= monthStart && dueDate <= monthEnd
      }
      return false
    })
  }

  const monthTasks = getTasksInRange()
  const selectedDateTasks = selectedDate ? getTasksForDay(selectedDate) : []

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false
    return new Date(task.dueDate) < new Date()
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-400px)]">
      {/* 日历主体 */}
      <Card className="flex-1 p-4">
        {/* 日历头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'yyyy年 MM月', { locale: zhCN })}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                今天
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            本月共 {monthTasks.length} 个任务
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
          {calendarDays.map((day) => {
            const dayTasks = getTasksForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isTodayDate = isToday(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[100px] p-2 bg-white cursor-pointer transition-colors
                  ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                  ${isTodayDate ? 'bg-blue-50' : ''}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  hover:bg-gray-50
                `}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm w-6 h-6 flex items-center justify-center rounded-full
                      ${isTodayDate ? 'bg-blue-600 text-white font-medium' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`
                        text-xs px-1.5 py-0.5 rounded truncate cursor-pointer
                        ${statusColors[task.status]}
                        ${isOverdue(task) ? 'border-red-300 bg-red-50' : 'border'}
                      `}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTaskClick?.(task)
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 px-1.5">
                      +{dayTasks.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {isLoading && (
          <div className="text-center py-4 text-gray-500">
            加载中...
          </div>
        )}
      </Card>

      {/* 侧边栏 - 选中日期任务详情 */}
      <Card className="w-80 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <CalendarDays className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium">
            {selectedDate
              ? format(selectedDate, 'MM月dd日', { locale: zhCN })
              : '请选择日期'}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedDateTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              暂无任务
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`
                    p-3 cursor-pointer hover:shadow-md transition-shadow
                    ${isOverdue(task) ? 'border-red-200 bg-red-50' : ''}
                  `}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {task.title}
                    </h4>
                    <Badge
                      className={`text-xs ${statusColors[task.status]}`}
                      variant="secondary"
                    >
                      {task.status === TaskStatus.TODO && '待办'}
                      {task.status === TaskStatus.IN_PROGRESS && '进行中'}
                      {task.status === TaskStatus.REVIEW && '审核中'}
                      {task.status === TaskStatus.DONE && '已完成'}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.assignee.name}
                      </div>
                    )}
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-600 font-medium' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.dueDate), 'HH:mm')}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 月度统计 */}
        <div className="mt-4 pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">本月概览</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-500">总任务</div>
              <div className="font-medium text-lg">{monthTasks.length}</div>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <div className="text-red-600">逾期</div>
              <div className="font-medium text-lg text-red-600">
                {monthTasks.filter(t => isOverdue(t)).length}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
