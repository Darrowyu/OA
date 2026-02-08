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
  ArrowLeftRight,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Package,
  User,
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

// 模拟出入库流水数据
const stockRecords = [
  {
    id: "ST001",
    partId: "PT001",
    partName: "液压密封圈",
    model: "HS-50A",
    type: "in",
    quantity: 100,
    unit: "个",
    beforeStock: 56,
    afterStock: 156,
    operator: "张三",
    documentNo: "IN20260115001",
    date: "2026-01-15 10:30",
    remark: "常规采购入库",
  },
  {
    id: "ST002",
    partId: "PT002",
    partName: "伺服电机",
    model: "SM-2000W",
    type: "out",
    quantity: 2,
    unit: "台",
    beforeStock: 10,
    afterStock: 8,
    operator: "李四",
    documentNo: "OUT20260116001",
    date: "2026-01-16 14:20",
    remark: "维修领用出库",
  },
  {
    id: "ST003",
    partId: "PT003",
    partName: "刀具套装",
    model: "CT-SET-01",
    type: "in",
    quantity: 20,
    unit: "套",
    beforeStock: 5,
    afterStock: 25,
    operator: "王五",
    documentNo: "IN20260118001",
    date: "2026-01-18 09:00",
    remark: "紧急采购入库",
  },
  {
    id: "ST004",
    partId: "PT005",
    partName: "润滑油",
    model: "LO-68",
    type: "out",
    quantity: 10,
    unit: "桶",
    beforeStock: 52,
    afterStock: 42,
    operator: "赵六",
    documentNo: "OUT20260120001",
    date: "2026-01-20 11:45",
    remark: "日常保养领用",
  },
  {
    id: "ST005",
    partId: "PT004",
    partName: "激光器模块",
    model: "LM-3000",
    type: "in",
    quantity: 5,
    unit: "个",
    beforeStock: 0,
    afterStock: 5,
    operator: "张三",
    documentNo: "IN20260201001",
    date: "2026-02-01 08:30",
    remark: "年度备件采购",
  },
]

const typeMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  in: { label: "入库", color: "bg-green-100 text-green-700", icon: <ArrowDown className="h-3 w-3" /> },
  out: { label: "出库", color: "bg-orange-100 text-orange-700", icon: <ArrowUp className="h-3 w-3" /> },
}

export function PartsStock() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecords = stockRecords.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900">出入库流水</h1>
          <p className="text-gray-500 mt-1">查看配件出入库历史记录</p>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本月入库</p>
                <p className="text-3xl font-bold text-green-600 mt-1">156</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDown className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本月出库</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">89</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">库存变动</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">+67</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">操作次数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">245</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 流水记录列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>出入库记录</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索配件名称或单号..."
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
                  <TableHead>流水号</TableHead>
                  <TableHead>配件名称</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>变动前</TableHead>
                  <TableHead>变动后</TableHead>
                  <TableHead>操作人员</TableHead>
                  <TableHead>关联单据</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => {
                  const type = typeMap[item.type]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell>
                        <Badge className={type.color}>
                          <span className="flex items-center gap-1">
                            {type.icon}
                            {type.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className={item.type === "in" ? "text-green-600" : "text-orange-600"}>
                        {item.type === "in" ? "+" : "-"}{item.quantity}
                      </TableCell>
                      <TableCell>{item.beforeStock}</TableCell>
                      <TableCell>{item.afterStock}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {item.operator}
                        </span>
                      </TableCell>
                      <TableCell>{item.documentNo}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {item.date}
                        </span>
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
