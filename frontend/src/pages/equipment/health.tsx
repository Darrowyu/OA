import { useState, useRef, useEffect } from "react"
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

// 模拟设备健康度数据
const healthData = [
  {
    id: "EQ001",
    name: "数控机床 A型",
    health: 92,
    status: "healthy",
    lastCheck: "2026-02-05",
    nextCheck: "2026-02-12",
    vibration: 85,
    temperature: 90,
    power: 95,
  },
  {
    id: "EQ002",
    name: "注塑机 B型",
    health: 78,
    status: "warning",
    lastCheck: "2026-02-06",
    nextCheck: "2026-02-13",
    vibration: 72,
    temperature: 75,
    power: 88,
  },
  {
    id: "EQ003",
    name: "激光切割机",
    health: 45,
    status: "critical",
    lastCheck: "2026-02-04",
    nextCheck: "2026-02-08",
    vibration: 40,
    temperature: 55,
    power: 50,
  },
  {
    id: "EQ004",
    name: "自动焊接机器人",
    health: 88,
    status: "healthy",
    lastCheck: "2026-02-07",
    nextCheck: "2026-02-14",
    vibration: 92,
    temperature: 85,
    power: 90,
  },
  {
    id: "EQ005",
    name: "冲压机 C型",
    health: 60,
    status: "warning",
    lastCheck: "2026-02-05",
    nextCheck: "2026-02-10",
    vibration: 65,
    temperature: 70,
    power: 58,
  },
]

// 健康度趋势数据
const trendData = [
  { date: "1/1", EQ001: 88, EQ002: 82, EQ003: 60, EQ004: 85, EQ005: 70 },
  { date: "1/8", EQ001: 89, EQ002: 80, EQ003: 55, EQ004: 86, EQ005: 68 },
  { date: "1/15", EQ001: 90, EQ002: 79, EQ003: 50, EQ004: 87, EQ005: 65 },
  { date: "1/22", EQ001: 91, EQ002: 78, EQ003: 48, EQ004: 87, EQ005: 62 },
  { date: "1/29", EQ001: 92, EQ002: 78, EQ003: 45, EQ004: 88, EQ005: 60 },
  { date: "2/5", EQ001: 92, EQ002: 78, EQ003: 45, EQ004: 88, EQ005: 60 },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  healthy: { label: "健康", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "预警", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  critical: { label: "危险", color: "bg-red-100 text-red-700", icon: <Zap className="h-3 w-3" /> },
}

export function EquipmentHealth() {
  const [searchQuery, setSearchQuery] = useState("")
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
  const chartRef = useRef<HTMLDivElement>(null)

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

  const filteredData = healthData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const avgHealth = Math.round(healthData.reduce((sum, item) => sum + item.health, 0) / healthData.length)
  const healthyCount = healthData.filter((item) => item.status === "healthy").length
  const warningCount = healthData.filter((item) => item.status === "warning").length
  const criticalCount = healthData.filter((item) => item.status === "critical").length

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
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Gauge className="h-4 w-4 mr-2" />
          开始检测
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
              {chartSize.width > 0 && chartSize.height > 0 && (
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
                  <Area type="monotone" dataKey="EQ001" name="数控机床 A型" stroke="#10b981" fillOpacity={1} fill="url(#colorEQ001)" />
                  <Area type="monotone" dataKey="EQ002" name="注塑机 B型" stroke="#f59e0b" fillOpacity={0.3} fill="#f59e0b" />
                  <Area type="monotone" dataKey="EQ003" name="激光切割机" stroke="#ef4444" fillOpacity={0.3} fill="#ef4444" />
                </AreaChart>
              </ResponsiveContainer>
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
                {filteredData.map((item) => {
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
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
