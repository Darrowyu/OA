import { useState, useEffect } from 'react';
import { Clock, Users, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { meetingApi, type MeetingListItem, getMeetingStatusText, getMeetingStatusColor } from '@/services/meetings';
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
  const [meeting, setMeeting] = useState<MeetingListItem | null>(null);
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
          <div className="space-y-4">
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
                  {meeting.room.name}
                </p>
              )}
              <p className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                组织者: {meeting.organizer.name}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MeetingDetailDialog;
