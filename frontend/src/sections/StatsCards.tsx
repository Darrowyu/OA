import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { dashboardApi } from "@/services/dashboard"
import { DashboardStats } from "@/types/dashboard"

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

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardApi.getStats()
        if (response.success) {
          setStats(response.data)
        }
      } catch {
        // 静默处理错误，UI已显示空状态
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statItems = stats
    ? [
        { key: "totalProjects", title: "进行中项目", value: stats.totalProjects, label: `较上月 ${stats.trends.projects}` },
        { key: "totalTasks", title: "待办任务", value: stats.pendingTasks, label: `较上月 ${stats.trends.tasks}` },
        { key: "inProgress", title: "审批中", value: stats.inProgressApprovals, label: `较上月 ${stats.trends.approvals}` },
        { key: "completed", title: "本月已完成", value: stats.completedThisMonth, label: `较上月 ${stats.trends.completed}` },
      ]
    : [
        { key: "totalProjects", title: "进行中项目", value: 0, label: "较上月 --" },
        { key: "totalTasks", title: "待办任务", value: 0, label: "较上月 --" },
        { key: "inProgress", title: "审批中", value: 0, label: "较上月 --" },
        { key: "completed", title: "本月已完成", value: 0, label: "较上月 --" },
      ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-center h-28">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {statItems.map((stat) => (
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
