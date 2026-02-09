import * as React from "react"
import { ApplicationCard } from "@/components/ApplicationCard"
import { ApplicationForm } from "@/components/ApplicationForm"
import { Button } from "@/components/ui/button"
import { NativeSelect as Select, SelectOption } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"
import {
  Application,
  ApplicationStatus,
  ApplicationFilter,
  CreateApplicationRequest,
  User,
  Currency,
} from "@/types"
import { applicationsApi, GetApplicationsParams } from "@/services/applications"
import { usersApi } from "@/services/users"
import { getStatusLabel } from "@/config/status"
import {
  Plus,
  Search,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  FileText,
  RotateCw,
  Calendar,
} from "lucide-react"

const statusOptions: SelectOption[] = [
  { value: "", label: "全部状态" },
  { value: ApplicationStatus.PENDING_FACTORY, label: "待厂长审核" },
  { value: ApplicationStatus.PENDING_DIRECTOR, label: "待总监审批" },
  { value: ApplicationStatus.PENDING_MANAGER, label: "待经理审批" },
  { value: ApplicationStatus.PENDING_CEO, label: "待CEO审批" },
  { value: ApplicationStatus.APPROVED, label: "已通过" },
  { value: ApplicationStatus.REJECTED, label: "已拒绝" },
  { value: ApplicationStatus.DRAFT, label: "草稿" },
]

// 分类统计进度条组件
interface CategoryStatProps {
  label: string
  value: number
  total: number
  color: string
}

function CategoryStat({ label, value, total, color }: CategoryStatProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-semibold text-gray-900">¥{value.toLocaleString()} ({percentage}%)</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// 内联统计卡片组件
interface InlineStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
    label: string
  }
  variant: "coral" | "blue" | "green" | "amber"
}

