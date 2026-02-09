import { motion } from 'framer-motion';
import { Clock, Users, MapPin, Calendar, FileText, Check, X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type MeetingListItem,
  getMeetingStatusText,
  getMeetingStatusColor,
  formatMeetingTime,
  formatDuration
} from '@/services/meetings';

interface MeetingItemProps {
  meeting: MeetingListItem;
  onView: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}

/**
 * 会议列表项组件
 */
export function MeetingItem({ meeting, onView, onCancel, onComplete }: MeetingItemProps) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOrganizer = meeting.organizerId === user.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0" onClick={() => onView(meeting.id)}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{meeting.title}</h3>
            <Badge className={getMeetingStatusColor(meeting.status)}>
              {getMeetingStatusText(meeting.status)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {formatMeetingTime(meeting.startTime, meeting.endTime)}
            </span>
            {meeting.room && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {meeting.room.name}
              </span>
            )}
            <span className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {meeting.attendees?.length || 0}人
            </span>
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              时长 {formatDuration(meeting.startTime, meeting.endTime)}
            </span>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            组织者: {meeting.organizer.name}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(meeting.id)}>
              <FileText className="h-4 w-4 mr-2" />
              查看详情
            </DropdownMenuItem>
            {meeting.status === 'SCHEDULED' && isOrganizer && (
              <>
                <DropdownMenuItem onClick={() => onComplete(meeting.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  标记完成
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCancel(meeting.id)} className="text-red-600">
                  <X className="h-4 w-4 mr-2" />
                  取消会议
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export default MeetingItem;
