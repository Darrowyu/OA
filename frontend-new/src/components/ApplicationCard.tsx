import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Application, ApplicationStatus, Priority } from "@/types"
import { formatDate } from "@/lib/utils"
import { Calendar, User, DollarSign, Flag } from "lucide-react"

interface ApplicationCardProps {
  application: Application
}

// 状态映射配置
const statusConfig: Record<ApplicationStatus, { label: string; variant: "yellow" | "blue" | "purple" | "orange" | "green" | "red" | "gray" }> = {
  [ApplicationStatus.DRAFT]: { label: "草稿", variant: "gray" },
  [ApplicationStatus.PENDING_FACTORY]: { label: "待厂长审核", variant: "yellow" },
  [ApplicationStatus.PENDING_DIRECTOR]: { label: "待总监审批", variant: "blue" },
  [ApplicationStatus.PENDING_MANAGER]: { label: "待经理审批", variant: "purple" },
  [ApplicationStatus.PENDING_CEO]: { label: "待CEO审批", variant: "orange" },
  [ApplicationStatus.APPROVED]: { label: "已通过", variant: "green" },
  [ApplicationStatus.REJECTED]: { label: "已拒绝", variant: "red" },
  [ApplicationStatus.ARCHIVED]: { label: "已归档", variant: "gray" },
}

// 优先级映射配置
const priorityConfig: Record<Priority, { label: string; color: string }> = {
  [Priority.LOW]: { label: "低", color: "text-gray-500" },
  [Priority.NORMAL]: { label: "普通", color: "text-blue-500" },
  [Priority.HIGH]: { label: "高", color: "text-orange-500" },
  [Priority.URGENT]: { label: "紧急", color: "text-red-500" },
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  const navigate = useNavigate()
  const status = statusConfig[application.status]
  const priority = priorityConfig[application.priority]

  const handleClick = () => {
    navigate(`/applications/${application.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate pr-4">
            {application.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{application.applicationNo}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
        {application.content}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>{application.submitterName}</span>
        </div>

        {application.amount !== null && application.amount > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>¥{application.amount.toLocaleString()}</span>
          </div>
        )}

        <div className={`flex items-center gap-1 ${priority.color}`}>
          <Flag className="h-4 w-4" />
          <span>{priority.label}优先级</span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(application.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
