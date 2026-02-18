import { useNavigate } from "react-router-dom"
import { Application, ApplicationStatus, Priority } from "@/types"
import { formatDate } from "@/lib/utils"
import { Calendar, User, DollarSign, Flag, ArrowRight } from "lucide-react"

interface ApplicationCardProps {
  application: Application
}

// 状态映射配置
const statusConfig: Record<ApplicationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string; bgColor: string }> = {
  [ApplicationStatus.DRAFT]: {
    label: "草稿",
    variant: "secondary",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  [ApplicationStatus.PENDING_FACTORY]: {
    label: "待厂长审核",
    variant: "default",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  [ApplicationStatus.PENDING_DIRECTOR]: {
    label: "待总监审批",
    variant: "default",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  [ApplicationStatus.PENDING_MANAGER]: {
    label: "待经理审批",
    variant: "default",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  [ApplicationStatus.PENDING_CEO]: {
    label: "待CEO审批",
    variant: "default",
    color: "text-coral",
    bgColor: "bg-coral-light",
  },
  [ApplicationStatus.APPROVED]: {
    label: "已通过",
    variant: "default",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  [ApplicationStatus.REJECTED]: {
    label: "已拒绝",
    variant: "destructive",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  [ApplicationStatus.ARCHIVED]: {
    label: "已归档",
    variant: "secondary",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
}

// 优先级映射配置
const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string; iconColor: string }> = {
  [Priority.LOW]: {
    label: "低",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    iconColor: "text-gray-400",
  },
  [Priority.NORMAL]: {
    label: "普通",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-400",
  },
  [Priority.HIGH]: {
    label: "高",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-400",
  },
  [Priority.URGENT]: {
    label: "紧急",
    color: "text-red-600",
    bgColor: "bg-red-50",
    iconColor: "text-red-400",
  },
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const navigate = useNavigate()
  const status = statusConfig[application.status]
  const priority = priorityConfig[application.priority]

  const handleClick = () => {
    navigate(`/approval/${application.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="group bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-lg hover:border-coral/20 transition-all duration-300"
    >
      {/* 头部：标题和状态 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-coral transition-colors">
              {application.title}
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.bgColor} ${priority.color}`}>
              {priority.label}优先级
            </span>
          </div>
          <p className="text-sm text-gray-400 font-mono">{application.applicationNo}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-coral group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* 内容摘要 */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
        {application.content}
      </p>

      {/* 底部信息 */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
          <User className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm text-gray-600">{application.submitterName}</span>
        </div>

        {application.amount !== null && application.amount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              ¥{application.amount.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
          <Flag className={`h-3.5 w-3.5 ${priority.iconColor}`} />
          <span className={`text-sm ${priority.color}`}>{priority.label}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg ml-auto">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm text-gray-500">{formatDate(application.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
