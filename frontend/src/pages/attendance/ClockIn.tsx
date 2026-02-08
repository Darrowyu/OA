import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { attendanceApi, type AttendanceRecord } from '@/services/attendance'
import { toast } from 'sonner'

// 格式化时间
function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '--:--'
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// 格式化日期
function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

// 状态标签
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    NORMAL: { label: '正常', variant: 'default' },
    LATE: { label: '迟到', variant: 'destructive' },
    EARLY_LEAVE: { label: '早退', variant: 'secondary' },
    ABSENT: { label: '缺勤', variant: 'destructive' },
    ON_LEAVE: { label: '请假', variant: 'outline' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'default' }

  return (
    <Badge variant={variant}>{label}</Badge>
  )
}

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)

  // 获取今日考勤
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const response = await attendanceApi.getTodayAttendance()
      if (response.success) {
        setAttendance(response.data)
      }
    } catch (error) {
      console.error('获取今日考勤失败:', error)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchTodayAttendance()
  }, [fetchTodayAttendance])

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 获取地理位置
  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('您的浏览器不支持地理定位')
      return null
    }

    return new Promise<{ lat: number; lng: number; address?: string }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setLocation(loc)
          resolve(loc)
        },
        (error) => {
          console.error('获取位置失败:', error)
          toast.error('获取位置失败，请允许位置权限')
          reject(error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }, [])

  // 上班打卡
  const handleClockIn = async () => {
    setLoading(true)
    try {
      let loc = location
      if (!loc) {
        try {
          loc = await getLocation()
        } catch {
          // 使用默认位置
          loc = { lat: 0, lng: 0, address: '手动打卡' }
        }
      }

      const response = await attendanceApi.clockIn({
        type: loc && loc.lat !== 0 ? 'GPS' : 'MANUAL',
        location: loc || undefined,
      })

      if (response.success) {
        toast.success('上班打卡成功！')
        setAttendance(response.data)
      }
    } catch (error) {
      toast.error((error as Error).message || '打卡失败')
    } finally {
      setLoading(false)
    }
  }

  // 下班打卡
  const handleClockOut = async () => {
    setLoading(true)
    try {
      let loc = location
      if (!loc) {
        try {
          loc = await getLocation()
        } catch {
          loc = { lat: 0, lng: 0, address: '手动打卡' }
        }
      }

      const response = await attendanceApi.clockOut({
        type: loc && loc.lat !== 0 ? 'GPS' : 'MANUAL',
        location: loc || undefined,
      })

      if (response.success) {
        toast.success('下班打卡成功！')
        setAttendance(response.data)
      }
    } catch (error) {
      toast.error((error as Error).message || '打卡失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算工作时长
  const workHours = attendance?.workHours
    ? `${Math.floor(attendance.workHours)}小时${Math.round((attendance.workHours % 1) * 60)}分钟`
    : '--'

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 打卡区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              今日打卡
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 当前时间显示 */}
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-gray-900 tabular-nums">
                {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-gray-500 mt-2">{formatDate(currentTime)}</div>
            </div>

            {/* 打卡按钮 */}
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleClockIn}
                disabled={!!attendance?.clockIn || loading}
                className="w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 text-lg"
              >
                {loading && !attendance?.clockIn ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : attendance?.clockIn ? (
                  <>
                    <CheckCircle className="h-8 w-8" />
                    <span>已上班</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-8 w-8" />
                    <span>上班打卡</span>
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={handleClockOut}
                disabled={!attendance?.clockIn || !!attendance?.clockOut || loading}
                className="w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 text-lg"
              >
                {loading && attendance?.clockIn && !attendance?.clockOut ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : attendance?.clockOut ? (
                  <>
                    <CheckCircle className="h-8 w-8" />
                    <span>已下班</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-8 w-8" />
                    <span>下班打卡</span>
                  </>
                )}
              </Button>
            </div>

            {/* 位置信息 */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {location ? (
                <span>位置已获取</span>
              ) : (
                <span>点击打卡将获取您的位置</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 考勤状态 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              今日考勤状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* 状态 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">考勤状态</span>
                  {attendance ? (
                    <StatusBadge status={attendance.status} />
                  ) : (
                    <Badge variant="outline">未打卡</Badge>
                  )}
                </div>

                {/* 上班时间 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">上班时间</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatTime(attendance?.clockIn)}
                  </span>
                </div>

                {/* 下班时间 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">下班时间</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatTime(attendance?.clockOut)}
                  </span>
                </div>

                {/* 工作时长 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">工作时长</span>
                  <span className="text-lg font-semibold text-gray-900">{workHours}</span>
                </div>

                {/* 打卡类型 */}
                {attendance && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">打卡方式</span>
                    <div className="flex gap-2">
                      {attendance.clockInType && (
                        <Badge variant="outline">
                          上班: {attendance.clockInType === 'GPS' ? 'GPS定位' : attendance.clockInType === 'WIFI' ? 'WiFi' : '手动'}
                        </Badge>
                      )}
                      {attendance.clockOutType && (
                        <Badge variant="outline">
                          下班: {attendance.clockOutType === 'GPS' ? 'GPS定位' : attendance.clockOutType === 'WIFI' ? 'WiFi' : '手动'}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default ClockIn
