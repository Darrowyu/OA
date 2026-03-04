import { useState, useRef, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Activity,
  Search,
  Filter,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Zap,
  Gauge,
  Loader2,
} from "lucide-react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { equipmentApi, type Equipment } from "@/services/equipment"
import { equipmentHealthApi, type HealthStatisticsResult } from "@/services/equipmentHealth"
import { toast } from "sonner"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

// 健康度等级映射
const healthLevelToStatus = (healthScore: number | null): 'healthy' | 'warning' | 'critical' => {
  if (healthScore === null) return 'warning'
  if (healthScore >= 80) return 'healthy'
  if (healthScore >= 60) return 'warning'
  return 'critical'
}

// 模拟趋势数据（后续可接入真实历史数据）
const generateTrendData = (equipmentList: Equipment[]) => {
  const dates = ['1/1', '1/8', '1/15', '1/22', '1/29', '2/5']
  return dates.map((date, index) => {
    const data: Record<string, number | string> = { date }
    equipmentList.slice(0, 5).forEach((eq) => {
      const baseScore = eq.healthScore || 70
      // 模拟波动
      const variation = Math.sin(index * 0.5) * 5 + (Math.random() - 0.5) * 3
      data[eq.code] = Math.max(0, Math.min(100, Math.round(baseScore + variation)))
    })
    return data
  })
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  healthy: { label: "健康", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "预警", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  critical: { label: "危险", color: "bg-red-100 text-red-700", icon: <Zap className="h-3 w-3" /> },
}

// 设备数据转换为健康度数据格式
const convertToHealthData = (equipment: Equipment[]) => {
  return equipment.map((eq) => {
    const healthScore = eq.healthScore || 0
    const status = healthLevelToStatus(eq.healthScore)
    // 模拟指标数据（后续可从 healthMetrics 获取）
    const vibration = Math.min(100, Math.max(0, healthScore + (Math.random() - 0.5) * 20))
    const temperature = Math.min(100, Math.max(0, healthScore + (Math.random() - 0.5) * 15))
    const power = Math.min(100, Math.max(0, healthScore + (Math.random() - 0.5) * 10))

    return {
      id: eq.code,
      name: eq.name,
      health: healthScore,
      status,
      lastCheck: eq.lastMaintenanceAt ? eq.lastMaintenanceAt.split('T')[0] : '-',
      nextCheck: eq.nextMaintenanceAt ? eq.nextMaintenanceAt.split('T')[0] : '-',
      vibration: Math.round(vibration),
      temperature: Math.round(temperature),
      power: Math.round(power),
    }
  })
}

export function EquipmentHealth() {
  const [searchQuery, setSearchQuery] = useState("")
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
  const chartRef = useRef<HTMLDivElement>(null)

  // API 数据状态
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [statistics, setStatistics] = useState<HealthStatisticsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chartRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setChartSize({ width, height })
        }
      }
    })
    resizeObserver.observe(chartRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // 获取设备列表和统计数据
  const fetchHealthData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 并行请求设备列表和统计数据
      const [equipmentRes, statsRes] = await Promise.all([
        equipmentApi.getEquipmentList({ pageSize: 100 }), // 获取前100台设备，足够展示
        equipmentHealthApi.getHealthStatistics(),
      ])

      if (equipmentRes.success) {
        setEquipmentList(equipmentRes.data.items)
      } else {
        throw new Error('获取设备列表失败')
      }

      if (statsRes.success) {
        setStatistics(statsRes.data)
      } else {
        throw new Error('获取统计数据失败')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载数据失败'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    fetchHealthData()
  }, [])

  // 转换数据 - 使用 useMemo 缓存
  const healthData = useMemo(() => convertToHealthData(equipmentList), [equipmentList])
  const trendData = useMemo(() => generateTrendData(equipmentList), [equipmentList])

  const filteredData = useMemo(() =>
    healthData.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [healthData, searchQuery]
  )

  // 使用统计数据或计算数据 - 使用 useMemo 缓存
  const avgHealth = useMemo(() =>
    statistics?.averageScore || (healthData.length > 0
      ? Math.round(healthData.reduce((sum, item) => sum + item.health, 0) / healthData.length)
      : 0),
    [statistics, healthData]
  )
  const healthyCount = useMemo(() =>
    statistics?.excellentCount || healthData.filter((item) => item.status === "healthy").length,
    [statistics, healthData]
  )
  const warningCount = useMemo(() =>
    statistics?.averageCount || healthData.filter((item) => item.status === "warning").length,
    [statistics, healthData]
  )
  const criticalCount = useMemo(() =>
    statistics?.poorCount || healthData.filter((item) => item.status === "critical").length,
    [statistics, healthData]
  )

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchHealthData} variant="outline">
          重新加载
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 页面标题 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备健康度评估</h1>
          <p className="text-gray-500 mt-1">实时监控设备运行状态和健康指标</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800" onClick={fetchHealthData}>
          <Gauge className="h-4 w-4 mr-2" />
          刷新数据
        </Button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均健康度</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{avgHealth}%</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">健康设备</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{healthyCount}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">预警设备</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{warningCount}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">危险设备</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{criticalCount}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 健康度趋势图 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>设备健康度趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={chartRef} className="h-64 min-h-[256px]">
              {chartSize.width > 0 && chartSize.height > 0 && trendData.length > 0 && (
              <ResponsiveContainer width={chartSize.width} height={chartSize.height}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorEQ001" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  {equipmentList.slice(0, 3).map((eq, index) => {
                    const colors = ['#10b981', '#f59e0b', '#ef4444']
                    return (
                      <Area
                        key={eq.id}
                        type="monotone"
                        dataKey={eq.code}
                        name={eq.name}
                        stroke={colors[index % colors.length]}
                        fillOpacity={index === 0 ? 1 : 0.3}
                        fill={index === 0 ? 'url(#colorEQ001)' : colors[index % colors.length]}
                      />
                    )
                  })}
                </AreaChart>
              </ResponsiveContainer>
              )}
              {trendData.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  暂无趋势数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 设备健康度列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>设备健康度详情</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索设备名称或编号..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>综合健康度</TableHead>
                  <TableHead>振动指标</TableHead>
                  <TableHead>温度指标</TableHead>
                  <TableHead>功率指标</TableHead>
                  <TableHead>上次检测</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                      {searchQuery ? '未找到匹配的设备' : '暂无设备数据'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => {
                    const status = statusMap[item.status]
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.health >= 80
                                    ? "bg-green-500"
                                    : item.health >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${item.health}%` }}
                              />
                            </div>
                            <span className={`font-medium ${
                              item.health >= 80 ? "text-green-600" : item.health >= 60 ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {item.health}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={item.vibration >= 80 ? "text-green-600" : item.vibration >= 60 ? "text-yellow-600" : "text-red-600"}>
                            {item.vibration}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={item.temperature >= 80 ? "text-green-600" : item.temperature >= 60 ? "text-yellow-600" : "text-red-600"}>
                            {item.temperature}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={item.power >= 80 ? "text-green-600" : item.power >= 60 ? "text-yellow-600" : "text-red-600"}>
                            {item.power}%
                          </span>
                        </TableCell>
                        <TableCell>{item.lastCheck}</TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <span className="flex items-center gap-1">
                              {status.icon}
                              {status.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
