import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Download,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
} from "lucide-react"

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  [ApplicationStatus.DRAFT]: {
    label: "草稿",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: <FileText className="h-4 w-4" />,
  },
  [ApplicationStatus.PENDING_FACTORY]: {
    label: "待厂长审核",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <Clock className="h-4 w-4" />,
  },
  [ApplicationStatus.PENDING_DIRECTOR]: {
    label: "待总监审批",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Clock className="h-4 w-4" />,
  },
  [ApplicationStatus.PENDING_MANAGER]: {
    label: "待经理审批",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: <Clock className="h-4 w-4" />,
  },
  [ApplicationStatus.PENDING_CEO]: {
    label: "待CEO审批",
    color: "text-coral",
    bgColor: "bg-coral-light",
    icon: <Clock className="h-4 w-4" />,
  },
  [ApplicationStatus.APPROVED]: {
    label: "已通过",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  [ApplicationStatus.REJECTED]: {
    label: "已拒绝",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="h-4 w-4" />,
  },
  [ApplicationStatus.ARCHIVED]: {
    label: "已归档",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: <FileText className="h-4 w-4" />,
  },
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: "低", color: "text-gray-600", bgColor: "bg-gray-100" },
  NORMAL: { label: "普通", color: "text-blue-600", bgColor: "bg-blue-100" },
  HIGH: { label: "高", color: "text-amber-600", bgColor: "bg-amber-100" },
  URGENT: { label: "紧急", color: "text-red-600", bgColor: "bg-red-100" },
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
  const [withdrawDialogOpen, setWithdrawDialogOpen] = React.useState(false)
  const [withdrawLevel, setWithdrawLevel] = React.useState<'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO' | null>(null)
  const [comment, setComment] = React.useState("")
  const [actionLoading, setActionLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("basic")

  const fetchApplication = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await applicationsApi.getApplication(id)
      setApplication(response.data)
    } catch (err) {
      setError("获取申请详情失败")
    } finally {
      setLoading(false)
    }
  }, [id])

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

  const canApprove = React.useMemo(() => {
    if (!application || !user) return false
    if ([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.DRAFT].includes(application.status)) {
      return false
    }
    if (application.currentApproverId !== user.id) return false

    switch (application.status) {
      case ApplicationStatus.PENDING_FACTORY: return user.role === UserRole.FACTORY_MANAGER
      case ApplicationStatus.PENDING_DIRECTOR: return user.role === UserRole.DIRECTOR
      case ApplicationStatus.PENDING_MANAGER: return user.role === UserRole.MANAGER
      case ApplicationStatus.PENDING_CEO: return user.role === UserRole.CEO
      default: return false
    }
  }, [application, user])

  const handleApprove = async () => {
    if (!id || !application) return
    setActionLoading(true)
    try {
      const request = { action: "APPROVE" as const, comment: comment || undefined }
      switch (application.status) {
        case ApplicationStatus.PENDING_FACTORY: await approvalsApi.factoryApprove(id, request); break
        case ApplicationStatus.PENDING_DIRECTOR: await approvalsApi.directorApprove(id, request); break
        case ApplicationStatus.PENDING_MANAGER: await approvalsApi.managerApprove(id, request); break
        case ApplicationStatus.PENDING_CEO: await approvalsApi.ceoApprove(id, request); break
      }
      setApprovalDialogOpen(false)
      setComment("")
      await Promise.all([fetchApplication(), fetchApprovalHistory()])
    } catch (err) {
      setError("审批操作失败，请重试")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!id || !application) return
    setActionLoading(true)
    try {
      const request = { action: "REJECT" as const, comment: comment || undefined }
      switch (application.status) {
        case ApplicationStatus.PENDING_FACTORY: await approvalsApi.factoryApprove(id, request); break
        case ApplicationStatus.PENDING_DIRECTOR: await approvalsApi.directorApprove(id, request); break
        case ApplicationStatus.PENDING_MANAGER: await approvalsApi.managerApprove(id, request); break
        case ApplicationStatus.PENDING_CEO: await approvalsApi.ceoApprove(id, request); break
      }
      setRejectDialogOpen(false)
      setComment("")
      await Promise.all([fetchApplication(), fetchApprovalHistory()])
    } catch (err) {
      setError("拒绝操作失败，请重试")
    } finally {
      setActionLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!id || !withdrawLevel) return
    setActionLoading(true)
    try {
      await approvalsApi.withdrawApproval(id, withdrawLevel)
      setWithdrawDialogOpen(false)
      setWithdrawLevel(null)
      await Promise.all([fetchApplication(), fetchApprovalHistory()])
    } catch (err: any) {
      setError(err.response?.data?.error || "撤回操作失败，请重试")
    } finally {
      setActionLoading(false)
    }
  }

  const canWithdraw = (level: 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO') => {
    if (!application || !user) return false
    const roleMap: Record<string, UserRole> = {
      'FACTORY': UserRole.FACTORY_MANAGER,
      'DIRECTOR': UserRole.DIRECTOR,
      'MANAGER': UserRole.MANAGER,
      'CEO': UserRole.CEO,
    }
    if (user.role !== roleMap[level]) return false

    const allowedStatuses: Record<string, ApplicationStatus[]> = {
      'FACTORY': [ApplicationStatus.PENDING_DIRECTOR, ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
      'DIRECTOR': [ApplicationStatus.PENDING_MANAGER, ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
      'MANAGER': [ApplicationStatus.PENDING_CEO, ApplicationStatus.APPROVED],
      'CEO': [ApplicationStatus.APPROVED],
    }
    return allowedStatuses[level]?.includes(application.status) ?? false
  }

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const response = await uploadsApi.downloadFile(attachmentId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError("下载文件失败")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-coral mb-3" />
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">{error || "申请不存在"}</p>
        <Button
          variant="outline"
          className="mt-4 rounded-xl"
          onClick={() => navigate("/applications")}
        >
          返回列表
        </Button>
      </div>
    )
  }

  const status = statusConfig[application.status]
  const priority = priorityConfig[application.priority]

  return (
    <div className="max-w-5xl mx-auto">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/applications")}
          className="rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申请详情</h1>
          <p className="text-sm text-gray-500 mt-0.5">查看和管理申请信息</p>
        </div>
      </div>

      {/* 申请信息卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* 头部 */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${status.bgColor} flex items-center justify-center`}>
              <div className={status.color}>{status.icon}</div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{application.title}</h2>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{application.applicationNo}</p>
            </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 border-b border-gray-100">
            <TabsList className="h-14 bg-transparent p-0 gap-6">
              <TabsTrigger
                value="basic"
                className="h-full px-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-coral rounded-none text-sm font-medium"
              >
                基本信息
              </TabsTrigger>
              <TabsTrigger
                value="approvals"
                className="h-full px-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-coral rounded-none text-sm font-medium"
              >
                审批记录
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="h-full px-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-coral rounded-none text-sm font-medium"
              >
                附件 ({application.attachments?.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 基本信息 */}
          <TabsContent value="basic" className="p-6 m-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">申请人</p>
                  <p className="text-sm font-semibold text-gray-900">{application.submitterName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">金额</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {application.amount
                      ? `${application.currency === Currency.USD ? "$" : "¥"}${application.amount.toLocaleString()}`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-lg ${priority.bgColor} flex items-center justify-center`}>
                  <Flag className={`h-5 w-5 ${priority.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">优先级</p>
                  <p className={`text-sm font-semibold ${priority.color}`}>{priority.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">提交时间</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(application.submittedAt || application.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">申请内容</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-5 leading-relaxed">
                {application.content}
              </div>
            </div>
          </TabsContent>

          {/* 审批记录 */}
          <TabsContent value="approvals" className="m-0">
            <div className="divide-y divide-gray-100">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin h-8 w-8 text-coral mb-3" />
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : approvalHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">暂无审批记录</p>
                </div>
              ) : (
                approvalHistory.map((record) => {
                  const levelMap: Record<string, 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO'> = {
                    '厂长': 'FACTORY', '总监': 'DIRECTOR', '经理': 'MANAGER', 'CEO': 'CEO',
                  }
                  const level = levelMap[record.approverRole]
                  const showWithdraw = level && canWithdraw(level) && record.approverId === user?.id

                  return (
                    <div key={record.id} className="px-6 py-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            record.action === "APPROVE" ? "bg-emerald-100" : "bg-red-100"
                          }`}>
                            {record.action === "APPROVE" ? (
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {record.approverName}
                              <span className="text-gray-500 font-normal ml-1">({record.approverRole})</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            record.action === "APPROVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {record.action === "APPROVE" ? "通过" : "拒绝"}
                          </span>
                          {showWithdraw && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-coral hover:text-coral-dark hover:bg-coral-light"
                              onClick={() => { setWithdrawLevel(level); setWithdrawDialogOpen(true) }}
                            >
                              撤回
                            </Button>
                          )}
                        </div>
                      </div>
                      {record.comment && (
                        <p className="mt-3 text-sm text-gray-600 ml-14 bg-gray-50 rounded-lg p-3">
                          {record.comment}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* 附件 */}
          <TabsContent value="attachments" className="m-0">
            {application.attachments && application.attachments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {application.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-coral-light flex items-center justify-center">
                        <Paperclip className="h-5 w-5 text-coral" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{attachment.originalName}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment.id, attachment.originalName)}
                      className="rounded-lg hover:bg-coral-light hover:text-coral"
                    >
                      <Download className="h-4 w-4 mr-1" /> 下载
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Paperclip className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">暂无附件</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 审批操作按钮 */}
      {canApprove && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            onClick={() => setRejectDialogOpen(true)}
          >
            <XCircle className="h-5 w-5 mr-2" /> 拒绝
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl bg-coral hover:bg-coral-dark shadow-lg shadow-coral/30"
            onClick={() => setApprovalDialogOpen(true)}
          >
            <CheckCircle className="h-5 w-5 mr-2" /> 通过
          </Button>
        </div>
      )}

      {/* 通过对话框 */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">确认通过</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600 mb-4">
              您确定要通过申请 <span className="font-semibold text-gray-900">"{application.title}"</span> 吗？
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
            <Button
              variant="outline"
              onClick={() => setApprovalDialogOpen(false)}
              disabled={actionLoading}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="rounded-xl bg-coral hover:bg-coral-dark"
            >
              {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {actionLoading ? "处理中..." : "确认通过"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">确认拒绝</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600 mb-4">
              您确定要拒绝申请 <span className="font-semibold text-gray-900">"{application.title}"</span> 吗？
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
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
              className="rounded-xl"
            >
              {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {actionLoading ? "处理中..." : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤回对话框 */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">撤回审批</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600 mb-4">
              您确定要撤回您的{withdrawLevel === 'FACTORY' ? '厂长' : withdrawLevel === 'DIRECTOR' ? '总监' : withdrawLevel === 'MANAGER' ? '经理' : 'CEO'}审批吗？
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100">
              撤回后申请将回退到上一审批环节，需要重新审批。
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawDialogOpen(false)}
              disabled={actionLoading}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={actionLoading}
              className="rounded-xl"
            >
              {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {actionLoading ? "处理中..." : "确认撤回"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
