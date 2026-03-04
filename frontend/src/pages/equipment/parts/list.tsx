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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Package,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Warehouse,
  ArrowUpRight,
  Plus,
  FolderTree,
  History,
  ShoppingCart,
  FileText,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "../components"
import { Pagination } from "@/components/Pagination"
import { equipmentApi, type Part, type SparePartCategory, type PartInventoryLog, type Requisition } from "@/services/equipment"
import { toast } from "sonner"

// 模拟分类数据
const mockCategories: SparePartCategory[] = [
  {
    id: "C001",
    name: "机械零件",
    parentId: null,
    description: "机械设备常用零件",
    sortOrder: 1,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    children: [
      {
        id: "C001-1",
        name: "轴承",
        parentId: "C001",
        description: "各类轴承",
        sortOrder: 1,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
        _count: { parts: 12 },
      },
      {
        id: "C001-2",
        name: "齿轮",
        parentId: "C001",
        description: "各类齿轮",
        sortOrder: 2,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
        _count: { parts: 8 },
      },
    ],
    _count: { parts: 20 },
  },
  {
    id: "C002",
    name: "电气元件",
    parentId: null,
    description: "电气控制元件",
    sortOrder: 2,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    children: [
      {
        id: "C002-1",
        name: "继电器",
        parentId: "C002",
        description: "控制继电器",
        sortOrder: 1,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
        _count: { parts: 15 },
      },
    ],
    _count: { parts: 15 },
  },
]

// 模拟库存日志
const mockInventoryLogs: PartInventoryLog[] = [
  {
    id: "L001",
    partId: "P001",
    type: "in",
    quantity: 50,
    beforeQuantity: 100,
    afterQuantity: 150,
    referenceType: "purchase",
    referenceId: "PO001",
    operator: "张三",
    notes: "采购入库",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "L002",
    partId: "P001",
    type: "out",
    quantity: 20,
    beforeQuantity: 150,
    afterQuantity: 130,
    referenceType: "usage",
    referenceId: "US001",
    operator: "李四",
    notes: "维修领用",
    createdAt: "2026-02-03T14:30:00Z",
  },
]

// 模拟预警数据
const mockAlerts = [
  {
    id: "P001",
    name: "轴承 6204",
    stock: 5,
    minStock: 10,
    alertType: "low" as const,
    alertMessage: "库存不足：当前 5，最低要求 10",
  },
  {
    id: "P002",
    name: "继电器 24V",
    stock: 200,
    maxStock: 150,
    alertType: "high" as const,
    alertMessage: "库存过高：当前 200，最高限制 150",
  },
]

// 模拟请购单（注释掉未使用的变量）
/*
const mockRequisition: Requisition = {
  requisitionNo: `RQ${Date.now()}`,
  createdAt: new Date().toISOString(),
  items: [
    {
      partId: "P001",
      partCode: "P001",
      partName: "轴承 6204",
      specification: "20x47x14mm",
      currentStock: 5,
      minStock: 10,
      suggestedQuantity: 15,
      unit: "个",
      category: "轴承",
    },
    {
      partId: "P003",
      partCode: "P003",
      partName: "齿轮 M2Z30",
      specification: "模数2，齿数30",
      currentStock: 3,
      minStock: 8,
      suggestedQuantity: 13,
      unit: "个",
      category: "齿轮",
    },
  ],
}
*/