function InlineStatCard({ title, value, subtitle, icon, trend, variant }: InlineStatCardProps) {
  const iconStyles = {
    coral: "bg-gray-900 text-white",
    blue: "bg-blue-500 text-white",
    green: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-white",
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
              </div>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconStyles[variant]} transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function ApplicationList() {
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<ApplicationFilter>({ status: undefined, keyword: "" })
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [factoryManagers, setFactoryManagers] = React.useState<User[]>([])
  const [managers, setManagers] = React.useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(false)
  const [stats, setStats] = React.useState({
    totalRMB: 0,
    totalUSD: 0,
    pendingRMB: 0,
    pendingUSD: 0,
    approvedRMB: 0,
    approvedUSD: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
  })
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date())

  const fetchApplications = React.useCallback(async () => {
    setLoading(true)
    try {
      const params: GetApplicationsParams = { page, pageSize, status: filter.status, keyword: filter.keyword || undefined }
      const response = await applicationsApi.getApplications(params)
      setApplications(response.data.items)
      setTotal(response.data.pagination.total)
      setTotalPages(response.data.pagination.totalPages)
      calculateStats(response.data.items)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("获取申请列表失败:", error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filter.status, filter.keyword])

  const calculateStats = (items: Application[]) => {
    let totalRMB = 0, totalUSD = 0, pendingRMB = 0, pendingUSD = 0, approvedRMB = 0, approvedUSD = 0
    let pendingCount = 0, approvedCount = 0

    items.forEach((app) => {
      if (app.amount && app.amount > 0) {
        const amount = app.amount
        if (app.currency === Currency.USD) {
          totalUSD += amount
          if ([ApplicationStatus.PENDING_FACTORY, ApplicationStatus.PENDING_DIRECTOR, ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO].includes(app.status)) {
            pendingUSD += amount
            pendingCount++
          } else if (app.status === ApplicationStatus.APPROVED) {
            approvedUSD += amount
            approvedCount++
          }
        } else {
          totalRMB += amount
          if ([ApplicationStatus.PENDING_FACTORY, ApplicationStatus.PENDING_DIRECTOR, ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO].includes(app.status)) {
            pendingRMB += amount
            pendingCount++
          } else if (app.status === ApplicationStatus.APPROVED) {
            approvedRMB += amount
            approvedCount++
          }
        }
      }
    })

    setStats({
      totalRMB,
      totalUSD,
      pendingRMB,
      pendingUSD,
      approvedRMB,
      approvedUSD,
      totalCount: items.length,
      pendingCount,
      approvedCount,
    })
  }

  const fetchApprovers = React.useCallback(async () => {
    setLoadingUsers(true)
    try {
      const [factoryResponse, managerResponse] = await Promise.all([
        usersApi.getFactoryManagers(),
        usersApi.getManagers(),
      ])
      setFactoryManagers(factoryResponse.data || [])
      setManagers(managerResponse.data || [])
    } catch (error) {
      console.error("获取审批人列表失败:", error)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  React.useEffect(() => { fetchApplications() }, [fetchApplications])
  React.useEffect(() => { if (isCreateDialogOpen) fetchApprovers() }, [isCreateDialogOpen, fetchApprovers])

  const handleCreateApplication = async (data: CreateApplicationRequest) => {
    setSubmitting(true)
    try {
      await applicationsApi.createApplication(data)
      setIsCreateDialogOpen(false)
      fetchApplications()
    } catch (error) {
      console.error("创建申请失败:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportExcel = () => {
    const headers = ["申请编号", "标题", "申请人", "部门", "金额", "货币", "优先级", "状态", "提交时间"]
    const rows = applications.map((app) => [
      app.applicationNo, app.title, app.submitterName, app.submitterDepartment, app.amount || "",
      app.currency === Currency.USD ? "USD" : "CNY", app.priority, getStatusLabel(app.status),
      app.submittedAt ? new Date(app.submittedAt).toLocaleString("zh-CN") : "",
    ])
    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `申请列表_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* 页面标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申请管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理和追踪所有费用申请</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>最后更新: {formatDate(lastUpdated)}</span>
            <button
              onClick={fetchApplications}
              className="ml-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={applications.length === 0}
            className="rounded-lg border-gray-200 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            导出Excel
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            新建申请
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <InlineStatCard
          title="总申请金额"
          value={`¥${(stats.totalRMB + stats.totalUSD * 7).toLocaleString()}`}
          subtitle="人民币等值"
          icon={<DollarSign className="h-6 w-6" />}
          trend={{ value: 12.5, isPositive: true, label: "vs 上月" }}
          variant="coral"
        />
        <InlineStatCard
          title="本月增长率"
          value="+8.3%"
          subtitle="较上月同期"
          icon={<TrendingUp className="h-6 w-6" />}
          trend={{ value: 2.1, isPositive: true, label: "vs 去年同期" }}
          variant="blue"
        />
        <InlineStatCard
          title="待审核申请"
          value={stats.pendingCount}
          subtitle={`¥${stats.pendingRMB.toLocaleString()}`}
          icon={<Clock className="h-6 w-6" />}
          trend={{ value: 5.2, isPositive: false, label: "vs 上周" }}
          variant="amber"
        />
        <InlineStatCard
          title="已通过申请"
          value={stats.approvedCount}
          subtitle={`¥${stats.approvedRMB.toLocaleString()}`}
          icon={<CheckCircle className="h-6 w-6" />}
          trend={{ value: 18.7, isPositive: true, label: "vs 上月" }}
          variant="green"
        />
        <InlineStatCard
          title="总申请数"
          value={stats.totalCount}
          subtitle="本月累计"
          icon={<FileText className="h-6 w-6" />}
          trend={{ value: 8.1, isPositive: true, label: "vs 上月" }}
          variant="coral"
        />
      </div>

      {/* 内容区域 - 两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 筛选栏 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[240px]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索申请编号、标题或申请人..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-sm"
                    value={filter.keyword || ""}
                    onChange={(e) => { setFilter((prev) => ({ ...prev, keyword: e.target.value })); setPage(1) }}
                  />
                </div>
              </div>
              <div className="w-44">
                <Select
                  options={statusOptions}
                  value={filter.status || ""}
                  onChange={(e) => { setFilter((prev) => ({ ...prev, status: e.target.value ? (e.target.value as ApplicationStatus) : undefined })); setPage(1) }}
                />
              </div>
            </div>
          </div>

          {/* 申请列表 */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
                <Loader2 className="animate-spin h-8 w-8 text-gray-900 mb-3" />
                <p className="text-gray-500">加载中...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">暂无申请记录</p>
                <p className="text-sm text-gray-400 mt-1">点击右上角按钮创建新申请</p>
              </div>
            ) : (
              applications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))
            )}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="rounded-lg border-gray-200"
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600 px-4">
                第 {page} 页 / 共 {totalPages} 页 (共 {total} 条)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="rounded-lg border-gray-200"
              >
                下一页
              </Button>
            </div>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 金额分类统计 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">金额分布</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">更多</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-900">
                ¥{(stats.totalRMB + stats.totalUSD * 7).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-medium">+15%</span>
                <span className="text-sm text-gray-400">vs 上月</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-gradient-to-r from-gray-900 to-gray-600 rounded-full" style={{ width: "65%" }} />
            </div>
            <div className="space-y-1">
              <CategoryStat
                label="已通过金额"
                value={stats.approvedRMB}
                total={stats.totalRMB || 1}
                color="bg-emerald-500"
              />
              <CategoryStat
                label="待审核金额"
                value={stats.pendingRMB}
                total={stats.totalRMB || 1}
                color="bg-amber-500"
              />
              <CategoryStat
                label="美元金额"
                value={stats.totalUSD * 7}
                total={(stats.totalRMB + stats.totalUSD * 7) || 1}
                color="bg-blue-500"
              />
            </div>
          </div>

          {/* 快速统计 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">待处理</p>
                    <p className="text-xs text-gray-400">需要您审批</p>
                  </div>
                </div>
                <span className="text-base font-bold text-gray-900">{stats.pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">已通过</p>
                    <p className="text-xs text-gray-400">本月审批通过</p>
                  </div>
                </div>
                <span className="text-base font-bold text-emerald-600">{stats.approvedCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">总申请</p>
                    <p className="text-xs text-gray-400">本月累计</p>
                  </div>
                </div>
                <span className="text-base font-bold text-blue-600">{stats.totalCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 新建申请对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">新建申请</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {loadingUsers ? (
              <div className="text-center py-8">
                <Loader2 className="inline-block animate-spin h-6 w-6 text-gray-900" />
                <p className="mt-2 text-gray-500">加载中...</p>
              </div>
            ) : (
              <ApplicationForm
                factoryManagers={factoryManagers}
                managers={managers}
                onSubmit={handleCreateApplication}
                onCancel={() => setIsCreateDialogOpen(false)}
                loading={submitting}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
