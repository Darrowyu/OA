import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Application,
  ApplicationStatus,
  Priority,
  ApprovalRecord,
} from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { applicationsApi } from "@/services/applications"
import { approvalsApi } from "@/services/approvals"
import { formatDate, formatAmount, cn } from "@/lib/utils"
import {
  Search,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
} from "lucide-react"
import { toast } from "sonner"

// 状态筛选选项
type StatusFilter = "all" | "approved" | "rejected"
type TimeFilter = "all" | "week" | "month" | "year"

const statusFilterOptions = [
  { value: "all", label: "全部状态" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
]

const timeFilterOptions = [
  { value: "all", label: "全部时间" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "year", label: "本年" },
]

// 优先级映射
const priorityMap: Record<string, { label: string; color: string }> = {
  [Priority.LOW]: { label: "低", color: "bg-gray-100 text-gray-800" },
  [Priority.NORMAL]: { label: "普通", color: "bg-blue-100 text-blue-800" },
  [Priority.HIGH]: { label: "高", color: "bg-orange-100 text-orange-800" },
  [Priority.URGENT]: { label: "紧急", color: "bg-red-100 text-red-800" },
}

// 审批动作映射
const actionMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  APPROVE: { label: "通过", color: "text-green-600", icon: <CheckCircle className="h-4 w-4" /> },
  REJECT: { label: "拒绝", color: "text-red-600", icon: <XCircle className="h-4 w-4" /> },
}

// 统计卡片组件
interface StatCardProps {
  title: string
  amount: number
  count: number
  icon: React.ReactNode
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ title, amount, count, icon, color }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{formatAmount(amount)}</p>
          <p className="text-sm text-gray-400 mt-1">{count} 笔申请</p>
        </div>
        <div className={cn("p-3 rounded-full", color)}>{icon}</div>
      </div>
    </CardContent>
  </Card>
)

