import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Application,
  ApplicationStatus,
  UserRole,
  ApprovalAction,
  ApproveApplicationRequest,
  User,
  Attachment,
  ApprovalRecord,
} from "@/types"
import { formatDate, formatAmount, formatFileSize } from "@/lib/utils"
import {
  ArrowLeft,
  User as UserIcon,
  DollarSign,
  Flag,
  Calendar,
  Paperclip,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react"

// 模拟数据
const mockUsers: User[] = [
  { id: "1", username: "factory1", employeeId: "F001", name: "张厂长", role: "FACTORY_MANAGER" as const, department: "一厂", email: "factory1@example.com", canSubmitApplication: false },
  { id: "2", username: "manager1", employeeId: "M001", name: "李经理", role: "MANAGER" as const, department: "生产部", email: "manager1@example.com", canSubmitApplication: false },
  { id: "3", username: "ceo1", employeeId: "C001", name: "王总", role: "CEO" as const, department: "总裁办", email: "ceo1@example.com", canSubmitApplication: false },
]

const mockApplication: Application = {
  id: "1",
  applicationNo: "APP2024001",
  title: "设备采购申请",
  content: "需要采购5台新的生产设备，用于提升产能。\n\n具体需求：\n1. 设备型号：XYZ-1000\n2. 数量：5台\n3. 预算：每台10万元\n4. 用途：生产线升级\n\n请审批。",
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
  attachments: [
    {
      id: "1",
      filename: "equipment_quote.pdf",
      originalName: "设备报价单.pdf",
      mimeType: "application/pdf",
      size: 1024000,
      path: "/uploads/equipment_quote.pdf",
      uploadedAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "2",
      filename: "requirement_doc.docx",
      originalName: "需求说明.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 512000,
      path: "/uploads/requirement_doc.docx",
      uploadedAt: "2024-01-15T10:00:00Z",
    },
  ],
  approvals: [],
}

// 模拟审批历史
const mockApprovalHistory: ApprovalRecord[] = [
  {
    id: "1",
    applicationId: "1",
    approverId: "1",
    approverName: "张厂长",
    approverRole: "厂长",
    action: "APPROVE" as const,
    comment: "同意采购，请继续审批。",
    createdAt: "2024-01-15T14:00:00Z",
  },
]

// 状态映射配置
const statusConfig: Record<ApplicationStatus, { label: string; variant: "yellow" | "blue" | "purple" | "orange" | "green" | "red" | "gray" }> = {
  [ApplicationStatus.DRAFT]: { label: "草稿", variant: "gray" },
  [ApplicationStatus.PENDING_FACTORY]: { label: "待厂长审核", variant: "yellow" },
  [ApplicationStatus.PENDING_DIRECTOR]: { label: "待总监审批", variant: "blue" },
  [ApplicationStatus.PENDING_MANAGER]: { label: "待经理审批", variant: "purple" },
  [ApplicationStatus.PENDING_CEO]: { label: "待CEO审批", variant: "orange" },
  [ApplicationStatus.APPROVED]: { label: "已通过", variant: "green" },
  [ApplicationStatus.REJECTED]: { label: "已拒绝", variant: "red" },
  [ApplicationStatus.ARCHIVED]: { label: "已归档", variant: "gray" },
}

// 优先级映射配置
const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "低", color: "text-gray-500" },
  NORMAL: { label: "普通", color: "text-blue-500" },
  HIGH: { label: "高", color: "text-orange-500" },
  URGENT: { label: "紧急", color: "text-red-500" },
}

// 当前用户角色（模拟）
const currentUserRole: UserRole = UserRole.FACTORY_MANAGER
const currentUserId = "1"

