import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]
const viewOptions = ["日视图", "周视图", "月视图"]

const activityMapData = [
  { id: "1", name: "产品评审", task: "新版APP需求评审", progress: 80, startTime: "09:30", duration: 90, color: "bg-emerald-500", assignees: ["张经理", "李总监"] },
  { id: "2", name: "开发冲刺", task: "Sprint 24 开发", progress: 65, startTime: "10:00", duration: 120, color: "bg-orange-500", assignees: ["王工程师", "刘开发"] },
  { id: "3", name: "UI设计", task: "后台管理界面设计", progress: 45, startTime: "13:00", duration: 90, color: "bg-purple-500", assignees: ["陈设计"] },
  { id: "4", name: "周例会", task: "技术部周会", progress: 0, startTime: "15:00", duration: 60, color: "bg-blue-500", assignees: ["赵主管"] },
]

// 计算位置（从 09:00 到 17:00）
const calcPosition = (startTime: string, duration: number) => {
  const [hours, minutes] = startTime.split(":").map(Number)
  const startMinutes = hours * 60 + minutes - 9 * 60 // 从09:00开始
  const totalMinutes = 8 * 60 // 8小时总宽度

  return {
    left: `${(startMinutes / totalMinutes) * 100}%`,
    width: `${(duration / totalMinutes) * 100}%`,
  }
}

export function ActivityMap() {
  const [activeView, setActiveView] = useState("日视图")

  // 缓存位置计算
  const positions = useMemo(() => {
    return activityMapData.map(a => calcPosition(a.startTime, a.duration))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">今日日程安排</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {viewOptions.map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeView === view ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative overflow-x-auto">
        {/* Time slots header */}
        <div className="flex justify-between text-xs text-gray-400 mb-4 px-[80px]">
          {timeSlots.map((time) => <span key={time}>{time}</span>)}
        </div>

        {/* Activity rows */}
        <div className="space-y-4">
          {activityMapData.map((activity, index) => (
            <div key={activity.id} className="flex items-center">
              <div className="w-[80px] flex-shrink-0">
                <p className="text-xs text-gray-500">{activity.name}</p>
              </div>

              <div className="flex-1 relative h-8 bg-gray-50 rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={positions[index]}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute h-6 top-1 rounded-full ${activity.color} flex items-center gap-2 px-2`}
                  style={positions[index]}
                >
                  {/* Avatars */}
                  <div className="flex -space-x-1">
                    {activity.assignees.map((name, idx) => (
                      <Avatar key={idx} className="w-4 h-4 border border-white">
                        <AvatarFallback className="text-[8px] bg-white/20 text-white">{name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>

                  <span className="text-[10px] text-white font-medium truncate">{activity.task}</span>
                  <span className="text-[10px] text-white/80 ml-auto">{activity.progress}%</span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        {/* Current time indicator (假设当前是 11:00) */}
        <div className="absolute top-6 bottom-0 w-px bg-gray-900" style={{ left: "calc(80px + 25%)" }}>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-900 rounded-full" />
        </div>
      </div>
    </motion.div>
  )
}
