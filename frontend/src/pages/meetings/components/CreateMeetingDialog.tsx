import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { meetingApi, type MeetingRoom } from '@/services/meetings';

interface CreateMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRoomId?: string;
}

/**
 * 创建会议对话框组件
 */
export function CreateMeetingDialog({ open, onClose, onSuccess, initialRoomId }: CreateMeetingDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadRooms();
      // 设置默认时间为下一个整点
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      const start = now.toISOString().slice(0, 16);
      setStartTime(start);

      const end = new Date(now);
      end.setHours(end.getHours() + 1);
      setEndTime(end.toISOString().slice(0, 16));

      if (initialRoomId) {
        setRoomId(initialRoomId);
      }
    }
  }, [open, initialRoomId]);

  const loadRooms = async () => {
    try {
      const res = await meetingApi.getAllRooms();
      if (res.success) {
        setRooms(res.data);
      }
    } catch {
      toast.error('加载会议室失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) {
      toast.error('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      await meetingApi.createMeeting({
        title,
        description,
        roomId: roomId || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      toast.success('会议创建成功');
      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
      setRoomId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建会议失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>创建会议</DialogTitle>
          <DialogDescription>填写会议信息，预定会议室</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">会议标题 *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入会议标题"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">会议描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入会议描述（可选）"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">会议室</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">不选择会议室（线上会议）</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}（容纳{room.capacity}人）
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">开始时间 *</label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">结束时间 *</label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '创建中...' : '创建会议'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateMeetingDialog;
