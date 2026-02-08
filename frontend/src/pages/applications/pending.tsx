import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Application, ApplicationStatus, UserRole, Priority, User } from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { applicationsApi } from "@/services/applications"
import { approvalsApi, ApprovalRequest } from "@/services/approvals"
import { usersApi } from "@/services/users"
import { formatDate, formatAmount, cn } from "@/lib/utils"
import { useSignature } from "@/hooks/useSignature"
import { SignatureDialog } from "@/components/SignatureDialog"
import { CheckCircle, XCircle, Eye, FileText, AlertCircle, Loader2, AlertTriangle, Clock } from "lucide-react"
import { toast } from "sonner"

const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  [ApplicationStatus.PENDING_FACTORY]: { label: "待厂长审批", color: "text-amber-700", bgColor: "bg-amber-100" },
  [ApplicationStatus.PENDING_DIRECTOR]: { label: "待总监审批", color: "text-blue-700", bgColor: "bg-blue-100" },
  [ApplicationStatus.PENDING_MANAGER]: { label: "待经理审批", color: "text-purple-700", bgColor: "bg-purple-100" },
  [ApplicationStatus.PENDING_CEO]: { label: "待CEO审批", color: "text-coral", bgColor: "bg-coral-light" },
}

const priorityMap: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  [Priority.LOW]: { label: "低", color: "text-gray-600", bgColor: "bg-gray-100", icon: null },
  [Priority.NORMAL]: { label: "普通", color: "text-blue-600", bgColor: "bg-blue-100", icon: null },
  [Priority.HIGH]: { label: "高", color: "text-amber-600", bgColor: "bg-amber-100", icon: <AlertCircle className="h-3 w-3" /> },
  [Priority.URGENT]: { label: "紧急", color: "text-red-600", bgColor: "bg-red-100", icon: <AlertTriangle className="h-3 w-3" /> },
}

const getPendingStatusByRole = (role: UserRole): ApplicationStatus | null => {
  switch (role) {
    case UserRole.FACTORY_MANAGER: return ApplicationStatus.PENDING_FACTORY
    case UserRole.DIRECTOR: return ApplicationStatus.PENDING_DIRECTOR
    case UserRole.MANAGER: return ApplicationStatus.PENDING_MANAGER
    case UserRole.CEO: return ApplicationStatus.PENDING_CEO
    default: return null
  }
}

const canApprove = (role: UserRole): boolean => {
  return [UserRole.FACTORY_MANAGER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.CEO].includes(role)
}

