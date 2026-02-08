import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { attendanceApi, type Schedule as ScheduleType, type Shift } from '@/services/attendance'
import { toast } from 'sonner'

// 获取月份天数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// 获取月份第一天是星期几
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// 格式化时间
function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5)
}

// 班次颜色
const shiftColors: Record<string, string> = {
  '早班': 'bg-blue-100 text-blue-800 border-blue-200',
  '白班': 'bg-green-100 text-green-800 border-green-200',
  '晚班': 'bg-purple-100 text-purple-800 border-purple-200',
  '夜班': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  '休息': 'bg-gray-100 text-gray-600 border-gray-200',
}

export function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<ScheduleType[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedShift, setSelectedShift] = useState<string>('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 获取排班数据
  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const monthStr = currentDate.toISOString()
      const response = await attendanceApi.getSchedules({ month: monthStr })
      if (response.success) {
        setSchedules(response.data)
      }
    } catch (error) {
      toast.error('获取排班失败')
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  // 获取班次列表
  const fetchShifts = useCallback(async () => {
    try {
      const response = await attendanceApi.getShifts()
      if (response.success) {
        setShifts(response.data)
      }
    } catch (error) {
      toast.error('获取班次失败')
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
    fetchShifts()
  }, [fetchSchedules, fetchShifts])

  // 切换月份
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // 获取某天的排班
  const getScheduleForDate = (day: number): ScheduleType | undefined => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    return schedules.find(s => new Date(s.date).toISOString().split('T')[0] === dateStr)
  }

  // 设置排班
  const handleSetSchedule = async () => {
    if (!selectedDate || !selectedShift) return

    try {
      const response = await attendanceApi.createSchedule({
        userId: 'current', // 后端会从token获取
        date: selectedDate.toISOString(),
        shiftId: selectedShift,
      })

      if (response.success) {
        toast.success('排班设置成功')
        fetchSchedules()
        setSelectedDate(null)
        setSelectedShift('')
      }
    } catch (error) {
      toast.error('设置排班失败')
    }
  }

  // 渲染日历
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: JSX.Element[] = []

    // 空白占位
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 bg-gray-50/50" />
      )
    }

    // 日期
    for (let day = 1; day <= daysInMonth; day++) {
      const schedule = getScheduleForDate(day)
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()
      const isRestDay = schedule?.isRestDay

      days.push(
        <Dialog key={day}>
          <DialogTrigger asChild>
            <button
              className={`h-24 p-2 border border-gray-100 hover:bg-gray-50 transition-colors text-left relative ${
                isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-white'
              }`}
              onClick={() => setSelectedDate(new Date(year, month, day))}
            >
              <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {day}
              </div>
              {schedule && (
                <div className="mt-2">
                  {isRestDay ? (
                    <Badge variant="secondary" className="text-xs">休息</Badge>
                  ) : (
                    <div className={`text-xs px-2 py-1 rounded border ${shiftColors[schedule.shift.name] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                      <div className="font-medium">{schedule.shift.name}</div>
                      <div className="text-[10px] opacity-80">
                        {formatTime(schedule.shift.startTime)} - {formatTime(schedule.shift.endTime)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!schedule && (
                <div className="mt-2 text-xs text-gray-400">未排班</div>
              )}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                设置排班 - {selectedDate?.toLocaleDateString('zh-CN')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue placeholder="选择班次" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rest">休息日</SelectItem>
                  {shifts.map(shift => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ({formatTime(shift.startTime)} - {formatTime(shift.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDate(null)}>
                  取消
                </Button>
                <Button onClick={handleSetSchedule} disabled={!selectedShift}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )
    }

    return days
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              排班日历
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[120px] text-center">
                  {year}年{month + 1}月
                </span>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
            {weekDays.map(day => (
              <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
            {loading ? (
              <div className="col-span-7 h-96 flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : (
              renderCalendar()
            )}
          </div>

          {/* 班次图例 */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="text-sm text-gray-500">班次图例：</div>
            {shifts.map(shift => (
              <div key={shift.id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border ${shift.color || 'bg-gray-100'}`} />
                <span className="text-sm text-gray-600">{shift.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default Schedule
