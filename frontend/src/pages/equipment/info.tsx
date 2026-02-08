import { useState, useEffect, useCallback } from "react"
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
import { Pagination } from "@/components/Pagination"
import { equipmentApi, type Equipment } from "@/services/equipment"
import { toast } from "sonner"

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  running: { label: "运行中", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  warning: { label: "预警", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  stopped: { label: "停机", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  maintenance: { label: "保养中", color: "bg-blue-100 text-blue-700", icon: <Settings className="h-3 w-3" /> },
}

export function EquipmentInfo() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchEquipment = useCallback(async () => {
    setLoading(true)
    try {
      const response = await equipmentApi.getEquipmentList({
        page: currentPage,
        pageSize: pageSize,
      })
      if (response.success) {
        setEquipmentList(response.data.items)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      toast.error("获取设备列表失败")
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize])

  useEffect(() => {
    fetchEquipment()
  }, [fetchEquipment])

  const filteredEquipment = equipmentList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((item) => {
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
                  })
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
