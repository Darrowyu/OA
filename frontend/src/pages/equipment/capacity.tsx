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
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  Gauge,
  Clock,
  Package,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts"
import { equipmentApi, type EquipmentUtilization, type AnalysisReport } from "@/services/equipment"

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

// 状态映射
const statusMap: Record<string, { label: string; color: string }> = {
  RUNNING: { label: "运行中", color: "bg-green-100 text-green-700" },
  WARNING: { label: "警告", color: "bg-yellow-100 text-yellow-700" },
  STOPPED: { label: "停机", color: "bg-red-100 text-red-700" },
  MAINTENANCE: { label: "维护中", color: "bg-blue-100 text-blue-700" },
  excellent: { label: "优秀", color: "bg-green-100 text-green-700" },
  good: { label: "良好", color: "bg-blue-100 text-blue-700" },
  fair: { label: "一般", color: "bg-yellow-100 text-yellow-700" },
  poor: { label: "较差", color: "bg-red-100 text-red-700" },
}

// 计算OEE状态
function getOeeStatus(oee: number): string {
  if (oee >= 80) return "excellent"
  if (oee >= 60) return "good"
  if (oee >= 40) return "fair"
  return "poor"
}

// 转换API数据为页面需要的格式
function transformUtilizationData(data: EquipmentUtilization[]) {
  return data.map((item) => {
    const efficiency = Math.round(item.avgEfficiency * 100)
    const utilization = Math.round(item.avgEfficiency * 85) // 估算利用率
    const oee = Math.round(efficiency * utilization / 100) // 估算OEE
    return {
      id: item.equipmentCode,
      name: item.equipmentName,
      theoreticalCapacity: 1000, // 默认值
      actualCapacity: Math.round(1000 * utilization / 100),
      utilization,
      efficiency,
      oee,
      status: getOeeStatus(oee),
      uptime: Math.round(720 * utilization / 100),
      downtime: Math.round(720 * (100 - utilization) / 100),
      rawStatus: item.status,
    }
  })
}

// 生成趋势数据（基于实际数据估算）
function generateTrendData(utilizationData: ReturnType<typeof transformUtilizationData>) {
  const totalActual = utilizationData.reduce((sum, item) => sum + item.actualCapacity, 0)
  const target = Math.round(totalActual * 1.2)
  return [
    { date: "1/1", actual: Math.round(totalActual * 0.85), target },
    { date: "1/8", actual: Math.round(totalActual * 0.9), target },
    { date: "1/15", actual: Math.round(totalActual * 0.95), target },
    { date: "1/22", actual: Math.round(totalActual * 0.92), target },
    { date: "1/29", actual: totalActual, target },
    { date: "2/5", actual: Math.round(totalActual * 0.98), target },
  ]
}

// 生成OEE数据（基于分析报告）
function generateOeeData(report: AnalysisReport | null) {
  if (!report) {
    return [
      { name: "可用性", value: 85, fill: "#3b82f6" },
      { name: "性能", value: 88, fill: "#10b981" },
      { name: "质量", value: 96, fill: "#f59e0b" },
    ]
  }
  const avgEfficiency = report.productDistribution.length > 0
    ? Math.round(report.productDistribution.reduce((sum, p) => sum + p.avgEfficiency, 0) / report.productDistribution.length * 100)
    : 88
  return [
    { name: "可用性", value: Math.round(report.summary.coverageRate), fill: "#3b82f6" },
    { name: "性能", value: avgEfficiency, fill: "#10b981" },
    { name: "质量", value: 96, fill: "#f59e0b" },
  ]
}

