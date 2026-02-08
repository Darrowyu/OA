import { motion } from "framer-motion"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const teamMembers = [
  { id: "1", name: "李总监", role: "技术总监" },
  { id: "2", name: "王设计师", role: "UI设计师" },
  { id: "3", name: "陈经理", role: "项目经理" },
  { id: "4", name: "刘工程师", role: "前端开发" },
]

export function TeamList() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">部门成员</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      <div className="space-y-3">
        {teamMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
              <p className="text-xs text-gray-500 truncate">{member.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
