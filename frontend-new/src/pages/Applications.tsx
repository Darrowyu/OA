import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ApplicationCard } from "@/components/ApplicationCard"
import { ApplicationForm } from "@/components/ApplicationForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectOption } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import {
  Application,
  ApplicationStatus,
  ApplicationFilter,
  CreateApplicationRequest,
  PaginatedResponse,
  User,
} from "@/types"
import { Plus, Search } from "lucide-react"

// 模拟数据
const mockUsers: User[] = [
  { id: "1", username: "factory1", employeeId: "F001", name: "张厂长", role: "FACTORY_MANAGER" as const, department: "一厂", email: "factory1@example.com", canSubmitApplication: false },
  { id: "2", username: "manager1", employeeId: "M001", name: "李经理", role: "MANAGER" as const, department: "生产部", email: "manager1@example.com", canSubmitApplication: false },
  { id: "3", username: "ceo1", employeeId: "C001", name: "王总", role: "CEO" as const, department: "总裁办", email: "ceo1@example.com", canSubmitApplication: false },
]

const mockApplications: Application[] = [
  {
    id: "1",
    applicationNo: "APP2024001",
    title: "设备采购申请",
    content: "需要采购5台新的生产设备，用于提升产能",
    amount: 50000,
    priority: "HIGH" as const,
    status: "PENDING_FACTORY" as const,
    submitterId: "user1",
    submitterName: "张三",
    submitterDepartment: "生产部",
    factoryManagerIds: ["1"],
    managerIds: ["2"],
    skipManager: false,
    currentApproverId: "1",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    submittedAt: "2024-01-15T10:00:00Z",
    completedAt: null,
    attachments: [],
    approvals: [],
  },
  {
    id: "2",
    applicationNo: "APP2024002",
    title: "培训费用申请",
    content: "部门员工参加外部培训的费用申请",
    amount: 8000,
    priority: "NORMAL" as const,
    status: "APPROVED" as const,
    submitterId: "user2",
    submitterName: "李四",
    submitterDepartment: "人事部",
    factoryManagerIds: ["1"],
    managerIds: ["2"],
    skipManager: false,
    currentApproverId: null,
    createdAt: "2024-01-14T09:00:00Z",
    updatedAt: "2024-01-16T14:00:00Z",
    submittedAt: "2024-01-14T09:00:00Z",
    completedAt: "2024-01-16T14:00:00Z",
    attachments: [],
    approvals: [],
  },
  {
    id: "3",
    applicationNo: "APP2024003",
    title: "办公用品采购",
    content: "采购办公桌椅和电脑",
    amount: 15000,
    priority: "LOW" as const,
    status: "REJECTED" as const,
    submitterId: "user3",
    submitterName: "王五",
    submitterDepartment: "行政部",
    factoryManagerIds: ["1"],
    managerIds: ["2"],
    skipManager: false,
    currentApproverId: null,
    createdAt: "2024-01-13T08:00:00Z",
    updatedAt: "2024-01-14T16:00:00Z",
    submittedAt: "2024-01-13T08:00:00Z",
    completedAt: "2024-01-14T16:00:00Z",
    attachments: [],
    approvals: [],
  },
]

const statusOptions: SelectOption[] = [
  { value: "", label: "全部状态" },
  { value: ApplicationStatus.PENDING_FACTORY, label: "待厂长审核" },
  { value: ApplicationStatus.PENDING_DIRECTOR, label: "待总监审批" },
  { value: ApplicationStatus.PENDING_MANAGER, label: "待经理审批" },
  { value: ApplicationStatus.PENDING_CEO, label: "待CEO审批" },
  { value: ApplicationStatus.APPROVED, label: "已通过" },
  { value: ApplicationStatus.REJECTED, label: "已拒绝" },
]

export const Applications: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = React.useState<Application[]>(mockApplications)
  const [loading, setLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<ApplicationFilter>({
    status: undefined,
    keyword: "",
  })
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(10)
  const [total, setTotal] = React.useState(mockApplications.length)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  // 筛选申请
  const filteredApplications = React.useMemo(() => {
    return applications.filter((app) => {
      const matchStatus = !filter.status || app.status === filter.status
      const matchKeyword =
        !filter.keyword ||
        app.title.toLowerCase().includes(filter.keyword.toLowerCase()) ||
        app.applicationNo.toLowerCase().includes(filter.keyword.toLowerCase()) ||
        app.submitterName.toLowerCase().includes(filter.keyword.toLowerCase())
      return matchStatus && matchKeyword
    })
  }, [applications, filter])

  // 分页数据
  const paginatedApplications = React.useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredApplications.slice(start, start + pageSize)
  }, [filteredApplications, page, pageSize])

  const totalPages = Math.ceil(filteredApplications.length / pageSize)

  const handleCreateApplication = async (data: CreateApplicationRequest) => {
    setSubmitting(true)
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const newApplication: Application = {
      id: String(Date.now()),
      applicationNo: `APP${Date.now()}`,
      title: data.title,
      content: data.content,
      amount: data.amount || null,
      priority: data.priority,
      status: ApplicationStatus.PENDING_FACTORY,
      submitterId: "currentUser",
      submitterName: "当前用户",
      submitterDepartment: "技术部",
      factoryManagerIds: data.factoryManagerIds,
      managerIds: data.managerIds,
      skipManager: data.skipManager,
      currentApproverId: data.factoryManagerIds[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      completedAt: null,
      attachments: [],
      approvals: [],
    }

    setApplications((prev) => [newApplication, ...prev])
    setTotal((prev) => prev + 1)
    setIsCreateDialogOpen(false)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">申请管理</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建申请
          </Button>
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
                  onChange={(e) => setFilter((prev) => ({ ...prev, keyword: e.target.value }))}
                />
              </div>
            </div>
            <div className="w-48">
              <Select
                options={statusOptions}
                value={filter.status || ""}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    status: e.target.value ? (e.target.value as ApplicationStatus) : undefined,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* 申请列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">暂无申请记录</p>
            </div>
          ) : (
            paginatedApplications.map((application) => (
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
      </div>

      {/* 新建申请对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建申请</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ApplicationForm
              users={mockUsers}
              onSubmit={handleCreateApplication}
              onCancel={() => setIsCreateDialogOpen(false)}
              loading={submitting}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