export function PartsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [parts, setParts] = useState<Part[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  // 分类管理
  const [categories, setCategories] = useState<SparePartCategory[]>(mockCategories)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SparePartCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" })
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)

  // 库存日志
  const [inventoryLogs] = useState<PartInventoryLog[]>(mockInventoryLogs)

  // 预警
  const [alerts] = useState(mockAlerts)

  // 请购单
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [isRequisitionDialogOpen, setIsRequisitionDialogOpen] = useState(false)

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

  // 展开/收起分类
  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCategories(newExpanded)
  }

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const response = await equipmentApi.getPartCategories()
      if (response.success) {
        setCategories(response.data)
      }
    } catch (error) {
      toast.error("获取分类列表失败")
    }
  }, [])

  // 获取库存日志
  const fetchInventoryLogs = useCallback(async () => {
    try {
      const response = await equipmentApi.getInventoryLogs({ page: 1, pageSize: 50 })
      if (response.success) {
        // setInventoryLogs(response.data.items)
        console.log('库存日志:', response.data.items)
      }
    } catch (error) {
      toast.error("获取库存日志失败")
    }
  }, [])

  // 获取库存预警
  const fetchStockAlerts = useCallback(async () => {
    try {
      const response = await equipmentApi.getStockAlerts()
      if (response.success) {
        // setAlerts(response.data)
        console.log('库存预警:', response.data)
      }
    } catch (error) {
      toast.error("获取库存预警失败")
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchInventoryLogs()
    fetchStockAlerts()
  }, [fetchCategories, fetchInventoryLogs, fetchStockAlerts])

  // 创建分类
  const handleCreateCategory = async () => {
    if (!categoryForm.name) {
      toast.error("分类名称不能为空")
      return
    }

    try {
      const response = await equipmentApi.createPartCategory(categoryForm)
      if (response.success) {
        toast.success("分类创建成功")
        fetchCategories()
        setIsCategoryDialogOpen(false)
        setCategoryForm({ name: "", description: "" })
      }
    } catch (error) {
      toast.error("创建分类失败")
    }
  }

  // 删除分类
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      await equipmentApi.deletePartCategory(selectedCategory.id)
      toast.success("分类删除成功")
      fetchCategories()
      setIsDeleteCategoryDialogOpen(false)
    } catch (error) {
      toast.error("删除分类失败")
    }
  }

  // 生成请购单
  const handleGenerateRequisition = async () => {
    try {
      const response = await equipmentApi.generateRequisition()
      if (response.success) {
        setRequisition(response.data)
        setIsRequisitionDialogOpen(true)
      }
    } catch (error) {
      toast.error("生成请购单失败")
    }
  }

  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    normal: { label: "正常", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    low: { label: "库存不足", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3 w-3" /> },
    high: { label: "库存过多", color: "bg-yellow-100 text-yellow-700", icon: <AlertTriangle className="h-3 w-3" /> },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="配件管理"
          description="管理设备配件库存、分类和请购"
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
        <Tabs value="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">配件列表</TabsTrigger>
            <TabsTrigger value="categories">分类管理</TabsTrigger>
            <TabsTrigger value="logs">库存日志</TabsTrigger>
            <TabsTrigger value="alerts">库存预警</TabsTrigger>
          </TabsList>

          {/* 配件列表 */}
          <TabsContent value="list">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>配件库存列表</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerateRequisition}>
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      生成请购单
                    </Button>
                    <SearchToolbar
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="搜索配件名称或编号..."
                    />
                  </div>
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
          </TabsContent>

          {/* 分类管理 */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>配件分类</CardTitle>
                  <Button size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加分类
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <FolderTree className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="secondary">{category._count?.parts || 0} 个配件</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCategory(category)
                              setCategoryForm({ name: category.name, description: category.description || "" })
                              setIsCategoryDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCategory(category)
                              setIsDeleteCategoryDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {expandedCategories.has(category.id) && category.children && category.children.length > 0 && (
                        <div className="border-t bg-gray-50">
                          {category.children.map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between p-4 pl-12 border-b last:border-b-0"
                            >
                              <div className="flex items-center gap-2">
                                <FolderTree className="h-4 w-4 text-gray-400" />
                                <span>{child.name}</span>
                                <Badge variant="secondary">{child._count?.parts || 0} 个配件</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedCategory(child)
                                    setCategoryForm({ name: child.name, description: child.description || "" })
                                    setIsCategoryDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedCategory(child)
                                    setIsDeleteCategoryDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 库存日志 */}
          <TabsContent value="logs">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>库存变动日志</CardTitle>
                  <History className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>配件</TableHead>
                      <TableHead>变动数量</TableHead>
                      <TableHead>变动前</TableHead>
                      <TableHead>变动后</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.type === "in"
                                ? "bg-green-100 text-green-700"
                                : log.type === "out"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {log.type === "in" ? "入库" : log.type === "out" ? "出库" : "调整"}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.partId}</TableCell>
                        <TableCell className={log.type === "in" ? "text-green-600" : "text-red-600"}>
                          {log.type === "in" ? "+" : "-"}{log.quantity}
                        </TableCell>
                        <TableCell>{log.beforeQuantity}</TableCell>
                        <TableCell>{log.afterQuantity}</TableCell>
                        <TableCell>{log.operator}</TableCell>
                        <TableCell>{log.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 库存预警 */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>库存预警</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>配件编号</TableHead>
                      <TableHead>配件名称</TableHead>
                      <TableHead>当前库存</TableHead>
                      <TableHead>预警类型</TableHead>
                      <TableHead>预警信息</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.id}</TableCell>
                        <TableCell>{alert.name}</TableCell>
                        <TableCell>{alert.stock}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              alert.alertType === "low"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {alert.alertType === "low" ? "库存不足" : "库存过高"}
                          </Badge>
                        </TableCell>
                        <TableCell>{alert.alertMessage}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            请购
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* 分类对话框 */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "编辑分类" : "添加分类"}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? "修改分类信息" : "创建新的配件分类"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">分类名称 *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="请输入分类名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">描述</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="请输入分类描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateCategory} className="bg-gray-900 hover:bg-gray-800">
              {selectedCategory ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除分类确认对话框 */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除分类「{selectedCategory?.name}」吗？
              {(selectedCategory?._count?.parts || 0) > 0 && (
                <p className="mt-2 text-red-500">
                  该分类下还有 {selectedCategory?._count?.parts} 个配件，请先转移或删除配件。
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-500 hover:bg-red-600"
              disabled={(selectedCategory?._count?.parts || 0) > 0}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 请购单对话框 */}
      <Dialog open={isRequisitionDialogOpen} onOpenChange={setIsRequisitionDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>配件请购单</DialogTitle>
            <DialogDescription>
              请购单号: {requisition?.requisitionNo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>生成时间: {requisition?.createdAt && new Date(requisition.createdAt).toLocaleString()}</span>
              <span>共 {requisition?.items.length} 项</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>配件编号</TableHead>
                  <TableHead>配件名称</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>当前库存</TableHead>
                  <TableHead>建议采购量</TableHead>
                  <TableHead>单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisition?.items.map((item) => (
                  <TableRow key={item.partId}>
                    <TableCell className="font-medium">{item.partCode}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell>{item.specification}</TableCell>
                    <TableCell>{item.currentStock}</TableCell>
                    <TableCell className="font-medium text-blue-600">{item.suggestedQuantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequisitionDialogOpen(false)}>
              关闭
            </Button>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <FileText className="h-4 w-4 mr-2" />
              导出请购单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
