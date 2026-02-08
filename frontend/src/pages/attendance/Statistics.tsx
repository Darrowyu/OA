import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { attendanceApi, type AttendanceStatistics } from '@/services/attendance'
import { toast } from 'sonner'

export function Statistics() {
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const fetchStatistics = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      const response = await attendanceApi.getStatistics({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      if (response.success) {
        setStatistics(response.data)
      }
    } catch (error) {
      toast.error('获取统计失败')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const statCards = statistics ? [
    { label: '出勤天数', value: statistics.normalDays, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: '迟到次数', value: statistics.lateDays, icon: AlertCircle, color: 'text-orange-600 bg-orange-100' },
    { label: '早退次数', value: statistics.earlyLeaveDays, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    { label: '缺勤天数', value: statistics.absentDays, icon: AlertCircle, color: 'text-red-600 bg-red-100' },
    { label: '请假天数', value: statistics.onLeaveDays, icon: Calendar, color: 'text-blue-600 bg-blue-100' },
    { label: '平均工时', value: `${statistics.avgWorkHours}h`, icon: Clock, color: 'text-purple-600 bg-purple-100' },
  ] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">年份</span>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">月份</span>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m} value={m.toString()}>{m}月</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchStatistics} disabled={loading}>
              刷新数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 出勤率概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            出勤率概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : statistics ? (
            <div className="flex items-center gap-8">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-green-500"
                    strokeDasharray={`${statistics.attendanceRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{statistics.attendanceRate}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-medium text-gray-900">{year}年{month}月考勤统计</div>
                <div className="text-sm text-gray-500">
                  应出勤天数: <span className="font-medium text-gray-900">{statistics.totalDays}</span> 天
                </div>
                <div className="text-sm text-gray-500">
                  实际出勤: <span className="font-medium text-green-600">{statistics.normalDays}</span> 天
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">暂无数据</div>
          )}
        </CardContent>
      </Card>

      {/* 详细统计 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32">
              <CardContent className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </CardContent>
            </Card>
          ))
        ) : statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${card.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                      <div className="text-sm text-gray-500">{card.label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* 工时分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            工时分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : statistics ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">平均每日工时</span>
                <span className="text-xl font-semibold text-gray-900">{statistics.avgWorkHours} 小时</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">总工作时长</span>
                <span className="text-xl font-semibold text-gray-900">
                  {Math.round(statistics.avgWorkHours * (statistics.totalDays - statistics.absentDays - statistics.onLeaveDays) * 10) / 10} 小时
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">出勤率</span>
                <span className="text-xl font-semibold text-gray-900">{statistics.attendanceRate}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default Statistics
