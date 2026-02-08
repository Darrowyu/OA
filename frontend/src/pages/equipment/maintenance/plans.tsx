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
  CalendarDays,
  MoreHorizontal,
  Bell,
  Repeat,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const maintenancePlans = [
  { id: "MP001", equipmentId: "EQ001", equipmentName: "数控机床 A型", planName: "月度定期保养", frequency: "每月一次", nextDate: "2026-02-15", responsible: "张师傅", status: "active", reminderDays: 7 },
  { id: "MP002", equipmentId: "EQ002", equipmentName: "注塑机 B型", planName: "季度深度保养", frequency: "每季度一次", nextDate: "2026-03-20", responsible: "李师傅", status: "active", reminderDays: 14 },
  { id: "MP003", equipmentId: "EQ003", equipmentName: "激光切割机", planName: "半年度专业保养", frequency: "每半年一次", nextDate: "2026-02-10", responsible: "王师傅", status: "warning", reminderDays: 2 },
  { id: "MP004", equipmentId: "EQ004", equipmentName: "自动焊接机器人", planName: "月度定期保养", frequency: "每月一次", nextDate: "2026-02-25", responsible: "张师傅", status: "active", reminderDays: 7 },
  { id: "MP005", equipmentId: "EQ005", equipmentName: "冲压机 C型", planName: "周度检查保养", frequency: "每周一次", nextDate: "2026-02-08", responsible: "赵师傅", status: "overdue", reminderDays: 0 },
]

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "即将到期", color: "bg-yellow-100 text-yellow-700", icon: <Bell className="h-3 w-3" /> },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
}

export function MaintenancePlans() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredPlans = maintenancePlans.filter(
    (item) =>
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.planName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="保养计划"
          description="管理设备定期保养计划，确保设备正常运行"
          buttonText="新建计划"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="计划总数" value={15} icon={CalendarDays} color="blue" />
        <StatCard label="正常" value={10} icon={CheckCircle2} color="green" />
        <StatCard label="即将到期" value={3} icon={Bell} color="yellow" />
        <StatCard label="已逾期" value={2} icon={AlertCircle} color="red" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>保养计划列表</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索设备或计划名称..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>计划编号</TableHead>
                  <TableHead>设备名称</TableHead>
                  <TableHead>计划名称</TableHead>
                  <TableHead>保养频率</TableHead>
                  <TableHead>下次保养日期</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>提前提醒</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((item) => {
                  const status = statusMap[item.status]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.equipmentName}</TableCell>
                      <TableCell>{item.planName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Repeat className="h-3 w-3 text-gray-400" />
                          {item.frequency}
                        </span>
                      </TableCell>
                      <TableCell>{item.nextDate}</TableCell>
                      <TableCell>{item.responsible}</TableCell>
                      <TableCell>{item.reminderDays}天</TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
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