export const ApprovedApplications: React.FC = () => {
  // const navigate = useNavigate()
  const { user } = useAuth()
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)

  // 筛选状态
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("all")
  const [keyword, setKeyword] = React.useState("")

  // 统计数据
  const [stats, setStats] = React.useState({
    totalAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    totalCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  })

  // 详情对话框
  const [detailDialog, setDetailDialog] = React.useState<{
    open: boolean
    application: Application | null
    approvalHistory: ApprovalRecord[]
    loadingHistory: boolean
  }>({
    open: false,
    application: null,
    approvalHistory: [],
    loadingHistory: false,
  })

  // 计算统计数据
  const calculateStats = React.useCallback((apps: Application[]) => {
    let totalAmount = 0
    let approvedAmount = 0
    let rejectedAmount = 0
    let approvedCount = 0
    let rejectedCount = 0

    apps.forEach((app) => {
      const amount = app.amount || 0
      totalAmount += amount

      if (app.status === ApplicationStatus.APPROVED) {
        approvedAmount += amount
        approvedCount++
      } else if (app.status === ApplicationStatus.REJECTED) {
        rejectedAmount += amount
        rejectedCount++
      }
    })

    setStats({
      totalAmount,
      approvedAmount,
      rejectedAmount,
      totalCount: apps.length,
      approvedCount,
      rejectedCount,
    })
  }, [])

  // 加载已审批列表
  const loadApprovedApplications = React.useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // 根据状态筛选构建查询参数
      let status: ApplicationStatus | undefined
      if (statusFilter === "approved") {
        status = ApplicationStatus.APPROVED
      } else if (statusFilter === "rejected") {
        status = ApplicationStatus.REJECTED
      }

      const response = await applicationsApi.getApplications({
        status,
        keyword: keyword || undefined,
        page,
        pageSize,
      })

      const items = response.data.data || []
      const pagination = response.data.pagination

      setApplications(items)
      setTotal(pagination?.total || 0)
      calculateStats(items)
    } catch (error) {
      toast.error("加载审批记录失败")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [user, statusFilter, timeFilter, keyword, page, pageSize, calculateStats])

  React.useEffect(() => {
    loadApprovedApplications()
  }, [loadApprovedApplications])

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadApprovedApplications()
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  // 加载审批历史
  const loadApprovalHistory = async (applicationId: string) => {
    setDetailDialog((prev) => ({ ...prev, loadingHistory: true }))
    try {
      const response = await approvalsApi.getApprovalHistory(applicationId)
      setDetailDialog((prev) => ({
        ...prev,
        approvalHistory: response.data.data || [],
        loadingHistory: false,
      }))
    } catch (error) {
      toast.error("加载审批历史失败")
      setDetailDialog((prev) => ({ ...prev, loadingHistory: false }))
    }
  }

  // 打开详情对话框
  const openDetailDialog = (application: Application) => {
    setDetailDialog({
      open: true,
      application,
      approvalHistory: [],
      loadingHistory: true,
    })
    loadApprovalHistory(application.id)
  }

  // 渲染优先级徽章
  const renderPriorityBadge = (priority: Priority) => {
    const config = priorityMap[priority] || priorityMap[Priority.NORMAL]
    return <Badge className={config.color}>{config.label}</Badge>
  }

  // 渲染状态徽章
  const renderStatusBadge = (status: ApplicationStatus) => {
    if (status === ApplicationStatus.APPROVED) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          已通过
        </Badge>
      )
    }
    if (status === ApplicationStatus.REJECTED) {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          已拒绝
        </Badge>
      )
    }
    return <Badge>{status}</Badge>
  }

  // 移动端卡片视图
  const MobileCard = ({ app }: { app: Application }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">{app.applicationNo}</p>
            <h3 className="font-medium text-gray-900">{app.title}</h3>
          </div>
          {renderStatusBadge(app.status)}
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4" />
            <span>{app.submitterName}</span>
            <span className="text-gray-400">({app.submitterDepartment})</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(app.completedAt || app.updatedAt)}</span>
          </div>
          {app.amount !== null && (
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>{formatAmount(app.amount)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">优先级:</span>
            {renderPriorityBadge(app.priority)}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => openDetailDialog(app)}
        >
          <Eye className="h-4 w-4 mr-1" />
          查看详情
        </Button>
      </CardContent>
    </Card>
  )

  const totalPages = Math.ceil(total / pageSize)

  // 如果没有登录
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">请先登录</h3>
            <p className="text-gray-500">登录后查看审批记录</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">已审批记录</h1>
            <p className="text-sm text-gray-500 mt-1">
              共 {total} 条审批记录
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="审核总金额"
            amount={stats.totalAmount}
            count={stats.totalCount}
            icon={<Wallet className="h-6 w-6 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            title="通过金额"
            amount={stats.approvedAmount}
            count={stats.approvedCount}
            icon={<TrendingUp className="h-6 w-6 text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            title="拒绝金额"
            amount={stats.rejectedAmount}
            count={stats.rejectedCount}
            icon={<TrendingDown className="h-6 w-6 text-red-600" />}
            color="bg-red-50"
          />
        </div>

        {/* 筛选栏 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="搜索申请编号、标题或申请人..."
                    className="pl-10"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter)
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select
                  value={timeFilter}
                  onValueChange={(value) => {
                    setTimeFilter(value as TimeFilter)
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 加载状态 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无审批记录</h3>
              <p className="text-gray-500">没有找到符合条件的审批记录</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 移动端卡片视图 */}
            <div className="md:hidden">
              {applications.map((app) => (
                <MobileCard key={app.id} app={app} />
              ))}
            </div>

            {/* PC端表格视图 */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>申请编号</TableHead>
                        <TableHead>标题</TableHead>
                        <TableHead>申请人</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>优先级</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>完成时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.applicationNo}</TableCell>
                          <TableCell>{app.title}</TableCell>
                          <TableCell>{app.submitterName}</TableCell>
                          <TableCell>{app.submitterDepartment}</TableCell>
                          <TableCell>{formatAmount(app.amount)}</TableCell>
                          <TableCell>{renderPriorityBadge(app.priority)}</TableCell>
                          <TableCell>{renderStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            {formatDate(app.completedAt || app.updatedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetailDialog(app)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-600">
                  第 {page} 页 / 共 {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 详情对话框 */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) =>
          setDetailDialog({ open, application: null, approvalHistory: [], loadingHistory: false })
        }
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>审批详情</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {detailDialog.application && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">基本信息</h3>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">申请编号</Label>
                      <p className="text-sm font-medium">
                        {detailDialog.application.applicationNo}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">状态</Label>
                      <div className="mt-1">
                        {renderStatusBadge(detailDialog.application.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">申请人</Label>
                      <p className="text-sm">{detailDialog.application.submitterName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">部门</Label>
                      <p className="text-sm">{detailDialog.application.submitterDepartment}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">金额</Label>
                      <p className="text-sm font-medium">
                        {formatAmount(detailDialog.application.amount)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">优先级</Label>
                      <div className="mt-1">
                        {renderPriorityBadge(detailDialog.application.priority)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 申请内容 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">申请内容</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-sm mb-2">{detailDialog.application.title}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {detailDialog.application.content}
                    </p>
                  </div>
                </div>

                {/* 附件 */}
                {detailDialog.application.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">附件</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        {detailDialog.application.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span>{att.originalName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 审批历史 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">审批历史</h3>
                  {detailDialog.loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : detailDialog.approvalHistory.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                      暂无审批记录
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detailDialog.approvalHistory.map((record) => {
                        const actionConfig = actionMap[record.action] || {
                          label: record.action,
                          color: "text-gray-600",
                          icon: null,
                        }
                        return (
                          <div
                            key={record.id}
                            className="bg-gray-50 rounded-lg p-4 flex items-start gap-3"
                          >
                            <div className={cn("mt-0.5", actionConfig.color)}>
                              {actionConfig.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {record.approverName}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {record.approverRole}
                                  </Badge>
                                  <span className={cn("text-sm", actionConfig.color)}>
                                    {actionConfig.label}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {formatDate(record.createdAt)}
                                </span>
                              </div>
                              {record.comment && (
                                <p className="text-sm text-gray-600 mt-1">
                                  备注: {record.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() =>
                setDetailDialog({
                  open: false,
                  application: null,
                  approvalHistory: [],
                  loadingHistory: false,
                })
              }
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