export function PendingList() {
  const { user } = useAuth()
  const { getSignature } = useSignature()
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(true)
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [signatureDialogOpen, setSignatureDialogOpen] = React.useState(false)
  const [managers, setManagers] = React.useState<User[]>([])
  const [loadingManagers, setLoadingManagers] = React.useState(false)
  const [approvalDialog, setApprovalDialog] = React.useState({
    open: false, application: null as Application | null, action: null as "APPROVE" | "REJECT" | null,
    comment: "", skipManager: false, selectedManagerIds: [] as string[],
  })
  const [detailDialog, setDetailDialog] = React.useState({ open: false, application: null as Application | null })

  const loadManagers = React.useCallback(async () => {
    setLoadingManagers(true)
    try {
      const response = await usersApi.getManagers()
      setManagers(response.data || [])
    } catch (error) {
      console.error("加载经理列表失败:", error)
    } finally {
      setLoadingManagers(false)
    }
  }, [])

  const loadPendingApplications = React.useCallback(async () => {
    if (!user || !canApprove(user.role)) return
    setLoading(true)
    try {
      const status = getPendingStatusByRole(user.role)
      const response = await applicationsApi.getApplications({ status: status || undefined, page: 1, pageSize: 100 })
      setApplications(response.data.items || [])
    } catch (error) {
      toast.error("加载待审批列表失败")
    } finally {
      setLoading(false)
    }
  }, [user])

  React.useEffect(() => { loadPendingApplications() }, [loadPendingApplications])
  React.useEffect(() => {
    const interval = setInterval(() => { loadPendingApplications() }, 60000)
    return () => clearInterval(interval)
  }, [loadPendingApplications])

  const openApprovalDialog = async (application: Application, action: "APPROVE" | "REJECT") => {
    if (user?.role === UserRole.DIRECTOR && action === "APPROVE") await loadManagers()
    setApprovalDialog({ open: true, application, action, comment: "", skipManager: false, selectedManagerIds: [] })
  }

  const submitApproval = async () => {
    const { application, action, comment, skipManager, selectedManagerIds } = approvalDialog
    if (!application || !action || !user) return

    if (action === "APPROVE") {
      const signature = await getSignature(user.username)
      if (!signature) {
        toast.error("您还没有设置签名，请先设置签名")
        setSignatureDialogOpen(true)
        return
      }
      if (user.role === UserRole.DIRECTOR && !skipManager && selectedManagerIds.length === 0) {
        toast.error("请选择至少一位经理进行审批")
        return
      }
    }

    setProcessingId(application.id)
    try {
      const data: ApprovalRequest = { action, comment: comment.trim() || undefined, skipManager, selectedManagerIds: selectedManagerIds.length > 0 ? selectedManagerIds : undefined }
      let response
      switch (user.role) {
        case UserRole.FACTORY_MANAGER: response = await approvalsApi.factoryApprove(application.id, data); break
        case UserRole.DIRECTOR: response = await approvalsApi.directorApprove(application.id, data); break
        case UserRole.MANAGER: response = await approvalsApi.managerApprove(application.id, data); break
        case UserRole.CEO: response = await approvalsApi.ceoApprove(application.id, data); break
        default: throw new Error("无审批权限")
      }
      toast.success(response.message || (action === "APPROVE" ? "审批通过" : "已拒绝"))
      setApprovalDialog({ open: false, application: null, action: null, comment: "", skipManager: false, selectedManagerIds: [] })
      loadPendingApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "审批失败")
    } finally {
      setProcessingId(null)
    }
  }

  const renderPriorityBadge = (priority: Priority) => {
    const config = priorityMap[priority] || priorityMap[Priority.NORMAL]
    return (
      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
        {config.icon}{config.label}
      </span>
    )
  }

  const renderStatusBadge = (status: ApplicationStatus) => {
    const config = statusMap[status] || { label: status, color: "text-gray-600", bgColor: "bg-gray-100" }
    return (
      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
        <Clock className="h-3 w-3" />{config.label}
      </span>
    )
  }

  if (!user || !canApprove(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">无权限访问</h3>
          <p className="text-gray-500">您没有审批权限</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">待我审批</h1>
          <p className="text-sm text-gray-500 mt-1">您有 <span className="font-semibold text-coral">{applications.length}</span> 个待审批申请</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-coral mb-3" />
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无待审批申请</h3>
          <p className="text-gray-500">您当前没有需要审批的申请</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="font-semibold">申请编号</TableHead>
                <TableHead className="font-semibold">标题</TableHead>
                <TableHead className="font-semibold">申请人</TableHead>
                <TableHead className="font-semibold">金额</TableHead>
                <TableHead className="font-semibold">优先级</TableHead>
                <TableHead className="font-semibold">状态</TableHead>
                <TableHead className="font-semibold">提交时间</TableHead>
                <TableHead className="text-right font-semibold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium text-gray-900">{app.applicationNo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{app.title}</TableCell>
                  <TableCell>{app.submitterName}</TableCell>
                  <TableCell className="font-medium">{formatAmount(app.amount)}</TableCell>
                  <TableCell>{renderPriorityBadge(app.priority)}</TableCell>
                  <TableCell>{renderStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(app.submittedAt || app.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg hover:bg-gray-100"
                        onClick={() => setDetailDialog({ open: true, application: app })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                        onClick={() => openApprovalDialog(app, "APPROVE")}
                        disabled={processingId === app.id}
                      >
                        {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => openApprovalDialog(app, "REJECT")}
                        disabled={processingId === app.id}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 审批对话框 */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {approvalDialog.action === "APPROVE" ? "审批通过" : "审批拒绝"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              {approvalDialog.application && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-mono mb-1">{approvalDialog.application.applicationNo}</p>
                  <p className="font-medium text-gray-900">{approvalDialog.application.title}</p>
                </div>
              )}
              {user?.role === UserRole.DIRECTOR && approvalDialog.action === "APPROVE" && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skipManager"
                      checked={approvalDialog.skipManager}
                      onCheckedChange={(checked) => setApprovalDialog({ ...approvalDialog, skipManager: checked as boolean, selectedManagerIds: checked ? [] : approvalDialog.selectedManagerIds })}
                    />
                    <Label htmlFor="skipManager" className="text-sm cursor-pointer">跳过经理审批，直接提交CEO</Label>
                  </div>
                  {!approvalDialog.skipManager && (
                    <div className="border rounded-xl p-4 space-y-2 bg-gray-50">
                      <Label className="text-sm font-medium">选择审批经理：</Label>
                      {loadingManagers ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm text-gray-500">加载经理列表...</span></div>
                      ) : managers.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">暂无经理用户</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {managers.map((manager) => (
                            <div key={manager.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`manager-${manager.id}`}
                                checked={approvalDialog.selectedManagerIds.includes(manager.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setApprovalDialog({ ...approvalDialog, selectedManagerIds: [...approvalDialog.selectedManagerIds, manager.id] })
                                  else setApprovalDialog({ ...approvalDialog, selectedManagerIds: approvalDialog.selectedManagerIds.filter((id) => id !== manager.id) })
                                }}
                              />
                              <Label htmlFor={`manager-${manager.id}`} className="text-sm cursor-pointer">{manager.name} ({manager.department || '无部门'})</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="comment" className="text-sm font-medium">审批备注</Label>
                <Textarea
                  id="comment"
                  placeholder={approvalDialog.action === "APPROVE" ? "请输入审批意见（可选）" : "请输入拒绝原因（必填）"}
                  value={approvalDialog.comment}
                  onChange={(e) => setApprovalDialog({ ...approvalDialog, comment: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  rows={4}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialog({ open: false, application: null, action: null, comment: "", skipManager: false, selectedManagerIds: [] })}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              variant={approvalDialog.action === "APPROVE" ? "default" : "destructive"}
              onClick={submitApproval}
              disabled={processingId !== null || (approvalDialog.action === "REJECT" && !approvalDialog.comment.trim())}
              className="rounded-xl"
            >
              {processingId ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />处理中...</> : (approvalDialog.action === "APPROVE" ? "确认通过" : "确认拒绝")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ open, application: null })}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">申请详情</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {detailDialog.application && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-gray-500">申请编号</Label><p className="font-medium text-gray-900 mt-0.5">{detailDialog.application.applicationNo}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-gray-500">状态</Label><div className="mt-1">{renderStatusBadge(detailDialog.application.status)}</div></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-gray-500">申请人</Label><p className="font-medium text-gray-900 mt-0.5">{detailDialog.application.submitterName}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-gray-500">部门</Label><p className="font-medium text-gray-900 mt-0.5">{detailDialog.application.submitterDepartment}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-gray-500">金额</Label><p className="font-medium text-gray-900 mt-0.5">{formatAmount(detailDialog.application.amount)}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-gray-500">优先级</Label><div className="mt-1">{renderPriorityBadge(detailDialog.application.priority)}</div></div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">标题</Label>
                  <p className="font-medium text-gray-900 mt-1">{detailDialog.application.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">内容</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1 bg-gray-50 rounded-xl p-4">{detailDialog.application.content}</p>
                </div>
                {detailDialog.application.attachments.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">附件</Label>
                    <div className="mt-2 space-y-2">
                      {detailDialog.application.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-coral-light flex items-center justify-center">
                            <FileText className="h-4 w-4 text-coral" />
                          </div>
                          <span className="flex-1 truncate">{att.originalName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setDetailDialog({ open: false, application: null })} className="rounded-xl">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 签名设置对话框 */}
      {user && <SignatureDialog isOpen={signatureDialogOpen} onClose={() => setSignatureDialogOpen(false)} username={user.username} />}
    </div>
  )
}
