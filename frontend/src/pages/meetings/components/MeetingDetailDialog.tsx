import { useState, useEffect } from 'react';
import { Clock, Users, MapPin, FileText, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { meetingApi, type Meeting, getMeetingStatusText, getMeetingStatusColor, getAttendeeStatusText, getAttendeeStatusColor } from '@/services/meetings';
import { toast } from 'sonner';

interface MeetingDetailDialogProps {
  meetingId: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * 会议详情对话框组件
 */
export function MeetingDetailDialog({ meetingId, open, onClose }: MeetingDetailDialogProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && meetingId) {
      loadMeeting();
    }
  }, [open, meetingId]);

  const loadMeeting = async () => {
    if (!meetingId) return;
    setLoading(true);
    try {
      const res = await meetingApi.getMeetingById(meetingId);
      if (res.success) {
        setMeeting(res.data);
      }
    } catch {
      toast.error('加载会议详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <Badge className={getMeetingStatusColor(meeting.status)}>
                {getMeetingStatusText(meeting.status)}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <p className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                {new Date(meeting.startTime).toLocaleString()} - {new Date(meeting.endTime).toLocaleString()}
              </p>
              {meeting.room && (
                <p className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {meeting.room.name}（容纳{meeting.room.capacity}人）
                </p>
              )}
              <p className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                组织者: {meeting.organizer.name}
              </p>
            </div>

            {meeting.description && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2">会议描述</h4>
                <p className="text-sm text-gray-600">{meeting.description}</p>
              </div>
            )}

            {/* 参会人员列表 */}
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  参会人员（{meeting.attendees.length}人）
                </h4>
                <div className="space-y-2">
                  {meeting.attendees.map((attendee) => (
                    <div key={attendee.userId} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{attendee.name}</span>
                        {attendee.email && (
                          <span className="text-gray-500 ml-2">{attendee.email}</span>
                        )}
                      </div>
                      <Badge className={getAttendeeStatusColor(attendee.status)} variant="secondary">
                        {getAttendeeStatusText(attendee.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 会议纪要 */}
            {meeting.minutes && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  会议纪要
                </h4>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {meeting.minutes}
                </div>
              </div>
            )}

            {/* 附件列表 */}
            {meeting.attachments && meeting.attachments.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Paperclip className="h-4 w-4 mr-1" />
                  附件（{meeting.attachments.length}个）
                </h4>
                <div className="space-y-2">
                  {meeting.attachments.map((file, index) => (
                    <a
                      key={index}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Paperclip className="h-3 w-3 mr-1" />
                      {file.name}（{(file.size / 1024).toFixed(1)} KB）
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MeetingDetailDialog;
