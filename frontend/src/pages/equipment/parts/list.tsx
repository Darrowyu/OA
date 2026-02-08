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
import { Pagination } from "@/components/Pagination"
import { equipmentApi, type Part } from "@/services/equipment"
import { toast } from "sonner"

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  normal: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  low: { label: "库存不足", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3 w-3" /> },
  high: { label: "库存过多", color: "bg-yellow-100 text-yellow-700", icon: <AlertTriangle className="h-3 w-3" /> },
}

export function PartsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [parts, setParts] = useState<Part[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchParts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await equipmentApi.getPartsList({
        page: currentPage,
        pageSize: pageSize,
      })
      if (response.success) {
        setParts(response.data.items)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      toast.error("获取配件列表失败")
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize])

  useEffect(() => {
    fetchParts()
  }, [fetchParts])

  const filteredParts = parts.filter(
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((item) => {
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