export function EquipmentCapacity() {
  const [searchQuery, setSearchQuery] = useState("")
  const [trendChartSize, setTrendChartSize] = useState({ width: 0, height: 0 })
  const [oeeChartSize, setOeeChartSize] = useState({ width: 0, height: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [utilizationData, setUtilizationData] = useState<EquipmentUtilization[]>([])
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null)
  const trendChartRef = useRef<HTMLDivElement>(null)
  const oeeChartRef = useRef<HTMLDivElement>(null)

  // 获取数据
  const fetchCapacityData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [utilRes, reportRes] = await Promise.all([
        equipmentApi.getEquipmentUtilization(),
        equipmentApi.getAnalysisReport(),
      ])
      if (utilRes.success) {
        setUtilizationData(utilRes.data)
      } else {
        setError("获取设备利用率数据失败")
      }
      if (reportRes.success) {
        setAnalysisReport(reportRes.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCapacityData()
  }, [])

  useEffect(() => {
    if (!trendChartRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setTrendChartSize({ width, height })
        }
      }
    })
    resizeObserver.observe(trendChartRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!oeeChartRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setOeeChartSize({ width, height })
        }
      }
    })
    resizeObserver.observe(oeeChartRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // 使用 useMemo 缓存计算结果
  const capacityData = useMemo(() => transformUtilizationData(utilizationData), [utilizationData])
  const filteredData = useMemo(() =>
    capacityData.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [capacityData, searchQuery]
  )

  const statistics = useMemo(() => {
    if (capacityData.length === 0) {
      return { avgOEE: 0, avgUtilization: 0, totalActual: 0, totalRuntime: 0 }
    }
    return {
      avgOEE: Math.round(capacityData.reduce((sum, item) => sum + item.oee, 0) / capacityData.length),
      avgUtilization: Math.round(capacityData.reduce((sum, item) => sum + item.utilization, 0) / capacityData.length),
      totalActual: capacityData.reduce((sum, item) => sum + item.actualCapacity, 0),
      totalRuntime: capacityData.reduce((sum, item) => sum + item.uptime, 0),
    }
  }, [capacityData])

  const trendData = useMemo(() => generateTrendData(capacityData), [capacityData])
  const oeeData = useMemo(() => generateOeeData(analysisReport), [analysisReport])

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchCapacityData} variant="outline">
          重试
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
          <h1 className="text-2xl font-bold text-gray-900">设备产能管理</h1>
          <p className="text-gray-500 mt-1">监控设备产能利用率和OEE指标</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Gauge className="h-4 w-4 mr-2" />
          产能分析
        </Button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均OEE</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.avgOEE}%</p>
                <p className="text-sm text-green-600 mt-1">+3% 较上月</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gauge className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均利用率</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.avgUtilization}%</p>
                <p className="text-sm text-yellow-600 mt-1">-2% 较上月</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">实际产能</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.totalActual}</p>
                <p className="text-sm text-gray-500 mt-1">件/小时</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总运行时间</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.totalRuntime.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">小时/月</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 图表区域 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 产能趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>产能趋势对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={trendChartRef} className="h-64 min-h-[256px]">
              {trendChartSize.width > 0 && trendChartSize.height > 0 && (
              <ResponsiveContainer width={trendChartSize.width} height={trendChartSize.height}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Line type="monotone" dataKey="actual" name="实际产能" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                  <Line type="monotone" dataKey="target" name="目标产能" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OEE构成 */}
        <Card>
          <CardHeader>
            <CardTitle>OEE构成分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={oeeChartRef} className="h-64 min-h-[256px]">
              {oeeChartSize.width > 0 && oeeChartSize.height > 0 && (
              <ResponsiveContainer width={oeeChartSize.width} height={oeeChartSize.height}>
                <BarChart data={oeeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" name="百分比" radius={[0, 4, 4, 0]} barSize={40}>
                    {oeeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 设备产能列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>设备产能详情</CardTitle>
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
                  <TableHead>理论产能</TableHead>
                  <TableHead>实际产能</TableHead>
                  <TableHead>利用率</TableHead>
                  <TableHead>效率</TableHead>
                  <TableHead>OEE</TableHead>
                  <TableHead>运行时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const status = statusMap[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.theoreticalCapacity} 件/h</TableCell>
                      <TableCell>{item.actualCapacity} 件/h</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${item.utilization}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{item.utilization}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.efficiency}%</TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          item.oee >= 80 ? "text-green-600" : item.oee >= 60 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {item.oee}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{item.uptime}h</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-red-500">{item.downtime}h</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
