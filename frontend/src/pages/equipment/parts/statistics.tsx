import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  TrendingUp,
  Package,
  DollarSign,
  RotateCcw,
  Download,
  Calendar,
} from "lucide-react"

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

// 月度出入库统计
const monthlyData = [
  { month: "1月", in: 120, out: 80 },
  { month: "2月", in: 156, out: 89 },
  { month: "3月", in: 180, out: 95 },
  { month: "4月", in: 140, out: 110 },
  { month: "5月", in: 160, out: 120 },
  { month: "6月", in: 190, out: 130 },
]

// 配件分类占比
const categoryData = [
  { name: "液压件", value: 30, color: "#3b82f6" },
  { name: "电机", value: 25, color: "#10b981" },
  { name: "刀具", value: 20, color: "#f59e0b" },
  { name: "激光件", value: 15, color: "#8b5cf6" },
  { name: "油液", value: 10, color: "#ec4899" },
]

// 热门配件排行
const topParts = [
  { name: "液压密封圈", usage: 156, trend: "up" },
  { name: "刀具套装", usage: 128, trend: "up" },
  { name: "润滑油", usage: 89, trend: "down" },
  { name: "轴承", usage: 76, trend: "up" },
  { name: "滤芯", usage: 65, trend: "stable" },
]

export function PartsStatistics() {
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
          <h1 className="text-2xl font-bold text-gray-900">使用统计</h1>
          <p className="text-gray-500 mt-1">配件使用数据分析与可视化</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            本月
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总领用次数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">1,248</p>
                <p className="text-sm text-green-600 mt-1">+12% 较上月</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总出库数量</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">856</p>
                <p className="text-sm text-green-600 mt-1">+8% 较上月</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">配件总价值</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">¥268,500</p>
                <p className="text-sm text-red-600 mt-1">-5% 较上月</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">库存周转率</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">4.2</p>
                <p className="text-sm text-green-600 mt-1">+0.3 较上月</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <RotateCcw className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 图表区域 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度出入库趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>月度出入库趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="in" name="入库" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out" name="出库" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 配件分类占比 */}
        <Card>
          <CardHeader>
            <CardTitle>配件分类占比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">
                      {item.name} ({item.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 热门配件排行 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>热门配件排行 (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topParts.map((part, index) => (
                <div key={part.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{part.name}</span>
                      <span className="text-sm text-gray-500">{part.usage} 次</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(part.usage / 156) * 100}%` }}
                      />
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      part.trend === "up"
                        ? "bg-green-100 text-green-700"
                        : part.trend === "down"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {part.trend === "up" ? "↑" : part.trend === "down" ? "↓" : "-"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
