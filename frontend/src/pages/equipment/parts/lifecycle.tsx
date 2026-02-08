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
  RefreshCw,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const lifecycleData = [
  { id: "PT001", name: "液压密封圈", model: "HS-50A", totalCycles: 156, installedCycles: 45, remainingCycles: 111, avgUsage: 5, status: "active", expectedEndDate: "2026-06-15" },
  { id: "PT002", name: "伺服电机", model: "SM-2000W", totalCycles: 5000, installedCycles: 4200, remainingCycles: 800, avgUsage: 20, status: "warning", expectedEndDate: "2026-03-20" },
  { id: "PT003", name: "刀具套装", model: "CT-SET-01", totalCycles: 200, installedCycles: 180, remainingCycles: 20, avgUsage: 8, status: "critical", expectedEndDate: "2026-02-10" },
  { id: "PT004", name: "激光器模块", model: "LM-3000", totalCycles: 3000, installedCycles: 1500, remainingCycles: 1500, avgUsage: 10, status: "active", expectedEndDate: "2026-09-01" },
  { id: "PT005", name: "轴承", model: "BR-6204", totalCycles: 800, installedCycles: 800, remainingCycles: 0, avgUsage: 0, status: "expired", expectedEndDate: "2026-01-15" },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "即将到期", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  critical: { label: "急需更换", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  expired: { label: "已到期", color: "bg-gray-100 text-gray-700", icon: <XCircle className="h-3 w-3" /> },
}

export function PartsLifecycle() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredData = lifecycleData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader title="生命周期" description="追踪配件使用周期和寿命预测" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="监控配件" value={42} icon={Clock} color="blue" />
        <StatCard label="正常" value={28} icon={CheckCircle2} color="green" />
        <StatCard label="即将到期" value={10} icon={AlertCircle} color="yellow" />
        <StatCard label="平均寿命周期" value="85%" icon={TrendingUp} color="purple" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>配件生命周期追踪</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索配件名称或编号..."
                extraButton={{ icon: RefreshCw, onClick: () => {} }}
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
                  <TableHead>总周期</TableHead>
                  <TableHead>已使用</TableHead>
                  <TableHead>剩余</TableHead>
                  <TableHead>预计到期</TableHead>
                  <TableHead>寿命进度</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const status = statusMap[item.status]
                  const usagePercent = (item.installedCycles / item.totalCycles) * 100
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell>{item.totalCycles}</TableCell>
                      <TableCell>{item.installedCycles}</TableCell>
                      <TableCell className={item.remainingCycles < 100 ? "text-red-600 font-medium" : ""}>
                        {item.remainingCycles}
                      </TableCell>
                      <TableCell>{item.expectedEndDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-green-500"
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{usagePercent.toFixed(0)}%</span>
                        </div>
                      </TableCell>
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