export const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [application, setApplication] = React.useState<Application>(mockApplication)
  const [loading, setLoading] = React.useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [comment, setComment] = React.useState("")
  const [actionLoading, setActionLoading] = React.useState(false)

  // 检查当前用户是否可以审批
  const canApprove = React.useMemo(() => {
    if (application.status === ApplicationStatus.APPROVED ||
        application.status === ApplicationStatus.REJECTED) {
      return false
    }

    // 检查当前用户是否是当前审批人
    if (application.currentApproverId !== currentUserId) {
      return false
    }

    // 检查用户角色是否匹配当前状态
    switch (application.status) {
      case ApplicationStatus.PENDING_FACTORY:
        return currentUserRole === UserRole.FACTORY_MANAGER
      case ApplicationStatus.PENDING_DIRECTOR:
        return currentUserRole === UserRole.DIRECTOR
      case ApplicationStatus.PENDING_MANAGER:
        return currentUserRole === UserRole.MANAGER
      case ApplicationStatus.PENDING_CEO:
        return currentUserRole === UserRole.CEO
      default:
        return false
    }
  }, [application, currentUserRole])

  const status = statusConfig[application.status]
  const priority = priorityConfig[application.priority]

  const handleApprove = async () => {
    setActionLoading(true)
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 更新状态（模拟）
    const newStatus = getNextStatus(application.status)
    setApplication((prev) => ({
      ...prev,
      status: newStatus,
      currentApproverId: newStatus === ApplicationStatus.APPROVED ? null : getNextApproverId(newStatus),
    }))

    setApprovalDialogOpen(false)
    setComment("")
    setActionLoading(false)
  }

  const handleReject = async () => {
    setActionLoading(true)
    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setApplication((prev) => ({
      ...prev,
      status: ApplicationStatus.REJECTED,
      currentApproverId: null,
      completedAt: new Date().toISOString(),
    }))

    setRejectDialogOpen(false)
    setComment("")
    setActionLoading(false)
  }

  const getNextStatus = (currentStatus: ApplicationStatus): ApplicationStatus => {
    switch (currentStatus) {
      case ApplicationStatus.PENDING_FACTORY:
        return ApplicationStatus.PENDING_DIRECTOR
      case ApplicationStatus.PENDING_DIRECTOR:
        return ApplicationStatus.PENDING_MANAGER
      case ApplicationStatus.PENDING_MANAGER:
        return ApplicationStatus.PENDING_CEO
      case ApplicationStatus.PENDING_CEO:
        return ApplicationStatus.APPROVED
      default:
        return currentStatus
    }
  }

  const getNextApproverId = (status: ApplicationStatus): string | null => {
    switch (status) {
      case ApplicationStatus.PENDING_FACTORY:
        return application.factoryManagerIds[0] || null
      case ApplicationStatus.PENDING_DIRECTOR:
        return "director1"
      case ApplicationStatus.PENDING_MANAGER:
        return application.managerIds[0] || null
      case ApplicationStatus.PENDING_CEO:
        return "ceo1"
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate("/applications")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </button>

          {/* 申请信息卡片 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{application.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{application.applicationNo}</p>
              </div>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">申请人</p>
                    <p className="text-sm font-medium">{application.submitterName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">金额</p>
                    <p className="text-sm font-medium">{formatAmount(application.amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className={`h-4 w-4 ${priority.color}`} />
                  <div>
                    <p className="text-xs text-gray-500">优先级</p>
                    <p className={`text-sm font-medium ${priority.color}`}>{priority.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">提交时间</p>
                    <p className="text-sm font-medium">{formatDate(application.submittedAt || application.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">申请内容</h3>
                <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                  {application.content}
                </div>
              </div>
            </div>
          </div>

          {/* 附件列表 */}
          {application.attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  附件 ({application.attachments.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {application.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.originalName}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 审批历史 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                审批历史
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {mockApprovalHistory.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  暂无审批记录
                </div>
              ) : (
                mockApprovalHistory.map((record) => (
                  <div key={record.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          record.action === "APPROVE" ? "bg-green-100" : "bg-red-100"
                        }`}>
                          {record.action === "APPROVE" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.approverName}
                            <span className="text-gray-500 font-normal ml-1">({record.approverRole})</span>
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(record.createdAt)}</p>
                        </div>
                      </div>
                      <Badge variant={record.action === "APPROVE" ? "green" : "red"}>
                        {record.action === "APPROVE" ? "通过" : "拒绝"}
                      </Badge>
                    </div>
                    {record.comment && (
                      <p className="mt-2 text-sm text-gray-600 ml-11">{record.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 审批操作按钮 */}
          {canApprove && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                拒绝
              </Button>
              <Button
                className="flex-1"
                onClick={() => setApprovalDialogOpen(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                通过
              </Button>
            </div>
          )}
        </div>

        {/* 通过对话框 */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认通过</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-gray-600 mb-4">
                您确定要通过申请 "{application.title}" 吗？
              </p>
              <Textarea
                label="审批意见（可选）"
                placeholder="请输入审批意见..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)} disabled={actionLoading}>
                取消
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? "处理中..." : "确认通过"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 拒绝对话框 */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认拒绝</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-gray-600 mb-4">
                您确定要拒绝申请 "{application.title}" 吗？
              </p>
              <Textarea
                label="拒绝原因"
                placeholder="请输入拒绝原因..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                required
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? "处理中..." : "确认拒绝"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
