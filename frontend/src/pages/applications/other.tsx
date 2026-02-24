import * as React from "react"
import { useNavigate } from "react-router-dom"
import { OtherApplicationForm } from "@/components/OtherApplicationForm"
import { FlowInfoTooltip } from "@/components/FlowInfoTooltip"
import { Button } from "@/components/ui/button"
import { CreateApplicationRequest } from "@/types"
import { applicationsApi } from "@/services/applications"
import { ArrowLeft, FilePlus } from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

export function OtherApplicationNew() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (data: CreateApplicationRequest) => {
    setSubmitting(true)
    try {
      await applicationsApi.createApplication(data)
      toast.success("申请创建成功")
      navigate("/approval")
    } catch (error) {
      logger.error("创建申请失败", { error })
      toast.error("创建申请失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 页面标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/approval/new")}
            className="rounded-xl hover:bg-gray-500 hover:text-white text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">新建其他申请</h1>
            {/* 使用通用流程提示，因为目标级别在表单中选择 */}
            <FlowInfoTooltip type="other" targetLevel="DIRECTOR" />
          </div>
        </div>
      </div>

      {/* 副标题 */}
      <p className="text-sm text-gray-500 mb-6">
        特殊业务申请，可选择直接提交给总监或CEO审批
      </p>

      {/* 表单卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <FilePlus className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">填写其他申请信息</h2>
              <p className="text-sm text-gray-500">请完整填写以下信息</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <OtherApplicationForm
            onSubmit={handleSubmit}
            onCancel={() => navigate("/approval/new")}
            loading={submitting}
          />
        </div>
      </div>
    </div>
  )
}
