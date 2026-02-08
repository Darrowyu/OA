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
  FileText,
  MoreHorizontal,
  Copy,
  Clock,
  CheckCircle2,
  Layers,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"

const maintenanceTemplates = [
  { id: "MT001", name: "数控机床月度保养模板", category: "数控机床", items: 8, estimatedTime: "4小时", createdBy: "张师傅", createdAt: "2025-12-01", usageCount: 12, status: "active" },
  { id: "MT002", name: "注塑机季度深度保养模板", category: "注塑机", items: 15, estimatedTime: "8小时", createdBy: "李师傅", createdAt: "2025-11-15", usageCount: 4, status: "active" },
  { id: "MT003", name: "激光切割机半年度保养模板", category: "激光设备", items: 12, estimatedTime: "6小时", createdBy: "王师傅", createdAt: "2025-10-20", usageCount: 2, status: "active" },
  { id: "MT004", name: "焊接机器人月度保养模板", category: "机器人", items: 10, estimatedTime: "3小时", createdBy: "张师傅", createdAt: "2025-12-10", usageCount: 3, status: "active" },
  { id: "MT005", name: "冲压机周度检查模板", category: "冲压设备", items: 6, estimatedTime: "1小时", createdBy: "赵师傅", createdAt: "2025-11-01", usageCount: 20, status: "draft" },
]

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "已启用", color: "bg-green-100 text-green-700" },
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700" },
}

export function MaintenanceTemplates() {
  const [searchQuery, setSearchQuery] = useState("")
  const filteredTemplates = maintenanceTemplates.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="保养模板"
          description="管理标准化保养模板，提高保养效率"
          buttonText="新建模板"
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="模板总数" value={8} icon={FileText} color="blue" />
        <StatCard label="已启用" value={6} icon={CheckCircle2} color="green" />
        <StatCard label="累计使用" value="156次" icon={Layers} color="purple" />
        <StatCard label="平均耗时" value="4.5小时" icon={Clock} color="orange" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>保养模板列表</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索模板名称或分类..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模板编号</TableHead>
                  <TableHead>模板名称</TableHead>
                  <TableHead>适用分类</TableHead>
                  <TableHead>检查项数</TableHead>
                  <TableHead>预计耗时</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>使用次数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                    <TableCell>{item.items}项</TableCell>
                    <TableCell>{item.estimatedTime}</TableCell>
                    <TableCell>{item.createdBy}</TableCell>
                    <TableCell>{item.createdAt}</TableCell>
                    <TableCell>{item.usageCount}次</TableCell>
                    <TableCell><Badge className={statusMap[item.status].color}>{statusMap[item.status].label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon"><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
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
