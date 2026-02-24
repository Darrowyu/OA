import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Application, ApplicationStatus, UserRole, Priority } from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { applicationsApi } from "@/services/applications"
import { approvalsApi, ApprovalRequest } from "@/services/approvals"
import { formatDate, formatAmount, cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/error-handler"
import { useSignature } from "@/hooks/useSignature"
import { SignatureDialog } from "@/components/SignatureDialog"
import { DirectorApprovalDialog } from "@/components/DirectorApprovalDialog"
import { statusConfig, priorityConfig } from "@/config/status"
import { usersApi } from "@/services/users"
import { CheckCircle, XCircle, Eye, FileText, AlertCircle, Loader2, AlertTriangle, User as UserIcon, Calendar as CalendarIcon, DollarSign } from "lucide-react"
import { User } from "@/types"
import { toast } from "sonner"

const getPendingStatusByRole = (role: UserRole): ApplicationStatus | null => {
  switch (role) {
    case UserRole.FACTORY_MANAGER: return ApplicationStatus.PENDING_FACTORY
    case UserRole.DIRECTOR: return ApplicationStatus.PENDING_DIRECTOR
    case UserRole.MANAGER: return ApplicationStatus.PENDING_MANAGER
    case UserRole.CEO: return ApplicationStatus.PENDING_CEO
    case UserRole.ADMIN: return null // 管理员查看所有待审批状态
    default: return null
  }
}

// 可以执行审批的角色（不包括管理员，管理员只能查看）
const canApprove = (role: UserRole): boolean => {
  return [UserRole.FACTORY_MANAGER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.CEO].includes(role)
}

// 可以查看待审批页面的角色（包括管理员）
const canViewPending = (role: UserRole): boolean =>
  [UserRole.FACTORY_MANAGER, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.CEO, UserRole.ADMIN].includes(role)

// 优先级Badge
const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const config = priorityConfig[priority] || priorityConfig[Priority.NORMAL]
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
      {priority === Priority.HIGH && <AlertCircle className="h-3 w-3" />}
      {priority === Priority.URGENT && <AlertTriangle className="h-3 w-3" />}
      {config.label}
    </span>
  )
}

// 状态Badge
const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const config = statusConfig[status] || { label: status, color: "text-gray-600", bgColor: "bg-gray-100" }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
      {config.label}
    </span>
  )
}

