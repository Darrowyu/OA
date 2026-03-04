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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Building2,
  
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  User,
} from "lucide-react"
import {
  containerVariants,
  itemVariants,
  StatCard,
  PageHeader,
  SearchToolbar,
} from "./components"
import { factoryApi, type Factory, type CreateFactoryInput } from "@/services/factory"
import { toast } from "sonner"

// 模拟数据 - 后端API完成后替换
const mockFactories: Factory[] = [
  {
    id: "F001",
    name: "第一厂区",
    code: "F01",
    address: "上海市浦东新区张江高科技园区",
    manager: "张三",
    contactPhone: "13800138001",
    status: "active",
    createdAt: "2025-01-15T08:00:00Z",
    updatedAt: "2026-02-01T10:30:00Z",
  },
  {
    id: "F002",
    name: "第二厂区",
    code: "F02",
    address: "上海市嘉定区安亭镇",
    manager: "李四",
    contactPhone: "13800138002",
    status: "active",
    createdAt: "2025-03-20T09:00:00Z",
    updatedAt: "2026-01-15T14:20:00Z",
  },
  {
    id: "F003",
    name: "研发中心",
    code: "RD01",
    address: "上海市徐汇区漕河泾开发区",
    manager: "王五",
    contactPhone: "13800138003",
    status: "active",
    createdAt: "2025-06-10T10:00:00Z",
    updatedAt: "2026-02-10T16:45:00Z",
  },
]

export function FactoriesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [factories, setFactories] = useState<Factory[]>(mockFactories)
  const [loading, setLoading] = useState(false)

  // 模态框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null)

  // 表单状态
  const [formData, setFormData] = useState<CreateFactoryInput>({
    name: "",
    code: "",
    address: "",
    manager: "",
    contactPhone: "",
  })

  // 获取厂区列表
  const fetchFactories = useCallback(async () => {
    setLoading(true)
    try {
      const response = await factoryApi.getAllFactories()
      if (response.success) {
        setFactories(response.data)
      }
    } catch (error) {
      toast.error("获取厂区列表失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFactories()
  }, [fetchFactories])

  // 筛选数据
  const filteredFactories = factories.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manager?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 统计数据
  const activeCount = factories.filter((f) => f.status === "active").length
  const inactiveCount = factories.filter((f) => f.status === "inactive").length

  // 打开创建对话框
  const handleOpenCreate = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      manager: "",
      contactPhone: "",
    })
    setIsCreateDialogOpen(true)
  }

  // 打开编辑对话框
  const handleOpenEdit = (factory: Factory) => {
    setSelectedFactory(factory)
    setFormData({
      name: factory.name,
      code: factory.code || "",
      address: factory.address || "",
      manager: factory.manager || "",
      contactPhone: factory.contactPhone || "",
    })
    setIsEditDialogOpen(true)
  }

  // 打开删除对话框
  const handleOpenDelete = (factory: Factory) => {
    setSelectedFactory(factory)
    setIsDeleteDialogOpen(true)
  }

  // 验证厂区表单
  const validateFactoryForm = (data: CreateFactoryInput): boolean => {
    if (!data.name) {
      toast.error("厂区名称不能为空")
      return false
    }
    if (data.contactPhone && !/^1[3-9]\d{9}$/.test(data.contactPhone)) {
      toast.error("联系电话格式不正确")
      return false
    }
    if (data.code && !/^[A-Z0-9]{2,10}$/.test(data.code)) {
      toast.error("厂区编号格式不正确")
      return false
    }
    return true
  }

  // 创建厂区
  const handleCreate = async () => {
    if (!validateFactoryForm(formData)) return

    try {
      const response = await factoryApi.createFactory(formData)
      if (response.success) {
        toast.success("厂区创建成功")
        fetchFactories()
        setIsCreateDialogOpen(false)
      }
    } catch (error) {
      toast.error("创建厂区失败")
    }
  }

  // 更新厂区
  const handleUpdate = async () => {
    if (!selectedFactory) return
    if (!validateFactoryForm(formData)) return

    try {
      const response = await factoryApi.updateFactory(selectedFactory.id, formData)
      if (response.success) {
        toast.success("厂区更新成功")
        fetchFactories()
        setIsEditDialogOpen(false)
      }
    } catch (error) {
      toast.error("更新厂区失败")
    }
  }

  // 删除厂区
  const handleDelete = async () => {
    if (!selectedFactory) return

    try {
      await factoryApi.deleteFactory(selectedFactory.id)
      toast.success("厂区删除成功")
      fetchFactories()
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error("删除厂区失败")
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* 页面标题 */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="厂区管理"
          description="管理企业各厂区的基本信息"
          buttonText="添加厂区"
          buttonIcon={Plus}
          onButtonClick={handleOpenCreate}
        />
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="厂区总数" value={factories.length} icon={Building2} color="blue" />
        <StatCard label="正常运营" value={activeCount} icon={Building2} color="green" />
        <StatCard label="已停用" value={inactiveCount} icon={Building2} color="orange" />
        <StatCard label="设备总数" value={24} icon={Building2} color="purple" />
      </motion.div>

      {/* 厂区列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>厂区列表</CardTitle>
              <SearchToolbar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索厂区名称、编号或负责人..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>厂区编号</TableHead>
                  <TableHead>厂区名称</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredFactories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFactories.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code || item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {item.address || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {item.manager || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {item.contactPhone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {item.status === "active" ? "正常" : "已停用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* 创建对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加厂区</DialogTitle>
            <DialogDescription>填写厂区基本信息，创建新的厂区记录。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">厂区名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入厂区名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">厂区编号</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：F01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">地址</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入厂区地址"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager">负责人</Label>
                <Input
                  id="manager"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="请输入负责人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">联系电话</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="请输入联系电话"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} className="bg-gray-900 hover:bg-gray-800">
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑厂区</DialogTitle>
            <DialogDescription>修改厂区信息。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">厂区名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入厂区名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">厂区编号</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：F01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">地址</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入厂区地址"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-manager">负责人</Label>
                <Input
                  id="edit-manager"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="请输入负责人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactPhone">联系电话</Label>
                <Input
                  id="edit-contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="请输入联系电话"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} className="bg-gray-900 hover:bg-gray-800">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除厂区「{selectedFactory?.name}」吗？此操作无法撤销。
              {selectedFactory && (
                <p className="mt-2 text-red-500">
                  注意：如果该厂区下还有设备，将无法删除。
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
