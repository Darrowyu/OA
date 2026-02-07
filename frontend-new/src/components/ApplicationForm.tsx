import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect as Select, SelectOption } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CreateApplicationRequest, Priority, User } from "@/types"

interface ApplicationFormProps {
  users: User[]
  onSubmit: (data: CreateApplicationRequest) => void
  onCancel: () => void
  loading?: boolean
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  users,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = React.useState<CreateApplicationRequest>({
    title: "",
    content: "",
    amount: undefined,
    priority: Priority.NORMAL,
    factoryManagerIds: [],
    managerIds: [],
    skipManager: false,
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 优先级选项
  const priorityOptions: SelectOption[] = [
    { value: Priority.LOW, label: "低" },
    { value: Priority.NORMAL, label: "普通" },
    { value: Priority.HIGH, label: "高" },
    { value: Priority.URGENT, label: "紧急" },
  ]

  // 厂长选项
  const factoryManagerOptions: SelectOption[] = users
    .filter((u) => u.role === "FACTORY_MANAGER")
    .map((u) => ({ value: u.id, label: `${u.name} (${u.department})` }))

  // 经理选项
  const managerOptions: SelectOption[] = users
    .filter((u) => u.role === "MANAGER")
    .map((u) => ({ value: u.id, label: `${u.name} (${u.department})` }))

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "请输入申请标题"
    }
    if (!formData.content.trim()) {
      newErrors.content = "请输入申请内容"
    }
    if (formData.factoryManagerIds.length === 0) {
      newErrors.factoryManagerIds = "请选择至少一位厂长"
    }
    if (!formData.skipManager && formData.managerIds.length === 0) {
      newErrors.managerIds = "请选择至少一位经理，或勾选跳过经理审批"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  const handleChange = (field: keyof CreateApplicationRequest, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="申请标题"
        placeholder="请输入申请标题"
        value={formData.title}
        onChange={(e) => handleChange("title", e.target.value)}
        error={errors.title}
        required
      />

      <Textarea
        label="申请内容"
        placeholder="请详细描述您的申请内容..."
        value={formData.content}
        onChange={(e) => handleChange("content", e.target.value)}
        error={errors.content}
        required
        rows={4}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="申请金额"
          type="number"
          placeholder="请输入金额（可选）"
          value={formData.amount || ""}
          onChange={(e) => handleChange("amount", e.target.value ? parseFloat(e.target.value) : undefined)}
        />

        <Select
          label="优先级"
          options={priorityOptions}
          value={formData.priority}
          onChange={(e) => handleChange("priority", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          厂长审批人<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          multiple
          className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={formData.factoryManagerIds}
          onChange={(e) => {
            const options = Array.from(e.target.selectedOptions)
            const values = options.map((o) => o.value)
            handleChange("factoryManagerIds", values)
          }}
        >
          {factoryManagerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.factoryManagerIds && (
          <p className="text-sm text-red-500">{errors.factoryManagerIds}</p>
        )}
        <p className="text-xs text-gray-500">按住 Ctrl 键可多选</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="skipManager"
          checked={formData.skipManager}
          onChange={(e) => handleChange("skipManager", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="skipManager" className="text-sm text-gray-700">
          跳过经理审批（直接提交给CEO）
        </label>
      </div>

      {!formData.skipManager && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            经理审批人<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            multiple
            className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={formData.managerIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions)
              const values = options.map((o) => o.value)
              handleChange("managerIds", values)
            }}
          >
            {managerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.managerIds && <p className="text-sm text-red-500">{errors.managerIds}</p>}
          <p className="text-xs text-gray-500">按住 Ctrl 键可多选</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "提交中..." : "提交申请"}
        </Button>
      </div>
    </form>
  )
}
