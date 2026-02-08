import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Monitor,
  MoreHorizontal,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "./components"

const equipmentData = [
  { id: "EQ001", name: "数控机床 A型", model: "CNC-2000X", location: "生产车间A-01", status: "running", health: 92, lastMaintenance: "2026-01-15", nextMaintenance: "2026-04-15" },
  { id: "EQ002", name: "注塑机 B型", model: "IMM-500T", location: "生产车间A-02", status: "warning", health: 78, lastMaintenance: "2026-01-20", nextMaintenance: "2026-02-20" },
  { id: "EQ003", name: "激光切割机", model: "LC-3000", location: "生产车间B-01", status: "stopped", health: 45, lastMaintenance: "2025-12-10", nextMaintenance: "2026-02-10" },
  { id: "EQ004", name: "自动焊接机器人", model: "AW-R01", location: "生产车间B-02", status: "running", health: 88, lastMaintenance: "2026-01-25", nextMaintenance: "2026-04-25" },
  { id: "EQ005", name: "冲压机 C型", model: "PM-100T", location: "生产车间A-03", status: "maintenance", health: 60, lastMaintenance: "2026-02-01", nextMaintenance: "2026-02-08" },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  running: { label: "运行中", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "预警", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  stopped: { label: "停机", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  maintenance: { label: "保养中", color: "bg-blue-100 text-blue-700", icon: <Settings className="h-3 w-3" /> },
}

export function EquipmentInfo() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredEquipment = equipmentData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="设备信息"
          description="管理和监控企业所有生产设备"
          buttonText="添加设备"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="设备总数" value={24} icon={Monitor} color="blue" />
        <StatCard label="运行中" value={18} icon={CheckCircle2} color="green" />
        <StatCard label="待保养" value={4} icon={Settings} color="yellow" />
        <StatCard label="故障停机" value={2} icon={AlertCircle} color="red" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>设备列表</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索设备名称或编号..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>健康度</TableHead>
                  <TableHead>上次保养</TableHead>
                  <TableHead>下次保养</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => {
                  const status = statusMap[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.health >= 80 ? "bg-green-500" : item.health >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${item.health}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{item.health}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.lastMaintenance}</TableCell>
                      <TableCell>{item.nextMaintenance}</TableCell>
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
