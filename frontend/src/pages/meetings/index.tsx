import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Clock,
  Users,
  MapPin,
  MoreVertical,
  Search,
  Building2,
  X,
  Check,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { meetingApi, MeetingRoom, MeetingListItem, facilityIcons, facilityNames, getMeetingStatusText, getMeetingStatusColor, formatMeetingTime, formatDuration } from '@/services/meetings';
import { toast } from 'sonner';
import { RoomBooking } from './RoomBooking';
import { MeetingMinutes } from './MeetingMinutes';

// ==================== 会议室卡片组件 ====================

interface RoomCardProps {
  room: MeetingRoom;
  onBook: (room: MeetingRoom) => void;
}

function RoomCard({ room, onBook }: RoomCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => onBook(room)}>
      <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
        {room.image ? (
          <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-white/90">
            <Users className="h-3 w-3 mr-1" />
            {room.capacity}人
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{room.name}</h3>
        {room.location && (
          <p className="text-sm text-gray-500 flex items-center mb-2">
            <MapPin className="h-3 w-3 mr-1" />
            {room.location}
          </p>
        )}
        {room.facilities && room.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {room.facilities.slice(0, 4).map((facility) => (
              <span key={facility} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                {facilityIcons[facility] || '•'} {facilityNames[facility] || facility}
              </span>
            ))}
            {room.facilities.length > 4 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                +{room.facilities.length - 4}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 会议列表项组件 ====================

interface MeetingItemProps {
  meeting: MeetingListItem;
  onView: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}

function MeetingItem({ meeting, onView, onCancel, onComplete }: MeetingItemProps) {
  const isOrganizer = meeting.organizerId === JSON.parse(localStorage.getItem('user') || '{}').id;

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

// ==================== 创建会议对话框 ====================

interface CreateMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRoomId?: string;
}

function CreateMeetingDialog({ open, onClose, onSuccess, initialRoomId }: CreateMeetingDialogProps) {
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

// ==================== 会议详情对话框 ====================

interface MeetingDetailDialogProps {
  meetingId: string | null;
  open: boolean;
  onClose: () => void;
}

function MeetingDetailDialog({ meetingId, open, onClose }: MeetingDetailDialogProps) {
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
                {formatMeetingTime(meeting.startTime, meeting.endTime)}
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

// ==================== 主页面组件 ====================

export function MeetingsPage() {
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await meetingApi.getRooms({ pageSize: 100 });
      if (res.success) {
        setRooms(res.data.items);
      }
    } catch {
      toast.error('加载会议室失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeetings = useCallback(async (type: 'organized' | 'attending') => {
    setLoading(true);
    try {
      const res = await meetingApi.getMeetings({ type, pageSize: 50 });
      if (res.success) {
        setMeetings(res.data.items);
      }
    } catch {
      toast.error('加载会议列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    loadMeetings('organized');
  }, [loadRooms, loadMeetings]);

  const handleBookRoom = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setCreateDialogOpen(true);
  };

  const handleViewMeeting = (id: string) => {
    setSelectedMeetingId(id);
    setDetailDialogOpen(true);
  };

  const handleCancelMeeting = async (id: string) => {
    try {
      await meetingApi.cancelMeeting(id);
      toast.success('会议已取消');
      loadMeetings(activeTab === 'organized' ? 'organized' : 'attending');
    } catch {
      toast.error('取消会议失败');
    }
  };

  const handleCompleteMeeting = async (id: string) => {
    try {
      await meetingApi.completeMeeting(id);
      toast.success('会议已标记为完成');
      loadMeetings(activeTab === 'organized' ? 'organized' : 'attending');
    } catch {
      toast.error('操作失败');
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">会议管理</h1>
              <p className="text-gray-500 mt-1">会议室预订与会议管理</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建会议
            </Button>
          </div>

          {/* 标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border">
              <TabsTrigger value="rooms" className="data-[state=active]:bg-gray-100">
                <Building2 className="h-4 w-4 mr-2" />
                会议室
              </TabsTrigger>
              <TabsTrigger value="organized" className="data-[state=active]:bg-gray-100">
                <Calendar className="h-4 w-4 mr-2" />
                我组织的
              </TabsTrigger>
              <TabsTrigger value="attending" className="data-[state=active]:bg-gray-100">
                <Users className="h-4 w-4 mr-2" />
                我参与的
              </TabsTrigger>
            </TabsList>

            {/* 会议室列表 */}
            <TabsContent value="rooms" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索会议室..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {filteredRooms.map((room) => (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <RoomCard room={room} onBook={handleBookRoom} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!loading && filteredRooms.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无会议室</p>
                </div>
              )}
            </TabsContent>

            {/* 我组织的会议 */}
            <TabsContent value="organized" className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {meetings.map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onView={handleViewMeeting}
                        onCancel={handleCancelMeeting}
                        onComplete={handleCompleteMeeting}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!loading && meetings.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无会议</p>
                  <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    创建会议
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* 我参与的会议 */}
            <TabsContent value="attending" className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {meetings.map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onView={handleViewMeeting}
                        onCancel={() => {}}
                        onComplete={() => {}}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!loading && meetings.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无参与的会议</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* 创建会议对话框 */}
      <CreateMeetingDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setSelectedRoom(null);
        }}
        onSuccess={() => {
          loadMeetings('organized');
          loadRooms();
        }}
        initialRoomId={selectedRoom?.id}
      />

      {/* 会议详情对话框 */}
      <MeetingDetailDialog
        meetingId={selectedMeetingId}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedMeetingId(null);
        }}
      />
    </>
  );
}

// ==================== 路由导出 ====================

export function MeetingsModule() {
  return (
    <Routes>
      <Route path="/" element={<MeetingsPage />} />
      <Route path="/booking" element={<RoomBooking />} />
      <Route path="/minutes/:id" element={<MeetingMinutes />} />
    </Routes>
  );
}

export default MeetingsModule;
