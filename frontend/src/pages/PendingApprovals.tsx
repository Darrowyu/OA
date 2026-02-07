import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  UserRole,
  Priority,
  User,
} from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { applicationsApi } from "@/services/applications"
import { approvalsApi, ApprovalRequest } from "@/services/approvals"
import { usersApi } from "@/services/users"
import { formatDate, formatAmount, cn } from "@/lib/utils"
import { useSignature } from "@/hooks/useSignature"
import { SignatureDialog } from "@/components/SignatureDialog"
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  User as UserIcon,
  DollarSign,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { Sidebar } from "@/components/Sidebar"

// 状态映射
const statusMap: Record<string, { label: string; color: string }> = {
  [ApplicationStatus.PENDING_FACTORY]: { label: "待厂长审批", color: "bg-yellow-100 text-yellow-800" },
  [ApplicationStatus.PENDING_DIRECTOR]: { label: "待总监审批", color: "bg-blue-100 text-blue-800" },
  [ApplicationStatus.PENDING_MANAGER]: { label: "待经理审批", color: "bg-purple-100 text-purple-800" },
  [ApplicationStatus.PENDING_CEO]: { label: "待CEO审批", color: "bg-red-100 text-red-800" },
}

// 优先级映射
const priorityMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  [Priority.LOW]: { label: "低", color: "bg-gray-100 text-gray-800", icon: null },
  [Priority.NORMAL]: { label: "普通", color: "bg-blue-100 text-blue-800", icon: null },
  [Priority.HIGH]: { label: "高", color: "bg-orange-100 text-orange-800", icon: <AlertCircle className="h-3 w-3" /> },
  [Priority.URGENT]: { label: "紧急", color: "bg-red-100 text-red-800", icon: <AlertTriangle className="h-3 w-3" /> },
}

// 获取角色对应的待审批状态
const getPendingStatusByRole = (role: UserRole): ApplicationStatus | null => {
  switch (role) {
    case UserRole.FACTORY_MANAGER:
      return ApplicationStatus.PENDING_FACTORY
    case UserRole.DIRECTOR:
      return ApplicationStatus.PENDING_DIRECTOR
    case UserRole.MANAGER:
      return ApplicationStatus.PENDING_MANAGER
    case UserRole.CEO:
      return ApplicationStatus.PENDING_CEO
    default:
      return null
  }
}

// 检查角色是否有审批权限
const canApprove = (role: UserRole): boolean => {
  return [
    UserRole.FACTORY_MANAGER,
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.CEO,
  ].includes(role)
}

