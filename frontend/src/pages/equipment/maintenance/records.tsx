import { useState, useEffect, useCallback } from "react"
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
import { Pagination } from "@/components/Pagination"
import { equipmentApi, type MaintenanceRecord } from "@/services/equipment"
import { toast } from "sonner"

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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const response = await equipmentApi.getMaintenanceRecords({
        page: currentPage,
        pageSize: pageSize,
      })
      if (response.success) {
        setRecords(response.data.items)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      toast.error("获取维修记录失败")
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const filteredRecords = records.filter(
    (item) =>
      item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((item) => (
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
                  ))
                )}
              </TableBody>
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
