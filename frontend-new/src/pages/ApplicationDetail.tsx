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
  ApprovalRecord,
  Currency,
} from "@/types"
import { applicationsApi } from "@/services/applications"
import { approvalsApi } from "@/services/approvals"
import { uploadsApi } from "@/services/uploads"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate, formatFileSize } from "@/lib/utils"
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
  Loader2,
  AlertCircle,
} from "lucide-react"

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

export const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [application, setApplication] = React.useState<Application | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [approvalHistory, setApprovalHistory] = React.useState<ApprovalRecord[]>([])
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [comment, setComment] = React.useState("")
  const [actionLoading, setActionLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // 获取申请详情
  const fetchApplication = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await applicationsApi.getApplication(id)
      setApplication(response.data)
    } catch (err) {
      setError("获取申请详情失败")
      console.error("获取申请详情失败:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  // 获取审批历史
  const fetchApprovalHistory = React.useCallback(async () => {
    if (!id) return
    setLoadingHistory(true)
    try {
      const response = await approvalsApi.getApprovalHistory(id)
      setApprovalHistory(response.data)
    } catch (err) {
      console.error("获取审批历史失败:", err)
    } finally {
      setLoadingHistory(false)
    }
  }, [id])

  React.useEffect(() => {
    fetchApplication()
    fetchApprovalHistory()
  }, [fetchApplication, fetchApprovalHistory])

  // 检查当前用户是否可以审批
  const canApprove = React.useMemo(() => {
    if (!application || !user) return false
    if (application.status === ApplicationStatus.APPROVED ||
        application.status === ApplicationStatus.REJECTED ||
        application.status === ApplicationStatus.DRAFT) {
      return false
    }

    // 检查当前用户是否是当前审批人
    if (application.currentApproverId !== user.id) {
      return false
    }

    // 检查用户角色是否匹配当前状态
    switch (application.status) {
      case ApplicationStatus.PENDING_FACTORY:
        return user.role === UserRole.FACTORY_MANAGER
      case ApplicationStatus.PENDING_DIRECTOR:
        return user.role === UserRole.DIRECTOR
      case ApplicationStatus.PENDING_MANAGER:
        return user.role === UserRole.MANAGER
      case ApplicationStatus.PENDING_CEO:
        return user.role === UserRole.CEO
      default:
        return false
    }
  }, [application, user])

  const handleApprove = async () => {
    if (!id || !application) return
    setActionLoading(true)
    try {

      const request = {
        action: "APPROVE" as const,
        comment: comment || undefined,
      }

      // 根据当前状态调用不同的审批API
      switch (application.status) {
        case ApplicationStatus.PENDING_FACTORY:
          await approvalsApi.factoryApprove(id, request)
          break
        case ApplicationStatus.PENDING_DIRECTOR:
          await approvalsApi.directorApprove(id, request)
          break
        case ApplicationStatus.PENDING_MANAGER:
          await approvalsApi.managerApprove(id, request)
          break
        case ApplicationStatus.PENDING_CEO:
          await approvalsApi.ceoApprove(id, request)
          break
      }

      setApprovalDialogOpen(false)
      setComment("")
      // 刷新数据
      await Promise.all([fetchApplication(), fetchApprovalHistory()])
    } catch (err) {
      console.error("审批失败:", err)
      setError("审批操作失败，请重试")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!id || !application) return
    setActionLoading(true)
    try {
      const request = {
        action: "REJECT" as const,
        comment: comment || undefined,
      }

      // 根据当前状态调用不同的审批API
      switch (application.status) {
        case ApplicationStatus.PENDING_FACTORY:
          await approvalsApi.factoryApprove(id, request)
          break
        case ApplicationStatus.PENDING_DIRECTOR:
          await approvalsApi.directorApprove(id, request)
          break
        case ApplicationStatus.PENDING_MANAGER:
          await approvalsApi.managerApprove(id, request)
          break
        case ApplicationStatus.PENDING_CEO:
          await approvalsApi.ceoApprove(id, request)
          break
      }

      setRejectDialogOpen(false)
      setComment("")
      // 刷新数据
      await Promise.all([fetchApplication(), fetchApprovalHistory()])
    } catch (err) {
      console.error("拒绝失败:", err)
      setError("拒绝操作失败，请重试")
    } finally {
      setActionLoading(false)
    }
  }

  // 下载附件
  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const response = await uploadsApi.downloadFile(attachmentId)
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("下载失败:", err)
      setError("下载文件失败")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        </main>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">{error || "申请不存在"}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/applications")}>
                返回列表
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const status = statusConfig[application.status]
  const priority = priorityConfig[application.priority]

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
                    <p className="text-sm font-medium">
                      {application.amount
                        ? `${application.currency === Currency.USD ? "$" : "¥"}${application.amount.toLocaleString()}`
                        : "-"}
                    </p>
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
          {application.attachments && application.attachments.length > 0 && (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment.id, attachment.originalName)}
                    >
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
              {loadingHistory ? (
                <div className="px-6 py-8 text-center">
                  <Loader2 className="inline-block animate-spin h-6 w-6 text-primary" />
                  <p className="mt-2 text-gray-500">加载中...</p>
                </div>
              ) : approvalHistory.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  暂无审批记录
                </div>
              ) : (
                approvalHistory.map((record) => (
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
                {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
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
                {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                {actionLoading ? "处理中..." : "确认拒绝"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
