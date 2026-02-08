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
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const scrapRecords = [
  { id: "SR001", partId: "PT002", partName: "伺服电机", model: "SM-2000W", quantity: 1, unit: "台", reason: "线圈烧毁，无法修复", originalValue: 8500, residualValue: 500, applicant: "张师傅", applyDate: "2026-01-20", status: "approved" },
  { id: "SR002", partId: "PT003", partName: "刀具套装", model: "CT-SET-01", quantity: 3, unit: "套", reason: "刀具磨损严重，已达使用寿命", originalValue: 1200, residualValue: 0, applicant: "李师傅", applyDate: "2026-01-25", status: "approved" },
  { id: "SR003", partId: "PT001", partName: "液压密封圈", model: "HS-50A", quantity: 20, unit: "个", reason: "存放时间过长，橡胶老化", originalValue: 800, residualValue: 0, applicant: "王师傅", applyDate: "2026-02-01", status: "pending" },
  { id: "SR004", partId: "PT005", partName: "润滑油", model: "LO-68", quantity: 2, unit: "桶", reason: "包装破损，油液污染", originalValue: 600, residualValue: 0, applicant: "赵师傅", applyDate: "2026-02-03", status: "rejected" },
]

const statusMap: Record<string, { label: string; color: string }> = {
  approved: { label: "已批准", color: "bg-green-100 text-green-700" },
  pending: { label: "审批中", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-700" },
}

export function PartsScrap() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredRecords = scrapRecords.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalLoss = scrapRecords
    .filter((item) => item.status === "approved")
    .reduce((sum, item) => sum + (item.originalValue - item.residualValue), 0)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="配件报废"
          description="管理配件报废申请和审批流程"
          buttonText="申请报废"
          buttonIcon={Plus}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="本月报废" value={8} icon={Trash2} color="red" />
        <StatCard label="已批准" value={5} icon={CheckCircle2} color="green" />
        <StatCard label="审批中" value={2} icon={Clock} color="yellow" />
        <StatCard label="累计损失" value={`¥${totalLoss.toLocaleString()}`} icon={DollarSign} color="orange" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>报废申请记录</CardTitle>
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
                  <TableHead>数量</TableHead>
                  <TableHead>报废原因</TableHead>
                  <TableHead>原值</TableHead>
                  <TableHead>残值</TableHead>
                  <TableHead>损失金额</TableHead>
                  <TableHead>申请人</TableHead>
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
                    <TableCell className="max-w-xs truncate">{item.reason}</TableCell>
                    <TableCell>¥{item.originalValue}</TableCell>
                    <TableCell>¥{item.residualValue}</TableCell>
                    <TableCell className="text-red-600">¥{item.originalValue - item.residualValue}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>
                      <Badge className={statusMap[item.status].color}>{statusMap[item.status].label}</Badge>
                    </TableCell>
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
