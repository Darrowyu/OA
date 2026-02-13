import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CalendarView } from '@/components/CalendarView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Calendar as CalendarIcon, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  calendarApi,
  CalendarEvent,
  CalendarEventType,
  CreateEventRequest,
  getEventTypeName,
  getEventTypeColor,
} from '@/services/calendar';
import type { CalendarView as CalendarViewType } from '@/components/CalendarView';

// 日程表单组件
interface EventFormProps {
  event?: CalendarEvent;
  initialDate?: Date;
  onSubmit: (data: CreateEventRequest) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function EventForm({
  event,
  initialDate,
  onSubmit,
  onCancel,
  onDelete,
}: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [type, setType] = useState<CalendarEventType>(event?.type ?? CalendarEventType.MEETING);
  const [startDate, setStartDate] = useState<Date | undefined>(
    event ? new Date(event.startTime) : initialDate ?? new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    event ? new Date(event.endTime) : initialDate ? new Date(initialDate.getTime() + 60 * 60 * 1000) : new Date(Date.now() + 60 * 60 * 1000)
  );
  const [location, setLocation] = useState(event?.location ?? '');
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [isPrivate, setIsPrivate] = useState(event?.isPrivate ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入标题');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('请选择开始和结束时间');
      return;
    }
    if (endDate <= startDate) {
      toast.error('结束时间必须晚于开始时间');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      location: location.trim() || undefined,
      type,
      isAllDay,
      isPrivate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">标题 *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入日程标题"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">类型</Label>
        <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CalendarEventType).map((t) => (
              <SelectItem key={t} value={t}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getEventTypeColor(t) }}
                  />
                  {getEventTypeName(t)}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>开始时间</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'yyyy-MM-dd HH:mm') : '选择时间'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                />
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={startDate ? format(startDate, 'HH:mm') : ''}
                    onChange={(e) => {
                      if (startDate && e.target.value) {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = new Date(startDate);
                        newDate.setHours(hours, minutes);
                        setStartDate(newDate);
                      }
                    }}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>结束时间</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'yyyy-MM-dd HH:mm') : '选择时间'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                />
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={endDate ? format(endDate, 'HH:mm') : ''}
                    onChange={(e) => {
                      if (endDate && e.target.value) {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = new Date(endDate);
                        newDate.setHours(hours, minutes);
                        setEndDate(newDate);
                      }
                    }}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">地点</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="输入地点"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="输入日程描述"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allDay"
            checked={isAllDay}
            onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
          />
          <Label htmlFor="allDay" className="font-normal">全天事件</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="private"
            checked={isPrivate}
            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
          />
          <Label htmlFor="private" className="font-normal">私有</Label>
        </div>
      </div>

      <DialogFooter className="gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">{event ? '更新' : '创建'}</Button>
      </DialogFooter>
    </form>
  );
};

// 日程统计卡片
function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}

// 主页面
function SchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('month');
  const [, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | undefined>();

  // 获取日期范围
  const getDateRange = useCallback(() => {
    let start: Date;
    let end: Date;

    if (view === 'month') {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    } else if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = new Date(currentDate.setHours(0, 0, 0, 0));
      end = new Date(currentDate.setHours(23, 59, 59, 999));
    }

    return { start, end };
  }, [view, currentDate]);

  // 加载日程数据
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      const response = await calendarApi.getEvents({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        includePrivate: true,
      });

      if (response.success) {
        setEvents(response.data);
      }
    } catch (error) {
      toast.error('加载日程失败');
    } finally {
      setIsLoading(false);
    }
  }, [getDateRange]);

  // 初始加载和日期/视图变化时重新加载
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 创建日程
  const handleCreateEvent = async (data: CreateEventRequest) => {
    try {
      const response = await calendarApi.createEvent(data);
      if (response.success) {
        toast.success('日程创建成功');
        setIsCreateDialogOpen(false);
        loadEvents();
      }
    } catch (error) {
      toast.error('创建日程失败');
    }
  };

  // 更新日程
  const handleUpdateEvent = async (data: CreateEventRequest) => {
    if (!selectedEvent) return;
    try {
      const response = await calendarApi.updateEvent(selectedEvent.id, data);
      if (response.success) {
        toast.success('日程更新成功');
        setIsEditDialogOpen(false);
        setSelectedEvent(undefined);
        loadEvents();
      }
    } catch (error) {
      toast.error('更新日程失败');
    }
  };

  // 删除日程
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      const response = await calendarApi.deleteEvent(selectedEvent.id);
      if (response.success) {
        toast.success('日程删除成功');
        setIsEditDialogOpen(false);
        setSelectedEvent(undefined);
        loadEvents();
      }
    } catch (error) {
      toast.error('删除日程失败');
    }
  };

  // 点击事件
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  }, []);

  // 点击时间槽
  const handleSlotClick = useCallback((date: Date) => {
    setSelectedSlotDate(date);
    setIsCreateDialogOpen(true);
  }, []);

  // 统计
  const stats = {
    total: events.length,
    meetings: events.filter((e) => e.type === CalendarEventType.MEETING).length,
    tasks: events.filter((e) => e.type === CalendarEventType.TASK).length,
    reminders: events.filter((e) => e.type === CalendarEventType.REMINDER).length,
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />
      <main className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">日程管理</h1>
          <p className="text-gray-500 mt-1">管理您的个人和团队日程安排</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="总日程" value={stats.total} color="#374151" />
          <StatCard
            title="会议"
            value={stats.meetings}
            color={getEventTypeColor(CalendarEventType.MEETING)}
          />
          <StatCard
            title="任务"
            value={stats.tasks}
            color={getEventTypeColor(CalendarEventType.TASK)}
          />
          <StatCard
            title="提醒"
            value={stats.reminders}
            color={getEventTypeColor(CalendarEventType.REMINDER)}
          />
        </div>

        {/* 操作栏 */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={() => {
            setSelectedSlotDate(new Date());
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            新建日程
          </Button>

          {/* 图例 */}
          <div className="flex items-center gap-4">
            {Object.values(CalendarEventType).map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getEventTypeColor(type) }}
                />
                <span className="text-sm text-gray-600">
                  {getEventTypeName(type)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 日历视图 */}
        <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-400px)]">
          <CalendarView
            events={events}
            view={view}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewChange={setView}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* 创建日程对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>新建日程</DialogTitle>
              <DialogDescription>
                创建一个新的日程安排
              </DialogDescription>
            </DialogHeader>
            <EventForm
              initialDate={selectedSlotDate}
              onSubmit={handleCreateEvent}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* 编辑日程对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>编辑日程</DialogTitle>
              <DialogDescription>
                修改日程信息
              </DialogDescription>
            </DialogHeader>
            <EventForm
              event={selectedEvent}
              onSubmit={handleUpdateEvent}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedEvent(undefined);
              }}
              onDelete={handleDeleteEvent}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

// 团队日程子页面
function TeamSchedulePage() {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-900">团队日程</h2>
      <p className="text-gray-500 mt-2">团队日程功能开发中...</p>
    </div>
  );
}

// 会议邀请子页面
function InvitationsPage() {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-900">会议邀请</h2>
      <p className="text-gray-500 mt-2">会议邀请功能开发中...</p>
    </div>
  );
}

// 主页面（带子路由）
function SchedulePageWithRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SchedulePage />} />
      <Route path="/team" element={<TeamSchedulePage />} />
      <Route path="/invitations" element={<InvitationsPage />} />
    </Routes>
  );
}

export default SchedulePageWithRoutes;
