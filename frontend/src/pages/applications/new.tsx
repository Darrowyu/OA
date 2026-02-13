import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ApplicationForm } from "@/components/ApplicationForm"
import { Button } from "@/components/ui/button"
import { CreateApplicationRequest, User } from "@/types"
import { applicationsApi } from "@/services/applications"
import { usersApi } from "@/services/users"
import { Loader2, ArrowLeft, FilePlus } from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

export function ApplicationNew() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = React.useState(false)
  const [factoryManagers, setFactoryManagers] = React.useState<User[]>([])
  const [managers, setManagers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadApprovers = async () => {
      try {
        const [factoryRes, managerRes] = await Promise.all([
          usersApi.getFactoryManagers(),
          usersApi.getManagers(),
        ])
        setFactoryManagers(factoryRes.data || [])
        setManagers(managerRes.data || [])
      } catch (error) {
        logger.error("加载审批人失败", { error })
        toast.error("加载审批人列表失败")
      } finally {
        setLoading(false)
      }
    }
    loadApprovers()
  }, [])

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
            onClick={() => navigate("/approval")}
            className="rounded-xl hover:bg-blue-500 hover:text-white text-blue-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">新建申请</h1>
            <p className="text-sm text-gray-500 mt-0.5">填写费用申请信息</p>
          </div>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-coral-light to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <FilePlus className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">填写申请信息</h2>
              <p className="text-sm text-gray-500">请完整填写以下信息</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-coral mb-3" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <ApplicationForm
              factoryManagers={factoryManagers}
              managers={managers}
              onSubmit={handleSubmit}
              onCancel={() => navigate("/approval")}
              loading={submitting}
            />
          )}
        </div>
      </div>
    </div>
  )
}
