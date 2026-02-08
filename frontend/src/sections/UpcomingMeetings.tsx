import { motion } from "framer-motion"
import { MoreHorizontal, MessageSquare, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const upcomingMeetings = [
  { id: "1", title: "产品需求评审会", date: "今天", time: "14:00", attendees: ["张经理", "李总监", "王设计师"], comments: 8, links: 2 },
  { id: "2", title: "月度总结会议", date: "明天", time: "09:30", attendees: ["陈经理", "刘工程师"], comments: 3, links: 1 },
]

export function UpcomingMeetings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">即将开始的会议</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      <div className="space-y-4">
        {upcomingMeetings.map((meeting, index) => (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.35 + index * 0.05 }}
            className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
          >
            <h4 className="text-sm font-medium text-gray-900 mb-1">{meeting.title}</h4>
            <p className="text-xs text-gray-500 mb-3">{meeting.date} {meeting.time}</p>

            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {meeting.attendees.map((name, idx) => (
                  <Avatar key={idx} className="w-6 h-6 border border-white">
                    <AvatarFallback className="text-[10px] bg-gray-200">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />{meeting.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />{meeting.links}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
