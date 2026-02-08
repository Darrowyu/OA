import { motion } from 'framer-motion';
import { MoreHorizontal, MessageSquare, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { upcomingMeetings } from '@/data/mockData';

export function UpcomingMeetings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">即将开始的会议</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      {/* Meetings */}
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
            <p className="text-xs text-gray-500 mb-3">
              {meeting.date} {meeting.time}
            </p>
            
            <div className="flex items-center justify-between">
              {/* Attendees */}
              <div className="flex -space-x-2">
                {meeting.attendees.map((user) => (
                  <Avatar key={user.id} className="w-6 h-6 border border-white">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {meeting.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {meeting.links}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
