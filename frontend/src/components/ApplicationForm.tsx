import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect as Select } from "@/components/ui/select"
import { FileUpload } from "./FileUpload"
import { CreateApplicationRequest, User, Priority, ApplicationType } from "@/types"
import { UploadResponse } from "@/services/uploads"
import { Upload } from "lucide-react"

interface ApplicationFormProps {
  factoryManagers: User[]
  onSubmit: (data: CreateApplicationRequest) => void
  onCancel: () => void
  loading?: boolean
}

// 优先级选项
const priorityOptions = [
  { value: Priority.LOW, label: "普通" },
  { value: Priority.NORMAL, label: "中等" },
  { value: Priority.HIGH, label: "高" },
  { value: Priority.URGENT, label: "紧急" },
]


export function ApplicationForm({
  factoryManagers,
  onSubmit,
  onCancel,
  loading = false,
}: ApplicationFormProps) {
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [amount, setAmount] = React.useState<string>("")
  const [priority, setPriority] = React.useState<Priority>(Priority.NORMAL)
  const [selectedFactoryManagers, setSelectedFactoryManagers] = React.useState<string[]>([])
  const [attachments, setAttachments] = React.useState<UploadResponse[]>([])
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 表单验证
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = "请输入申请标题"
    } else if (title.length > 200) {
      newErrors.title = "标题不能超过200个字符"
    }

    if (!content.trim()) {
      newErrors.content = "请输入申请内容"
    } else if (content.length > 5000) {
      newErrors.content = "内容不能超过5000个字符"
    }

    if (amount && isNaN(Number(amount))) {
      newErrors.amount = "请输入有效的金额"
    } else if (amount && Number(amount) < 0) {
      newErrors.amount = "金额不能为负数"
    }

    if (selectedFactoryManagers.length === 0) {
      newErrors.factoryManagers = "请至少选择一位审批厂长"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const data: CreateApplicationRequest = {
      title: title.trim(),
      content: content.trim(),
      priority,
      type: ApplicationType.STANDARD,
      factoryManagerIds: selectedFactoryManagers,
      attachmentIds: attachments.map((att) => att.id),
    }

    // 如果有金额，添加到请求中
    if (amount && Number(amount) > 0) {
      data.amount = Number(amount)
    }

    onSubmit(data)
  }

  // 处理厂长选择
  const handleFactoryManagerToggle = (managerId: string) => {
    setSelectedFactoryManagers((prev) =>
      prev.includes(managerId)
        ? prev.filter((id) => id !== managerId)
        : [...prev, managerId]
    )
    if (errors.factoryManagers) {
      setErrors((prev) => ({ ...prev, factoryManagers: "" }))
    }
  }

  // 处理文件上传完成
  const handleUploadComplete = (uploadedFiles: UploadResponse[]) => {
    setAttachments((prev) => [...prev, ...uploadedFiles])
  }

  // 删除附件
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 标题 */}
      <div>
        <Label htmlFor="title">
          申请标题 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (errors.title) setErrors((prev) => ({ ...prev, title: "" }))
          }}
          placeholder="请输入申请标题"
          className={errors.title ? "border-red-500" : ""}
          disabled={loading}
        />
        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
      </div>

      {/* 内容 */}
      <div>
        <Label htmlFor="content">
          申请内容 <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            if (errors.content) setErrors((prev) => ({ ...prev, content: "" }))
          }}
          placeholder="请详细描述您的申请内容..."
          rows={5}
          className={errors.content ? "border-red-500" : ""}
          disabled={loading}
        />
        {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content}</p>}
        <p className="text-xs text-gray-500 mt-1">{content.length}/5000</p>
      </div>

      {/* 金额 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">申请金额（可选）</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }))
            }}
            placeholder="请输入金额"
            className={errors.amount ? "border-red-500" : ""}
            disabled={loading}
            min={0}
            step="0.01"
          />
          {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
        </div>
      </div>

      {/* 优先级 */}
      <div>
        <Label htmlFor="priority">优先级</Label>
        <Select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          disabled={loading}
          options={priorityOptions}
        />
      </div>

      {/* 审批厂长选择 */}
      <div>
        <Label>
          选择审批厂长 <span className="text-red-500">*</span>
        </Label>
        <div className={`mt-2 border rounded-lg p-4 ${errors.factoryManagers ? "border-red-500" : "border-gray-200"}`}>
          {factoryManagers.length === 0 ? (
            <p className="text-sm text-gray-500">暂无可用厂长</p>
          ) : (
            <div className="space-y-2">
              {factoryManagers.map((manager) => (
                <div key={manager.id} className="flex items-center">
                  <Checkbox
                    id={`factory-${manager.id}`}
                    checked={selectedFactoryManagers.includes(manager.id)}
                    onCheckedChange={() => handleFactoryManagerToggle(manager.id)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={`factory-${manager.id}`}
                    className="ml-2 text-sm text-gray-700 cursor-pointer"
                  >
                    {manager.name} ({manager.department || "无部门"})
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
        {errors.factoryManagers && (
          <p className="text-sm text-red-500 mt-1">{errors.factoryManagers}</p>
        )}
      </div>

      {/* 附件上传 */}
      <div>
        <Label>附件</Label>
        <div className="mt-2">
          <FileUpload onUploadComplete={handleUploadComplete} disabled={loading} />
        </div>
        {attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {attachments.map((file, index) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">
                    {file.originalName}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAttachment(index)}
                  disabled={loading}
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          取消
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "提交中..." : "提交申请"}
        </Button>
      </div>
    </form>
  )
}
