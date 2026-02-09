import { motion } from "framer-motion"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
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

const stats = [
  { key: "totalProjects", title: "进行中项目", value: 24, label: "较上月 +12%" },
  { key: "totalTasks", title: "待办任务", value: 156, label: "较上月 +5%" },
  { key: "inProgress", title: "审批中", value: 18, label: "较上月 +8%" },
  { key: "completed", title: "本月已完成", value: 89, label: "较上月 +23%" },
]

export function StatsCards() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.key}
          variants={itemVariants}
          whileHover={{ boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-gray-500">{stat.title}</p>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2">
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
