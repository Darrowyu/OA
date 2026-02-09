import { motion } from "framer-motion"
import { FileCheck, Receipt, Calendar, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"

const iconMap: Record<string, React.ElementType> = {
  FileCheck,
  Receipt,
  Calendar,
  Users,
}

const quickActions = [
  { id: "1", name: "发起审批", icon: "FileCheck", color: "bg-blue-100 text-blue-600", path: "/approval/new" },
  { id: "2", name: "提交报销", icon: "Receipt", color: "bg-green-100 text-green-600", path: "/approval/new?type=reimbursement" },
  { id: "3", name: "申请请假", icon: "Calendar", color: "bg-amber-100 text-amber-600", path: "/approval/new?type=leave" },
  { id: "4", name: "预约会议", icon: "Users", color: "bg-purple-100 text-purple-600", path: "/schedule" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {quickActions.map((action) => {
        const Icon = iconMap[action.icon] || FileCheck
        return (
          <motion.div
            key={action.id}
            variants={itemVariants}
            whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
            onClick={() => navigate(action.path)}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-gray-900">{action.name}</p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
