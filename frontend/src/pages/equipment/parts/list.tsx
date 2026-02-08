import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
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
  Package,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Warehouse,
  ArrowUpRight,
  Plus,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const partsData = [
  { id: "PT001", name: "液压密封圈", model: "HS-50A", category: "液压件", unit: "个", stock: 156, minStock: 50, maxStock: 200, location: "仓库A-01-03", supplier: "华密封件厂", status: "normal" },
  { id: "PT002", name: "伺服电机", model: "SM-2000W", category: "电机", unit: "台", stock: 8, minStock: 10, maxStock: 30, location: "仓库B-02-01", supplier: "精密电机公司", status: "low" },
  { id: "PT003", name: "刀具套装", model: "CT-SET-01", category: "刀具", unit: "套", stock: 25, minStock: 20, maxStock: 50, location: "仓库A-03-02", supplier: "锐锋刀具厂", status: "normal" },
  { id: "PT004", name: "激光器模块", model: "LM-3000", category: "激光件", unit: "个", stock: 3, minStock: 5, maxStock: 15, location: "仓库B-01-01", supplier: "光科激光", status: "low" },
  { id: "PT005", name: "润滑油", model: "LO-68", category: "油液", unit: "桶", stock: 42, minStock: 30, maxStock: 80, location: "仓库C-01-05", supplier: "石化油品", status: "normal" },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  normal: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  low: { label: "库存不足", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3 w-3" /> },
  high: { label: "库存过多", color: "bg-yellow-100 text-yellow-700", icon: <AlertTriangle className="h-3 w-3" /> },
}

export function PartsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredParts = partsData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="配件列表"
          description="管理设备配件库存信息"
          buttonText="添加配件"
          buttonIcon={Plus}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="配件总数" value={128} icon={Package} color="blue" />
        <StatCard label="库存正常" value={98} icon={CheckCircle2} color="green" />
        <StatCard label="库存预警" value={8} icon={AlertTriangle} color="red" />
        <StatCard label="库存总价值" value="¥268,500" icon={ArrowUpRight} color="purple" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>配件库存列表</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索配件名称或编号..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>配件编号</TableHead>
                  <TableHead>配件名称</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>当前库存</TableHead>
                  <TableHead>库存位置</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((item) => {
                  const status = statusMap[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.stock}</span>
                          <span className="text-gray-400 text-sm">/{item.maxStock}</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.stock < item.minStock ? "bg-red-500" :
                                item.stock > item.maxStock * 0.9 ? "bg-yellow-500" : "bg-green-500"
                              }`}
                              style={{ width: `${(item.stock / item.maxStock) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-gray-400" />
                          {item.location}
                        </span>
                      </TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">{status.icon}{status.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
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
