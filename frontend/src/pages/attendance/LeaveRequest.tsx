import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Calendar, Clock, CheckCircle, XCircle, Clock3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { attendanceApi, type LeaveRequest as LeaveRequestType, type LeaveType, type LeaveRequestStatus } from '@/services/attendance'
import { toast } from 'sonner'

const leaveTypes: { value: LeaveType; label: string }[] = [
  { value: 'ANNUAL', label: '年假' },
  { value: 'SICK', label: '病假' },
  { value: 'PERSONAL', label: '事假' },
  { value: 'MARRIAGE', label: '婚假' },
  { value: 'MATERNITY', label: '产假' },
  { value: 'PATERNITY', label: '陪产假' },
  { value: 'FUNERAL', label: '丧假' },
  { value: 'OTHER', label: '其他' },
]

const statusConfig: Record<LeaveRequestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock3 }> = {
  PENDING: { label: '待审批', variant: 'secondary', icon: Clock3 },
  APPROVED: { label: '已通过', variant: 'default', icon: CheckCircle },
  REJECTED: { label: '已驳回', variant: 'destructive', icon: XCircle },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(diffDays, 0.5)
}

export function LeaveRequest() {
  const [requests, setRequests] = useState<LeaveRequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<LeaveRequestStatus | 'ALL'>('ALL')

  // 表单数据
  const [formData, setFormData] = useState({
    type: '' as LeaveType,
    startDate: '',
    endDate: '',
    days: 0,
    reason: '',
  })

  // 获取请假列表
  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params: { status?: LeaveRequestStatus } = {}
      if (activeTab !== 'ALL') {
        params.status = activeTab
      }
      const response = await attendanceApi.getLeaveRequests(params)
      if (response.success) {
        setRequests(response.data.items)
      }
    } catch (error) {
      toast.error('获取请假列表失败')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // 计算天数
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = calculateDays(formData.startDate, formData.endDate)
      setFormData(prev => ({ ...prev, days }))
    }
  }, [formData.startDate, formData.endDate])

  // 提交申请
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.type || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('请填写完整信息')
      return
    }

    try {
      const response = await attendanceApi.createLeaveRequest({
        type: formData.type,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        days: formData.days,
        reason: formData.reason,
      })

      if (response.success) {
        toast.success('请假申请提交成功')
        setDialogOpen(false)
        setFormData({ type: '' as LeaveType, startDate: '', endDate: '', days: 0, reason: '' })
        fetchRequests()
      }
    } catch (error) {
      toast.error('提交失败')
    }
  }

  // 审批请假
  const handleApprove = async (id: string, approved: boolean) => {
    try {
      const response = await attendanceApi.approveLeaveRequest(id, {
        approved,
        rejectReason: approved ? undefined : '不符合规定',
      })

      if (response.success) {
        toast.success(approved ? '已通过申请' : '已驳回申请')
        fetchRequests()
      }
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const filteredRequests = activeTab === 'ALL'
    ? requests
    : requests.filter(r => r.status === activeTab)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaveRequestStatus | 'ALL')} className="w-auto">
          <TabsList>
            <TabsTrigger value="ALL">全部</TabsTrigger>
            <TabsTrigger value="PENDING">待审批</TabsTrigger>
            <TabsTrigger value="APPROVED">已通过</TabsTrigger>
            <TabsTrigger value="REJECTED">已驳回</TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建申请
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新建请假申请</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">请假类型</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as LeaveType })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="选择请假类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">开始日期</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">结束日期</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">请假天数</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.days}
                    readOnly
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">天</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">请假原因</label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="请说明请假原因..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">提交申请</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 请假列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            请假记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无请假记录
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request, index) => {
                const status = statusConfig[request.status]
                const StatusIcon = status.icon
                const leaveType = leaveTypes.find(t => t.value === request.type)

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {leaveType?.label || request.type}
                          </span>
                          <Badge variant={status.variant} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.startDate)} 至 {formatDate(request.endDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            共 {request.days} 天
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{request.reason}</p>

                        {request.approver && (
                          <div className="text-sm text-gray-500">
                            审批人: {request.approver.name} | {request.approvedAt && formatDate(request.approvedAt)}
                          </div>
                        )}

                        {request.rejectReason && (
                          <div className="text-sm text-red-600">
                            驳回原因: {request.rejectReason}
                          </div>
                        )}
                      </div>

                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(request.id, false)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            驳回
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id, true)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            通过
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default LeaveRequest
