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
  ClipboardList,
  MoreHorizontal,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  Plus,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const usageRecords = [
  { id: "UR001", partId: "PT001", partName: "液压密封圈", model: "HS-50A", quantity: 10, unit: "个", applicant: "张师傅", department: "维修部", purpose: "EQ002注塑机维修", applyDate: "2026-02-05", status: "approved" },
  { id: "UR002", partId: "PT003", partName: "刀具套装", model: "CT-SET-01", quantity: 2, unit: "套", applicant: "李师傅", department: "生产部", purpose: "日常更换", applyDate: "2026-02-06", status: "pending" },
  { id: "UR003", partId: "PT005", partName: "润滑油", model: "LO-68", quantity: 5, unit: "桶", applicant: "王师傅", department: "设备部", purpose: "月度保养", applyDate: "2026-02-07", status: "approved" },
  { id: "UR004", partId: "PT002", partName: "伺服电机", model: "SM-2000W", quantity: 1, unit: "台", applicant: "赵师傅", department: "维修部", purpose: "EQ001故障更换", applyDate: "2026-02-07", status: "rejected" },
]

const statusMap: Record<string, { label: string; color: string }> = {
  approved: { label: "已批准", color: "bg-green-100 text-green-700" },
  pending: { label: "审批中", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-700" },
}

export function PartsUsage() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredRecords = usageRecords.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="日常领用"
          description="管理配件的日常领用申请和审批"
          buttonText="申请领用"
          buttonIcon={Plus}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="本月领用" value={28} icon={ClipboardList} color="blue" />
        <StatCard label="已批准" value={22} icon={CheckCircle2} color="green" />
        <StatCard label="审批中" value={5} icon={Clock} color="yellow" />
        <StatCard label="领用总价值" value="¥45,280" icon={Package} color="purple" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>领用申请记录</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索配件名称或申请单号..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请单号</TableHead>
                  <TableHead>配件名称</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>领用数量</TableHead>
                  <TableHead>申请人</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead>申请日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        {item.applicant}
                      </span>
                    </TableCell>
                    <TableCell>{item.department}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.purpose}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {item.applyDate}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[item.status].color}>
                        {statusMap[item.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