export const PendingApprovals: React.FC = () => {
  // const navigate = useNavigate()
  const { user } = useAuth()
  const { getSignature } = useSignature()
  const [applications, setApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(true)
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [signatureDialogOpen, setSignatureDialogOpen] = React.useState(false)
  const [managers, setManagers] = React.useState<User[]>([])
  const [loadingManagers, setLoadingManagers] = React.useState(false)

  // 审批对话框状态
  const [approvalDialog, setApprovalDialog] = React.useState<{
    open: boolean
    application: Application | null
    action: "APPROVE" | "REJECT" | null
    comment: string
    skipManager: boolean
    selectedManagerIds: string[]
  }>({
    open: false,
    application: null,
    action: null,
    comment: "",
    skipManager: false,
    selectedManagerIds: [],
  })

  // 查看详情对话框
  const [detailDialog, setDetailDialog] = React.useState<{
    open: boolean
    application: Application | null
  }>({
    open: false,
    application: null,
  })

  // 加载经理列表（用于总监审批时选择）
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

  // 加载待审批列表
  const loadPendingApplications = React.useCallback(async () => {
    if (!user || !canApprove(user.role)) return

    setLoading(true)
    try {
      const status = getPendingStatusByRole(user.role)
      const response = await applicationsApi.getApplications({
        status: status || undefined,
        page: 1,
        pageSize: 100,
      })
      setApplications(response.data.items || [])
    } catch (error) {
      toast.error("加载待审批列表失败")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [user])

  React.useEffect(() => {
    loadPendingApplications()
  }, [loadPendingApplications])

  // 自动刷新（每60秒）
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadPendingApplications()
    }, 60000) // 60秒

    return () => clearInterval(interval)
  }, [loadPendingApplications])

  // 打开审批对话框
  const openApprovalDialog = async (
    application: Application,
    action: "APPROVE" | "REJECT"
  ) => {
    // 如果是总监审批且是通过操作，加载经理列表
    if (user?.role === UserRole.DIRECTOR && action === "APPROVE") {
      await loadManagers()
    }

    setApprovalDialog({
      open: true,
      application,
      action,
      comment: "",
      skipManager: false,
      selectedManagerIds: [],
    })
  }

  // 提交审批
  const submitApproval = async () => {
    const { application, action, comment, skipManager, selectedManagerIds } = approvalDialog
    if (!application || !action || !user) return

    // 如果是拒绝操作，不需要签名
    if (action === "APPROVE") {
      // 检查用户是否有签名
      const signature = await getSignature(user.username)
      if (!signature) {
        toast.error("您还没有设置签名，请先设置签名")
        setSignatureDialogOpen(true)
        return
      }

      // 总监审批时，如果不跳过经理，必须选择至少一个经理
      if (user.role === UserRole.DIRECTOR && !skipManager && selectedManagerIds.length === 0) {
        toast.error("请选择至少一位经理进行审批")
        return
      }
    }

    setProcessingId(application.id)
    try {
      const data: ApprovalRequest = {
        action,
        comment: comment.trim() || undefined,
        skipManager,
        selectedManagerIds: selectedManagerIds.length > 0 ? selectedManagerIds : undefined,
      }

      // 根据角色调用不同的审批接口
      let response
      switch (user.role) {
        case UserRole.FACTORY_MANAGER:
          response = await approvalsApi.factoryApprove(application.id, data)
          break
        case UserRole.DIRECTOR:
          response = await approvalsApi.directorApprove(application.id, data)
          break
        case UserRole.MANAGER:
          response = await approvalsApi.managerApprove(application.id, data)
          break
        case UserRole.CEO:
          response = await approvalsApi.ceoApprove(application.id, data)
          break
        default:
          throw new Error("无审批权限")
      }

      toast.success(response.message || (action === "APPROVE" ? "审批通过" : "已拒绝"))
      setApprovalDialog({ open: false, application: null, action: null, comment: "", skipManager: false, selectedManagerIds: [] })
      loadPendingApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "审批失败")
      console.error(error)
    } finally {
      setProcessingId(null)
    }
  }

  // 渲染优先级徽章
  const renderPriorityBadge = (priority: Priority) => {
    const config = priorityMap[priority] || priorityMap[Priority.NORMAL]
    return (
      <Badge className={cn("flex items-center gap-1 w-fit", config.color)}>
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  // 渲染状态徽章
  const renderStatusBadge = (status: ApplicationStatus) => {
    const config = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" }
    return <Badge className={config.color}>{config.label}</Badge>
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
            <UserIcon className="h-4 w-4" />
            <span>{app.submitterName}</span>
            <span className="text-gray-400">({app.submitterDepartment})</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(app.submittedAt || app.createdAt)}</span>
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setDetailDialog({ open: true, application: app })}
          >
            <Eye className="h-4 w-4 mr-1" />
            查看
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => openApprovalDialog(app, "APPROVE")}
            disabled={processingId === app.id}
          >
            {processingId === app.id ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-1" />
            )}
            通过
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => openApprovalDialog(app, "REJECT")}
            disabled={processingId === app.id}
          >
            <XCircle className="h-4 w-4 mr-1" />
            拒绝
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // 如果没有权限
  if (!user || !canApprove(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">无权限访问</h3>
            <p className="text-gray-500">您没有审批权限</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">待审批申请</h1>
            <p className="text-sm text-gray-500 mt-1">
              您有 {applications.length} 个待审批申请
            </p>
          </div>
        </div>

        {/* 加载状态 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无待审批申请</h3>
              <p className="text-gray-500">您当前没有需要审批的申请</p>
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
                        <TableHead>提交时间</TableHead>
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
                          <TableCell>{formatDate(app.submittedAt || app.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailDialog({ open: true, application: app })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => openApprovalDialog(app, "APPROVE")}
                                disabled={processingId === app.id}
                              >
                                {processingId === app.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
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
                </CardContent>
              </Card>
            </div>
          </>
        )}

      {/* 审批对话框 */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === "APPROVE" ? "审批通过" : "审批拒绝"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              {approvalDialog.application && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-500">{approvalDialog.application.applicationNo}</p>
                  <p className="font-medium">{approvalDialog.application.title}</p>
                </div>
              )}

              {/* 总监审批时显示经理选择 */}
              {user?.role === UserRole.DIRECTOR && approvalDialog.action === "APPROVE" && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skipManager"
                      checked={approvalDialog.skipManager}
                      onCheckedChange={(checked) =>
                        setApprovalDialog({
                          ...approvalDialog,
                          skipManager: checked as boolean,
                          selectedManagerIds: checked ? [] : approvalDialog.selectedManagerIds,
                        })
                      }
                    />
                    <Label htmlFor="skipManager" className="text-sm cursor-pointer">
                      跳过经理审批，直接提交CEO
                    </Label>
                  </div>

                  {/* 经理选择列表 */}
                  {!approvalDialog.skipManager && (
                    <div className="border rounded-md p-3 space-y-2">
                      <Label className="text-sm font-medium">选择审批经理：</Label>
                      {loadingManagers ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">加载经理列表...</span>
                        </div>
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
                                  if (checked) {
                                    setApprovalDialog({
                                      ...approvalDialog,
                                      selectedManagerIds: [...approvalDialog.selectedManagerIds, manager.id],
                                    })
                                  } else {
                                    setApprovalDialog({
                                      ...approvalDialog,
                                      selectedManagerIds: approvalDialog.selectedManagerIds.filter(
                                        (id) => id !== manager.id
                                      ),
                                    })
                                  }
                                }}
                              />
                              <Label htmlFor={`manager-${manager.id}`} className="text-sm cursor-pointer">
                                {manager.name} ({manager.department || '无部门'})
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {approvalDialog.selectedManagerIds.length > 0 && (
                        <p className="text-xs text-gray-500">
                          已选择 {approvalDialog.selectedManagerIds.length} 位经理
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="comment">审批备注</Label>
                <Textarea
                  id="comment"
                  placeholder={approvalDialog.action === "APPROVE" ? "请输入审批意见（可选）" : "请输入拒绝原因（必填）"}
                  value={approvalDialog.comment}
                  onChange={(e) => setApprovalDialog({ ...approvalDialog, comment: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialog({ open: false, application: null, action: null, comment: "", skipManager: false, selectedManagerIds: [] })}
            >
              取消
            </Button>
            <Button
              variant={approvalDialog.action === "APPROVE" ? "default" : "destructive"}
              onClick={submitApproval}
              disabled={processingId !== null || (approvalDialog.action === "REJECT" && !approvalDialog.comment.trim())}
            >
              {processingId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  处理中...
                </>
              ) : (
                approvalDialog.action === "APPROVE" ? "确认通过" : "确认拒绝"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ open, application: null })}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>申请详情</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {detailDialog.application && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">申请编号</Label>
                    <p>{detailDialog.application.applicationNo}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">状态</Label>
                    <div className="mt-1">
                      {renderStatusBadge(detailDialog.application.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-500">申请人</Label>
                    <p>{detailDialog.application.submitterName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">部门</Label>
                    <p>{detailDialog.application.submitterDepartment}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">金额</Label>
                    <p>{formatAmount(detailDialog.application.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">优先级</Label>
                    <div className="mt-1">
                      {renderPriorityBadge(detailDialog.application.priority)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">标题</Label>
                  <p className="font-medium">{detailDialog.application.title}</p>
                </div>
                <div>
                  <Label className="text-gray-500">内容</Label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                    {detailDialog.application.content}
                  </p>
                </div>
                {detailDialog.application.attachments.length > 0 && (
                  <div>
                    <Label className="text-gray-500">附件</Label>
                    <div className="mt-1 space-y-1">
                      {detailDialog.application.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{att.originalName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setDetailDialog({ open: false, application: null })}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 签名设置对话框 */}
      {user && (
        <SignatureDialog
          isOpen={signatureDialogOpen}
          onClose={() => setSignatureDialogOpen(false)}
          username={user.username}
        />
      )}
      </main>
    </div>
  )
}