// 移动端卡片组件
function MobileCard({ app, userCanApprove, processingId, onView, onApprove, onReject }: {
  app: Application
  userCanApprove: boolean
  processingId: string | null
  onView: (app: Application) => void
  onApprove: (app: Application) => void
  onReject: (app: Application) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-1">{app.applicationNo}</p>
          <h3 className="font-semibold text-gray-900 line-clamp-1">{app.title}</h3>
        </div>
        <StatusBadge status={app.status} />
      </div>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <UserIcon className="h-4 w-4" />
          <span>{app.submitterName}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <CalendarIcon className="h-4 w-4" />
          <span>{formatDate(app.submittedAt || app.createdAt)}</span>
        </div>
        {app.amount !== null && (
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">{formatAmount(app.amount)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">优先级:</span>
          <PriorityBadge priority={app.priority} />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => onView(app)}>
          <Eye className="h-4 w-4 mr-1" /> 查看
        </Button>
        {userCanApprove && (
          <>
            <Button size="sm" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(app)} disabled={processingId === app.id}>
              {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} 通过
            </Button>
            <Button size="sm" variant="destructive" className="flex-1 rounded-xl" onClick={() => onReject(app)} disabled={processingId === app.id}>
              <XCircle className="h-4 w-4 mr-1" /> 拒绝
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function PendingList() {
  const { user } = useAuth()
  const { getSignature } = useSignature()
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(true)
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [signatureDialogOpen, setSignatureDialogOpen] = React.useState(false)
  const [approvalDialog, setApprovalDialog] = React.useState({
    open: false, application: null as Application | null, action: null as "APPROVE" | "REJECT" | null,
    comment: "",
  })
  const [detailDialog, setDetailDialog] = React.useState({ open: false, application: null as Application | null })
  const [directorDialogOpen, setDirectorDialogOpen] = React.useState(false)
  const [selectedApplication, setSelectedApplication] = React.useState<Application | null>(null)
  const [managers, setManagers] = React.useState<User[]>([])

  const loadPendingApplications = React.useCallback(async () => {
    if (!user || !canViewPending(user.role)) return
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

  React.useEffect(() => {
    loadPendingApplications()
    const interval = setInterval(loadPendingApplications, 60000)
    return () => clearInterval(interval)
  }, [loadPendingApplications])

  const openApprovalDialog = async (application: Application, action: "APPROVE" | "REJECT") => {
    setApprovalDialog({ open: true, application, action, comment: "" })
  }

  const submitApproval = async () => {
    const { application, action, comment } = approvalDialog
    if (!application || !action || !user) return

    // 管理员不能执行审批操作
    if (user.role === UserRole.ADMIN) {
      toast.error("管理员只能查看，不能执行审批操作")
      return
    }

    if (action === "APPROVE") {
      const signature = await getSignature(user.username)
      if (!signature) {
        toast.error("您还没有设置签名，请先设置签名")
        setSignatureDialogOpen(true)
        return
      }
    }

    setProcessingId(application.id)
    try {
      const data: ApprovalRequest = { action, comment: comment.trim() || undefined }
      type ApprovalMethod = (applicationId: string, data: ApprovalRequest) => Promise<{ message?: string }>
      const approvalApiMap: Partial<Record<UserRole, ApprovalMethod>> = {
        [UserRole.FACTORY_MANAGER]: approvalsApi.factoryApprove,
        [UserRole.DIRECTOR]: approvalsApi.directorApprove,
        [UserRole.MANAGER]: approvalsApi.managerApprove,
        [UserRole.CEO]: approvalsApi.ceoApprove,
      }
      const apiMethod = approvalApiMap[user.role]
      if (!apiMethod) throw new Error("无审批权限")
      const response = await apiMethod.call(approvalsApi, application.id, data)
      toast.success(response.message || (action === "APPROVE" ? "审批通过" : "已拒绝"))
      closeApprovalDialog()
      loadPendingApplications()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "审批失败")
    } finally {
      setProcessingId(null)
    }
  }

  // 加载经理列表
  const loadManagers = React.useCallback(async () => {
    try {
      const response = await usersApi.getManagers()
      if (response.success) {
        setManagers(response.data)
      }
    } catch (error) {
      console.error('加载经理列表失败', error)
    }
  }, [])

  // 组件挂载时加载经理列表
  React.useEffect(() => {
    loadManagers()
  }, [loadManagers])

  // 简化的回调函数
  const handleView = (app: Application) => setDetailDialog({ open: true, application: app })
  const handleApprove = (app: Application) => {
    if (user?.role === UserRole.DIRECTOR) {
      setSelectedApplication(app)
      setDirectorDialogOpen(true)
    } else {
      openApprovalDialog(app, "APPROVE")
    }
  }
  const handleReject = (app: Application) => openApprovalDialog(app, "REJECT")

  // 辅助函数：关闭审批对话框
  const closeApprovalDialog = (): void => setApprovalDialog({ open: false, application: null, action: null, comment: "" })

  // 辅助函数：更新审批对话框
  const updateApprovalDialog = (updates: Partial<typeof approvalDialog>) => setApprovalDialog({ ...approvalDialog, ...updates })

  if (!user || !canViewPending(user.role)) {
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

  // 判断当前用户是否可以执行审批操作（管理员只能查看，不能审批）
  const userCanApprove = user && canApprove(user.role)

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
        <>
          {/* 移动端卡片视图 */}
          <div className="md:hidden">
            {applications.map((app) => (
              <MobileCard
                key={app.id}
                app={app}
                userCanApprove={userCanApprove}
                processingId={processingId}
                onView={handleView}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>

          {/* PC端表格视图 */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <TableCell><PriorityBadge priority={app.priority} /></TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
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
                        {userCanApprove && (
                          <>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* 审批对话框 - 仅对可审批用户显示 */}
      <Dialog open={approvalDialog.open && userCanApprove} onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}>
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
              <div>
                <Label htmlFor="comment" className="text-sm font-medium">审批备注</Label>
                <Textarea
                  id="comment"
                  placeholder={approvalDialog.action === "APPROVE" ? "请输入审批意见（可选）" : "请输入拒绝原因（必填）"}
                  value={approvalDialog.comment}
                  onChange={(e) => updateApprovalDialog({ comment: e.target.value })}
                  className="mt-1.5 rounded-xl"
                  rows={4}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => closeApprovalDialog()}
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
                  {[
                    { label: "申请编号", value: detailDialog.application.applicationNo },
                    { label: "状态", value: <StatusBadge status={detailDialog.application.status} /> },
                    { label: "申请人", value: detailDialog.application.submitterName },
                    { label: "部门", value: detailDialog.application.submitterDepartment },
                    { label: "金额", value: formatAmount(detailDialog.application.amount) },
                    { label: "优先级", value: <PriorityBadge priority={detailDialog.application.priority} /> },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-gray-50 rounded-xl">
                      <Label className="text-xs text-gray-500">{label}</Label>
                      <div className="font-medium text-gray-900 mt-0.5">{value}</div>
                    </div>
                  ))}
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

      {/* 总监审批对话框 */}
      <DirectorApprovalDialog
        open={directorDialogOpen}
        onClose={() => { setDirectorDialogOpen(false); setSelectedApplication(null); }}
        onSubmit={async (data) => {
          if (!selectedApplication || !user) return;

          if (data.action === 'APPROVE') {
            const signature = await getSignature(user.username);
            if (!signature) {
              toast.error('您还没有设置签名，请先设置签名');
              setSignatureDialogOpen(true);
              return;
            }
          }

          setProcessingId(selectedApplication.id);
          try {
            const response = await approvalsApi.directorApprove(selectedApplication.id, {
              action: data.action,
              comment: data.comment,
              flowType: data.flowType,
              selectedManagerIds: data.selectedManagerIds,
            });
            toast.success(response.message || '审批成功');
            setDirectorDialogOpen(false);
            setSelectedApplication(null);
            loadPendingApplications();
          } catch (error) {
            toast.error(getErrorMessage(error) || '审批失败');
          } finally {
            setProcessingId(null);
          }
        }}
        managers={managers}
        loading={processingId !== null}
      />
    </div>
  )
}
