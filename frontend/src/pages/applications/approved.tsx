import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
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
  Application,
  ApplicationStatus,
  Priority,
} from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { applicationsApi } from "@/services/applications"
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

const priorityMap: Record<string, { label: string; color: string; bgColor: string }> = {
  [Priority.LOW]: { label: "低", color: "text-gray-600", bgColor: "bg-gray-100" },
  [Priority.NORMAL]: { label: "普通", color: "text-blue-600", bgColor: "bg-blue-100" },
  [Priority.HIGH]: { label: "高", color: "text-amber-600", bgColor: "bg-amber-100" },
  [Priority.URGENT]: { label: "紧急", color: "text-red-600", bgColor: "bg-red-100" },
}

// 统计卡片组件
interface StatCardProps {
  title: string
  amount: number
  count: number
  icon: React.ReactNode
  variant: "blue" | "green" | "red"
}

const StatCard: React.FC<StatCardProps> = ({ title, amount, count, icon, variant }) => {
  const variantStyles = {
    blue: "from-blue-50 to-indigo-50",
    green: "from-emerald-50 to-green-50",
    red: "from-red-50 to-rose-50",
  }

  const iconStyles = {
    blue: "bg-blue-500 text-white shadow-lg shadow-blue-500/30",
    green: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    red: "bg-red-500 text-white shadow-lg shadow-red-500/30",
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${variantStyles[variant]} p-6 border border-gray-100`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(amount)}</p>
          <p className="text-xs text-gray-400 mt-1">{count} 笔申请</p>
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconStyles[variant]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export const ApprovedList: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("all")
  const [keyword, setKeyword] = React.useState("")
  const [stats, setStats] = React.useState({
    totalAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    totalCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  })

  const calculateStats = React.useCallback((apps: Application[]) => {
    let totalAmount = 0, approvedAmount = 0, rejectedAmount = 0
    let approvedCount = 0, rejectedCount = 0

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

  const loadApprovedApplications = React.useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let status: ApplicationStatus | undefined
      if (statusFilter === "approved") status = ApplicationStatus.APPROVED
      else if (statusFilter === "rejected") status = ApplicationStatus.REJECTED

      const response = await applicationsApi.getApplications({
        status,
        keyword: keyword || undefined,
        page,
        pageSize,
      })

      const items = response.data.items || []
      setApplications(items)
      setTotal(response.data.pagination?.total || 0)
      calculateStats(items)
    } catch (error) {
      toast.error("加载审批记录失败")
    } finally {
      setLoading(false)
    }
  }, [user, statusFilter, keyword, page, pageSize, calculateStats])

  React.useEffect(() => {
    loadApprovedApplications()
  }, [loadApprovedApplications])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      loadApprovedApplications()
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  const renderPriorityBadge = (priority: Priority) => {
    const config = priorityMap[priority] || priorityMap[Priority.NORMAL]
    return (
      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
        {config.label}
      </span>
    )
  }

  const renderStatusBadge = (status: ApplicationStatus) => {
    if (status === ApplicationStatus.APPROVED) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <CheckCircle className="h-3 w-3" /> 已通过
        </span>
      )
    }
    if (status === ApplicationStatus.REJECTED) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="h-3 w-3" /> 已拒绝
        </span>
      )
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>
  }

  const MobileCard = ({ app }: { app: Application }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-1">{app.applicationNo}</p>
          <h3 className="font-semibold text-gray-900">{app.title}</h3>
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
            <span className="font-medium">{formatAmount(app.amount)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">优先级:</span>
          {renderPriorityBadge(app.priority)}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl"
        onClick={() => navigate(`/applications/${app.id}`)}
      >
        <Eye className="h-4 w-4 mr-1" /> 查看详情
      </Button>
    </div>
  )

  const totalPages = Math.ceil(total / pageSize)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">请先登录</h3>
          <p className="text-gray-500">登录后查看审批记录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">已审批记录</h1>
        <p className="text-sm text-gray-500 mt-1">共 <span className="font-semibold text-coral">{total}</span> 条审批记录</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="审核总金额"
          amount={stats.totalAmount}
          count={stats.totalCount}
          icon={<Wallet className="h-6 w-6" />}
          variant="blue"
        />
        <StatCard
          title="通过金额"
          amount={stats.approvedAmount}
          count={stats.approvedCount}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="green"
        />
        <StatCard
          title="拒绝金额"
          amount={stats.rejectedAmount}
          count={stats.rejectedCount}
          icon={<TrendingDown className="h-6 w-6" />}
          variant="red"
        />
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索申请编号、标题或申请人..."
                className="pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
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
              <SelectTrigger className="rounded-xl border-gray-200">
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
              <SelectTrigger className="rounded-xl border-gray-200">
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
      </div>

      {/* 列表内容 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-coral mb-3" />
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无审批记录</h3>
          <p className="text-gray-500">没有找到符合条件的审批记录</p>
        </div>
      ) : (
        <>
          {/* 移动端卡片视图 */}
          <div className="md:hidden">
            {applications.map((app) => <MobileCard key={app.id} app={app} />)}
          </div>

          {/* PC端表格视图 */}
          <div className="hidden md:block">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-semibold">申请编号</TableHead>
                    <TableHead className="font-semibold">标题</TableHead>
                    <TableHead className="font-semibold">申请人</TableHead>
                    <TableHead className="font-semibold">部门</TableHead>
                    <TableHead className="font-semibold">金额</TableHead>
                    <TableHead className="font-semibold">优先级</TableHead>
                    <TableHead className="font-semibold">状态</TableHead>
                    <TableHead className="font-semibold">完成时间</TableHead>
                    <TableHead className="text-right font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">{app.applicationNo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{app.title}</TableCell>
                      <TableCell>{app.submitterName}</TableCell>
                      <TableCell>{app.submitterDepartment}</TableCell>
                      <TableCell className="font-medium">{formatAmount(app.amount)}</TableCell>
                      <TableCell>{renderPriorityBadge(app.priority)}</TableCell>
                      <TableCell>{renderStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-gray-500">{formatDate(app.completedAt || app.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg hover:bg-gray-100"
                          onClick={() => navigate(`/applications/${app.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border-gray-200"
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600 px-4">
                第 {page} 页 / 共 {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border-gray-200"
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
