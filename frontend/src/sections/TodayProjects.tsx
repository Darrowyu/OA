import { motion } from "framer-motion"
import { MoreHorizontal, MessageSquare, Link2, Plus, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface TodayProjectsProps { onOpenTask: () => void }

const priorityStyles: Record<string, string> = { low: "bg-gray-100 text-gray-600", medium: "bg-amber-100 text-amber-600", high: "bg-orange-100 text-orange-600", urgent: "bg-red-100 text-red-600" }
const priorityLabels: Record<string, string> = { low: "低", medium: "中", high: "高", urgent: "紧急" }
const progressColors: Record<string, string> = { low: "bg-gray-500", medium: "bg-amber-500", high: "bg-orange-500", urgent: "bg-emerald-500" }

const todayProjects = [
  { id: "1", name: "OA系统功能优化", description: "优化审批流程，提升用户体验", priority: "high" as const, progress: 70, assignees: ["张经理", "李总监"], comments: 12, links: 3 },
  { id: "2", name: "移动端适配开发", description: "完成后台管理系统的移动端响应式适配", priority: "urgent" as const, progress: 55, assignees: ["王工程师", "刘开发"], comments: 8, links: 2 },
]

export function TodayProjects({ onOpenTask }: TodayProjectsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">今日任务</h3>
        <div className="flex items-center gap-2">
          <Button
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm h-8"
            onClick={onOpenTask}
          >
            <Plus className="h-4 w-4 mr-1" />
            新建任务
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {todayProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.4 + index * 0.05 }}
            whileHover={{ boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
            className="p-4 rounded-xl border border-gray-100 cursor-pointer transition-shadow"
            onClick={onOpenTask}
          >
            {/* Project header */}
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </Button>
            </div>

            {/* Title and priority */}
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 ${priorityStyles[project.priority]}`}
              >
                {priorityLabels[project.priority]}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 mb-4 line-clamp-2">{project.description}</p>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">进度</span>
                <span className="text-gray-700">{project.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                  className={`h-full rounded-full ${progressColors[project.priority]}`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {project.assignees.map((name, idx) => (
                  <Avatar key={idx} className="w-7 h-7 border border-white">
                    <AvatarFallback className="text-[10px] bg-gray-200">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{project.comments}</span>
                <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />{project.links}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
