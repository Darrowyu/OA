import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  MapPin,
  AlertCircle,
  Check,
  X,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Header } from '@/components/Header';
import { meetingApi, MeetingRoom, RoomBooking as RoomBookingType, facilityIcons, facilityNames } from '@/services/meetings';
import { toast } from 'sonner';

// 时间槽配置
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

// 获取日历天数
function getCalendarDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: Date[] = [];

  // 上个月的最后几天
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // 当月的天数
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // 下个月的前几天，补齐到6行（42天）
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// 格式化日期
function formatDateCN(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export function RoomBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');

  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<RoomBookingType[]>([]);
  const [loading, setLoading] = useState(false);

  // 预订表单状态
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 加载会议室列表
  const loadRooms = useCallback(async () => {
    try {
      const res = await meetingApi.getAllRooms();
      if (res.data.success) {
        setRooms(res.data.data);
        if (roomId) {
          const room = res.data.data.find(r => r.id === roomId);
          if (room) setSelectedRoom(room);
        }
      }
    } catch {
      toast.error('加载会议室失败');
    }
  }, [roomId]);

  // 加载预订情况
  const loadBookings = useCallback(async () => {
    if (!selectedRoom || !selectedDate) return;

    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await meetingApi.getRoomBookings(selectedRoom.id, dateStr);
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch {
      toast.error('加载预订情况失败');
    } finally {
      setLoading(false);
    }
  }, [selectedRoom, selectedDate]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // 检查时间槽是否被占用
  const isTimeSlotOccupied = (time: string): boolean => {
    if (!selectedDate) return false;

    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date(selectedDate);
    slotTime.setHours(hours, minutes, 0, 0);

    return bookings.some(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return slotTime >= bookingStart && slotTime < bookingEnd;
    });
  };

  // 获取时间槽的预订信息
  const getBookingAtTime = (time: string): RoomBookingType | null => {
    if (!selectedDate) return null;

    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date(selectedDate);
    slotTime.setHours(hours, minutes, 0, 0);

    return bookings.find(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return slotTime >= bookingStart && slotTime < bookingEnd;
    }) || null;
  };

  // 处理时间选择
  const handleTimeSelect = (time: string) => {
    if (!selectedDate || isTimeSlotOccupied(time)) return;

    if (!startTime || (startTime && endTime)) {
      // 开始新选择
      setStartTime(time);
      setEndTime('');
    } else {
      // 设置结束时间
      const startIndex = TIME_SLOTS.indexOf(startTime);
      const endIndex = TIME_SLOTS.indexOf(time);

      if (endIndex <= startIndex) {
        toast.error('结束时间必须晚于开始时间');
        return;
      }

      // 检查时间段内是否有冲突
      for (let i = startIndex + 1; i <= endIndex; i++) {
        if (isTimeSlotOccupied(TIME_SLOTS[i])) {
          toast.error('所选时间段与已有预订冲突');
          return;
        }
      }

      setEndTime(time);
      setBookingDialogOpen(true);
    }
  };

  // 提交预订
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !selectedDate || !startTime || !endTime || !title) {
      toast.error('请填写完整信息');
      return;
    }

    setSubmitting(true);
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      await meetingApi.createMeeting({
        title,
        description,
        roomId: selectedRoom.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      toast.success('预订成功');
      setBookingDialogOpen(false);
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      loadBookings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '预订失败');
    } finally {
      setSubmitting(false);
    }
  };

  const calendarDays = getCalendarDays(currentDate);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={() => navigate('/meetings')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">会议室预订</h1>
              <p className="text-gray-500 mt-1">选择日期和时间段预订会议室</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：会议室选择和日历 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 会议室选择 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    选择会议室
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => {
                          setSelectedRoom(room);
                          setSelectedDate(null);
                          setBookings([]);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedRoom?.id === room.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{room.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <Users className="h-3 w-3 inline mr-1" />
                          {room.capacity}人
                        </div>
                        {room.facilities && room.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {room.facilities.slice(0, 3).map(f => (
                              <span key={f} className="text-xs">
                                {facilityIcons[f] || '•'}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 日历 */}
              {selectedRoom && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        选择日期
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[100px] text-center">
                          {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 星期标题 */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* 日期网格 */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => {
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedDate(day)}
                            className={`
                              aspect-square p-2 rounded-lg text-sm transition-all
                              ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                              ${isSelected ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}
                              ${isToday && !isSelected ? 'border border-gray-900' : ''}
                            `}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右侧：时间段选择 */}
            <div>
              {selectedRoom && selectedDate ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        选择时间段
                      </div>
                      <p className="text-sm font-normal text-gray-500 mt-1">
                        {formatDateCN(selectedDate)}
                      </p>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">加载中...</div>
                    ) : (
                      <>
                        {/* 图例 */}
                        <div className="flex items-center gap-4 mb-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-gray-100 border" />
                            <span>可选</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-red-100" />
                            <span>已占用</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-gray-900" />
                            <span>已选择</span>
                          </div>
                        </div>

                        {/* 时间段网格 */}
                        <div className="grid grid-cols-3 gap-2">
                          {TIME_SLOTS.map((time) => {
                            const occupied = isTimeSlotOccupied(time);
                            const isSelected = time === startTime || time === endTime;
                            const isInRange = startTime && endTime &&
                              TIME_SLOTS.indexOf(time) > TIME_SLOTS.indexOf(startTime) &&
                              TIME_SLOTS.indexOf(time) < TIME_SLOTS.indexOf(endTime);

                            return (
                              <button
                                key={time}
                                disabled={occupied}
                                onClick={() => handleTimeSelect(time)}
                                className={`
                                  py-2 px-3 rounded-lg text-sm font-medium transition-all
                                  ${occupied
                                    ? 'bg-red-50 text-red-400 cursor-not-allowed'
                                    : isSelected || isInRange
                                      ? 'bg-gray-900 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }
                                `}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>

                        {/* 已预订显示 */}
                        {bookings.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="text-sm font-medium mb-3">已预订时段</h4>
                            <div className="space-y-2">
                              {bookings.map((booking) => (
                                <div
                                  key={booking.id}
                                  className="p-2 bg-red-50 rounded-lg text-sm"
                                >
                                  <div className="font-medium text-red-800">{booking.title}</div>
                                  <div className="text-red-600 text-xs mt-1">
                                    {new Date(booking.startTime).toLocaleTimeString('zh-CN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })} - {new Date(booking.endTime).toLocaleTimeString('zh-CN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                  <div className="text-red-500 text-xs">
                                    预订人: {booking.organizer.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 选择提示 */}
                        {startTime && !endTime && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                            <p className="text-sm text-blue-700">
                              已选择开始时间 {startTime}，请选择结束时间
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>请先选择会议室和日期</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 预订确认对话框 */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认预订</DialogTitle>
            <DialogDescription>
              预订 {selectedRoom?.name} - {formatDateCN(selectedDate!)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <span className="font-medium">时间：</span>
                {startTime} - {endTime}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">会议室：</span>
                {selectedRoom?.name}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                会议标题 <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入会议标题"
                required
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBookingDialogOpen(false);
                  setStartTime('');
                  setEndTime('');
                }}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting || !title}>
                {submitting ? '预订中...' : '确认预订'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RoomBooking;
