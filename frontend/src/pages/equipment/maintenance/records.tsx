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
  Wrench,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const maintenanceRecords = [
  { id: "MR001", equipmentId: "EQ001", equipmentName: "数控机床 A型", type: "保养", content: "定期润滑、清洁、检查刀具磨损", operator: "张师傅", startTime: "2026-01-15 08:00", endTime: "2026-01-15 12:00", duration: "4小时", status: "completed", cost: 500 },
  { id: "MR002", equipmentId: "EQ002", equipmentName: "注塑机 B型", type: "维修", content: "更换液压密封件、调试压力参数", operator: "李师傅", startTime: "2026-01-20 09:00", endTime: "2026-01-20 16:00", duration: "7小时", status: "completed", cost: 2800 },
  { id: "MR003", equipmentId: "EQ003", equipmentName: "激光切割机", type: "维修", content: "激光器功率下降检修、光路校准", operator: "王师傅", startTime: "2026-01-22 08:30", endTime: null, duration: null, status: "in_progress", cost: null },
  { id: "MR004", equipmentId: "EQ005", equipmentName: "冲压机 C型", type: "保养", content: "更换润滑油、检查安全装置", operator: "张师傅", startTime: "2026-02-01 10:00", endTime: "2026-02-01 14:00", duration: "4小时", status: "completed", cost: 300 },
]

const statusMap: Record<string, { label: string; color: string }> = {
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  pending: { label: "待处理", color: "bg-yellow-100 text-yellow-700" },
}

const typeMap: Record<string, { label: string; color: string }> = {
  保养: { label: "保养", color: "bg-purple-100 text-purple-700" },
  维修: { label: "维修", color: "bg-orange-100 text-orange-700" },
}

export function MaintenanceRecords() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredRecords = maintenanceRecords.filter(
    (item) =>
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="维修/保养记录"
          description="查看和管理设备维修保养历史记录"
          buttonText="新建记录"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="本月记录" value={12} icon={Calendar} color="blue" />
        <StatCard label="进行中" value={3} icon={Clock} color="blue" />
        <StatCard label="已完成" value={9} icon={CheckCircle2} color="green" />
        <StatCard label="本月费用" value="¥12,580" icon={Wrench} color="purple" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>维修保养记录</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索设备名称或记录编号..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>记录编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>保养/维修内容</TableHead>
                  <TableHead>操作人员</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>完成时间</TableHead>
                  <TableHead>费用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.equipmentName}</TableCell>
                    <TableCell><Badge className={typeMap[item.type].color}>{typeMap[item.type].label}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{item.content}</TableCell>
                    <TableCell>{item.operator}</TableCell>
                    <TableCell>{item.startTime}</TableCell>
                    <TableCell>{item.endTime || "-"}</TableCell>
                    <TableCell>{item.cost ? `¥${item.cost}` : "-"}</TableCell>
                    <TableCell><Badge className={statusMap[item.status].color}>{statusMap[item.status].label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
