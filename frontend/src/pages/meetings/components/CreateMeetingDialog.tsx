import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { meetingApi, type MeetingRoom } from '@/services/meetings';
import { usersApi } from '@/services/users';
import type { User } from '@/types';

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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadRooms();
      loadUsers();
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

  const loadUsers = async () => {
    try {
      const res = await usersApi.getUsers({ pageSize: 100 });
      if (res.success) {
        setUsers(res.data.items);
      }
    } catch {
      toast.error('加载用户列表失败');
    }
  };

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

  const toggleAttendee = (user: User) => {
    setSelectedAttendees((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const removeAttendee = (userId: string) => {
    setSelectedAttendees((prev) => prev.filter((u) => u.id !== userId));
  };

  const filteredUsers = users.filter(
    (u) =>
      !selectedAttendees.find((sa) => sa.id === u.id) &&
      (u.name.includes(userSearch) || u.email?.includes(userSearch))
  );

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
        attendees: selectedAttendees.map((u) => ({
          userId: u.id,
          name: u.name,
          email: u.email || '',
          status: 'PENDING' as const,
        })),
      });
      toast.success('会议创建成功');
      onSuccess();
      onClose();
      // 重置表单
      setTitle('');
      setDescription('');
      setRoomId('');
      setSelectedAttendees([]);
      setUserSearch('');
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

          {/* 参会人员选择 */}
          <div>
            <label className="text-sm font-medium mb-2 block">参会人员</label>

            {/* 已选择的参会者 */}
            {selectedAttendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedAttendees.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    {user.name}
                    <button
                      type="button"
                      onClick={() => removeAttendee(user.id)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* 用户搜索和选择 */}
            <Input
              placeholder="搜索用户姓名或邮箱..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="mb-2"
            />
            {userSearch && filteredUsers.length > 0 && (
              <div className="border rounded-md max-h-32 overflow-y-auto">
                {filteredUsers.slice(0, 5).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleAttendee(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    <span className="font-medium">{user.name}</span>
                    <span className="text-gray-500 ml-2">{user.email}</span>
                  </button>
                ))}
              </div>
            )}
            {userSearch && filteredUsers.length === 0 && (
              <p className="text-sm text-gray-500 px-3 py-2">未找到匹配的用户</p>
            )}
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
