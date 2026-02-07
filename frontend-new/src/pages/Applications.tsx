import * as React from "react"
import { Sidebar } from "@/components/Sidebar"
import { ApplicationCard } from "@/components/ApplicationCard"
import { ApplicationForm } from "@/components/ApplicationForm"
import { Button } from "@/components/ui/button"
import { NativeSelect as Select, SelectOption } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Search, Download, DollarSign, Clock, CheckCircle, Loader2 } from "lucide-react"

// 状态选项
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

// 金额统计卡片组件
interface StatCardProps {
  title: string
  amount: number
  currency: Currency
  icon: React.ReactNode
  variant: "blue" | "yellow" | "green" | "red"
}

const StatCard: React.FC<StatCardProps> = ({ title, amount, currency, icon, variant }) => {
  const variantStyles = {
    blue: "bg-blue-50 border-blue-200",
    yellow: "bg-yellow-50 border-yellow-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
  }

  const iconStyles = {
    blue: "text-blue-600",
    yellow: "text-yellow-600",
    green: "text-green-600",
    red: "text-red-600",
  }

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`${iconStyles[variant]}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {currency === Currency.USD ? "$" : "¥"}{amount.toLocaleString()}
        </div>
        <p className="text-xs text-gray-500 mt-1">{currency === Currency.USD ? "美元" : "人民币"}</p>
      </CardContent>
    </Card>
  )
}

export const Applications: React.FC = () => {
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<ApplicationFilter>({
    status: undefined,
    keyword: "",
  })
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [factoryManagers, setFactoryManagers] = React.useState<User[]>([])
  const [managers, setManagers] = React.useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(false)

  // 统计数据
  const [stats, setStats] = React.useState({
    totalRMB: 0,
    totalUSD: 0,
    pendingRMB: 0,
    pendingUSD: 0,
    approvedRMB: 0,
    approvedUSD: 0,
  })

  // 获取申请列表
  const fetchApplications = React.useCallback(async () => {
    setLoading(true)
    try {
      const params: GetApplicationsParams = {
        page,
        pageSize,
        status: filter.status,
        keyword: filter.keyword || undefined,
      }
      const response = await applicationsApi.getApplications(params)
      setApplications(response.data.items)
      setTotal(response.data.total)
      setTotalPages(response.data.totalPages)

      // 计算统计数据
      calculateStats(response.data.items)
    } catch (error) {
      console.error("获取申请列表失败:", error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filter.status, filter.keyword])

  // 计算统计数据
  const calculateStats = (items: Application[]) => {
    let totalRMB = 0, totalUSD = 0
    let pendingRMB = 0, pendingUSD = 0
    let approvedRMB = 0, approvedUSD = 0

    items.forEach((app) => {
      if (app.amount && app.amount > 0) {
        const amount = app.amount
        if (app.currency === Currency.USD) {
          totalUSD += amount
          if (app.status === ApplicationStatus.PENDING_FACTORY ||
              app.status === ApplicationStatus.PENDING_DIRECTOR ||
              app.status === ApplicationStatus.PENDING_MANAGER ||
              app.status === ApplicationStatus.PENDING_CEO) {
            pendingUSD += amount
          } else if (app.status === ApplicationStatus.APPROVED) {
            approvedUSD += amount
          }
        } else {
          totalRMB += amount
          if (app.status === ApplicationStatus.PENDING_FACTORY ||
              app.status === ApplicationStatus.PENDING_DIRECTOR ||
              app.status === ApplicationStatus.PENDING_MANAGER ||
              app.status === ApplicationStatus.PENDING_CEO) {
            pendingRMB += amount
          } else if (app.status === ApplicationStatus.APPROVED) {
            approvedRMB += amount
          }
        }
      }
    })

    setStats({ totalRMB, totalUSD, pendingRMB, pendingUSD, approvedRMB, approvedUSD })
  }

  // 获取审批人列表
  const fetchApprovers = React.useCallback(async () => {
    setLoadingUsers(true)
    try {
      const [factoryResponse, managerResponse] = await Promise.all([
        usersApi.getFactoryManagers(),
        usersApi.getManagers(),
      ])
      setFactoryManagers(factoryResponse.data)
      setManagers(managerResponse.data)
    } catch (error) {
      console.error("获取审批人列表失败:", error)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  React.useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  React.useEffect(() => {
    if (isCreateDialogOpen) {
      fetchApprovers()
    }
  }, [isCreateDialogOpen, fetchApprovers])

  // 创建申请
  const handleCreateApplication = async (data: CreateApplicationRequest) => {
    setSubmitting(true)
    try {
      await applicationsApi.createApplication(data)
      setIsCreateDialogOpen(false)
      fetchApplications() // 刷新列表
    } catch (error) {
      console.error("创建申请失败:", error)
    } finally {
      setSubmitting(false)
    }
  }

  // Excel导出
  const handleExportExcel = () => {
    const headers = ["申请编号", "标题", "申请人", "部门", "金额", "货币", "优先级", "状态", "提交时间"]
    const rows = applications.map((app) => [
      app.applicationNo,
      app.title,
      app.submitterName,
      app.submitterDepartment,
      app.amount || "",
      app.currency === Currency.USD ? "USD" : "CNY",
      app.priority,
      getStatusLabel(app.status),
      app.submittedAt ? new Date(app.submittedAt).toLocaleString("zh-CN") : "",
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `申请列表_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const getStatusLabel = (status: ApplicationStatus): string => {
    const map: Record<ApplicationStatus, string> = {
      [ApplicationStatus.DRAFT]: "草稿",
      [ApplicationStatus.PENDING_FACTORY]: "待厂长审核",
      [ApplicationStatus.PENDING_DIRECTOR]: "待总监审批",
      [ApplicationStatus.PENDING_MANAGER]: "待经理审批",
      [ApplicationStatus.PENDING_CEO]: "待CEO审批",
      [ApplicationStatus.APPROVED]: "已通过",
      [ApplicationStatus.REJECTED]: "已拒绝",
      [ApplicationStatus.ARCHIVED]: "已归档",
    }
    return map[status] || status
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">申请管理</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportExcel} disabled={applications.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建申请
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="总申请金额 (人民币)"
            amount={stats.totalRMB}
            currency={Currency.CNY}
            icon={<DollarSign className="h-5 w-5" />}
            variant="blue"
          />
          <StatCard
            title="总申请金额 (美元)"
            amount={stats.totalUSD}
            currency={Currency.USD}
            icon={<DollarSign className="h-5 w-5" />}
            variant="blue"
          />
          <StatCard
            title="待审核金额 (人民币)"
            amount={stats.pendingRMB}
            currency={Currency.CNY}
            icon={<Clock className="h-5 w-5" />}
            variant="yellow"
          />
          <StatCard
            title="待审核金额 (美元)"
            amount={stats.pendingUSD}
            currency={Currency.USD}
            icon={<Clock className="h-5 w-5" />}
            variant="yellow"
          />
          <StatCard
            title="已通过金额 (人民币)"
            amount={stats.approvedRMB}
            currency={Currency.CNY}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="green"
          />
          <StatCard
            title="已通过金额 (美元)"
            amount={stats.approvedUSD}
            currency={Currency.USD}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="green"
          />
        </div>

        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索申请编号、标题或申请人..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={filter.keyword || ""}
                  onChange={(e) => {
                    setFilter((prev) => ({ ...prev, keyword: e.target.value }))
                    setPage(1)
                  }}
                />
              </div>
            </div>
            <div className="w-48">
              <Select
                options={statusOptions}
                value={filter.status || ""}
                onChange={(e) => {
                  setFilter((prev) => ({
                    ...prev,
                    status: e.target.value ? (e.target.value as ApplicationStatus) : undefined,
                  }))
                  setPage(1)
                }}
              />
            </div>
          </div>
        </div>

        {/* 申请列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="inline-block animate-spin h-8 w-8 text-primary" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">暂无申请记录</p>
            </div>
          ) : (
            applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-600">
              第 {page} 页 / 共 {totalPages} 页 (共 {total} 条)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              下一页
            </Button>
          </div>
        )}
      </main>

      {/* 新建申请对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建申请</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {loadingUsers ? (
              <div className="text-center py-8">
                <Loader2 className="inline-block animate-spin h-6 w-6 text-primary" />
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
