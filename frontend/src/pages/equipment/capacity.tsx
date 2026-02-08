import { useState } from "react"
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

// 模拟产能数据
const capacityData = [
  {
    id: "EQ001",
    name: "数控机床 A型",
    theoreticalCapacity: 1000,
    actualCapacity: 850,
    utilization: 85,
    efficiency: 92,
    oee: 78,
    status: "good",
    uptime: 720,
    downtime: 120,
  },
  {
    id: "EQ002",
    name: "注塑机 B型",
    theoreticalCapacity: 800,
    actualCapacity: 680,
    utilization: 85,
    efficiency: 88,
    oee: 75,
    status: "good",
    uptime: 680,
    downtime: 160,
  },
  {
    id: "EQ003",
    name: "激光切割机",
    theoreticalCapacity: 500,
    actualCapacity: 200,
    utilization: 40,
    efficiency: 60,
    oee: 24,
    status: "poor",
    uptime: 240,
    downtime: 600,
  },
  {
    id: "EQ004",
    name: "自动焊接机器人",
    theoreticalCapacity: 600,
    actualCapacity: 540,
    utilization: 90,
    efficiency: 95,
    oee: 86,
    status: "excellent",
    uptime: 780,
    downtime: 60,
  },
  {
    id: "EQ005",
    name: "冲压机 C型",
    theoreticalCapacity: 1200,
    actualCapacity: 840,
    utilization: 70,
    efficiency: 82,
    oee: 57,
    status: "fair",
    uptime: 560,
    downtime: 280,
  },
]

// 产能趋势数据
const trendData = [
  { date: "1/1", actual: 2800, target: 3200 },
  { date: "1/8", actual: 2950, target: 3200 },
  { date: "1/15", actual: 3100, target: 3200 },
  { date: "1/22", actual: 3050, target: 3200 },
  { date: "1/29", actual: 3200, target: 3200 },
  { date: "2/5", actual: 3150, target: 3200 },
]

// OEE分布数据
const oeeData = [
  { name: "可用性", value: 85, fill: "#3b82f6" },
  { name: "性能", value: 88, fill: "#10b981" },
  { name: "质量", value: 96, fill: "#f59e0b" },
]

const statusMap: Record<string, { label: string; color: string }> = {
  excellent: { label: "优秀", color: "bg-green-100 text-green-700" },
  good: { label: "良好", color: "bg-blue-100 text-blue-700" },
  fair: { label: "一般", color: "bg-yellow-100 text-yellow-700" },
  poor: { label: "较差", color: "bg-red-100 text-red-700" },
}

export function EquipmentCapacity() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredData = capacityData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const avgOEE = Math.round(capacityData.reduce((sum, item) => sum + item.oee, 0) / capacityData.length)
  const avgUtilization = Math.round(capacityData.reduce((sum, item) => sum + item.utilization, 0) / capacityData.length)
  const totalActual = capacityData.reduce((sum, item) => sum + item.actualCapacity, 0)

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
                <p className="text-3xl font-bold text-gray-900 mt-1">{avgOEE}%</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-1">{avgUtilization}%</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalActual}</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-1">2,980</p>
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </CardContent>
        </Card>

        {/* OEE构成 */}
        <Card>
          <CardHeader>
            <CardTitle>OEE构成分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
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
