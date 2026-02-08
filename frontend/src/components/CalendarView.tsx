import React, { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isToday,
  getHours,
  setHours,
  setMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { CalendarEvent } from '@/services/calendar';
import { getEventTypeColor } from '@/services/calendar';

export type CalendarView = 'day' | 'week' | 'month';

interface CalendarViewProps {
  events: CalendarEvent[];
  view: CalendarView;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
  className?: string;
}

// 获取一周的天数
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 小时标签
const hours = Array.from({ length: 24 }, (_, i) => i);

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  view,
  currentDate,
  onDateChange,
  onViewChange,
  onEventClick,
  onSlotClick,
  className,
}) => {
  // 导航到上一个/下一个
  const navigatePrevious = useCallback(() => {
    if (view === 'month') {
      onDateChange(subMonths(currentDate, 1));
    } else if (view === 'week') {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subDays(currentDate, 1));
    }
  }, [view, currentDate, onDateChange]);

  const navigateNext = useCallback(() => {
    if (view === 'month') {
      onDateChange(addMonths(currentDate, 1));
    } else if (view === 'week') {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  }, [view, currentDate, onDateChange]);

  const navigateToToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  // 获取标题文本
  const titleText = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'yyyy年 M月', { locale: zhCN });
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'M月d日')} - ${format(weekEnd, 'M月d日')}`;
    } else {
      return format(currentDate, 'yyyy年 M月d日', { locale: zhCN });
    }
  }, [view, currentDate]);

  // 月视图数据
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // 周视图数据
  const weekDaysList = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // 获取某天的所有事件
  const getEventsForDay = useCallback(
    (day: Date) => {
      return events.filter((event) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        return eventStart < dayEnd && eventEnd > dayStart;
      });
    },
    [events]
  );

  // 获取某天某小时的事件
  const getEventsForHour = useCallback(
    (day: Date, hour: number) => {
      return events.filter((event) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const hourStart = setMinutes(setHours(day, hour), 0);
        const hourEnd = setMinutes(setHours(day, hour + 1), 0);
        return eventStart < hourEnd && eventEnd > hourStart;
      });
    },
    [events]
  );

  // 处理日期点击
  const handleDayClick = useCallback(
    (day: Date) => {
      onSlotClick(day);
    },
    [onSlotClick]
  );

  // 处理事件点击（阻止冒泡）
  const handleEventClick = useCallback(
    (e: React.MouseEvent, event: CalendarEvent) => {
      e.stopPropagation();
      onEventClick(event);
    },
    [onEventClick]
  );

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg border', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToToday}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-4">{titleText}</h2>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={view === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('day')}
          >
            日
          </Button>
          <Button
            variant={view === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            周
          </Button>
          <Button
            variant={view === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            月
          </Button>
        </div>
      </div>

      {/* 日历内容 */}
      <div className="flex-1 overflow-auto">
        {view === 'month' && (
          <div className="h-full flex flex-col">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-sm font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* 日期网格 */}
            <div className="grid grid-cols-7 flex-1">
              {monthDays.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[100px] p-2 border-b border-r cursor-pointer hover:bg-gray-50 transition-colors',
                      !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
                      index % 7 === 6 && 'border-r-0',
                      isTodayDate && 'bg-blue-50/30'
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <div
                      className={cn(
                        'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                        isTodayDate
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-700'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: `${getEventTypeColor(event.type)}20`,
                            borderLeft: `3px solid ${getEventTypeColor(event.type)}`,
                          }}
                          onClick={(e) => handleEventClick(e, event)}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{dayEvents.length - 3} 更多
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="h-full flex flex-col min-w-[800px]">
            {/* 星期标题 */}
            <div className="grid grid-cols-8 border-b">
              <div className="py-2 text-center text-sm text-gray-500"></div>
              {weekDaysList.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'py-2 text-center text-sm',
                    isToday(day) ? 'bg-blue-50' : ''
                  )}
                >
                  <div className="font-medium text-gray-700">
                    {weekDays[day.getDay()]}
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full mt-1',
                      isToday(day)
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
            {/* 时间网格 */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-8">
                {/* 时间标签列 */}
                <div className="border-r">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b text-xs text-gray-400 text-right pr-2 pt-1"
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>
                {/* 天列 */}
                {weekDaysList.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'border-r last:border-r-0',
                      isToday(day) ? 'bg-blue-50/30' : ''
                    )}
                  >
                    {hours.map((hour) => {
                      const hourEvents = getEventsForHour(day, hour);
                      return (
                        <div
                          key={hour}
                          className="h-16 border-b hover:bg-gray-50 cursor-pointer relative"
                          onClick={() =>
                            onSlotClick(setHours(day, hour))
                          }
                        >
                          {hourEvents.map((event) => (
                            <div
                              key={event.id}
                              className="absolute inset-x-1 top-0.5 bottom-0.5 text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 overflow-hidden"
                              style={{
                                backgroundColor: `${getEventTypeColor(event.type)}20`,
                                borderLeft: `3px solid ${getEventTypeColor(event.type)}`,
                              }}
                              onClick={(e) => handleEventClick(e, event)}
                            >
                              <div className="font-medium truncate">
                                {event.title}
                              </div>
                              <div className="text-gray-500 text-[10px]">
                                {format(new Date(event.startTime), 'HH:mm')}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'day' && (
          <div className="h-full flex flex-col">
            {/* 标题 */}
            <div className="py-2 text-center border-b">
              <div className="text-sm text-gray-500">
                {weekDays[currentDate.getDay()]}
              </div>
              <div
                className={cn(
                  'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-medium mt-1',
                  isToday(currentDate)
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700'
                )}
              >
                {format(currentDate, 'd')}
              </div>
            </div>
            {/* 时间线 */}
            <div className="flex-1 overflow-auto">
              {hours.map((hour) => {
                const hourEvents = getEventsForHour(currentDate, hour);
                return (
                  <div
                    key={hour}
                    className="flex border-b hover:bg-gray-50"
                  >
                    <div className="w-16 py-2 text-xs text-gray-400 text-right pr-4 border-r">
                      {hour}:00
                    </div>
                    <div
                      className="flex-1 h-20 relative cursor-pointer"
                      onClick={() => onSlotClick(setHours(currentDate, hour))}
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="absolute inset-x-2 top-1 bottom-1 text-sm px-3 py-2 rounded cursor-pointer hover:opacity-80 overflow-hidden"
                          style={{
                            backgroundColor: `${getEventTypeColor(event.type)}20`,
                            borderLeft: `3px solid ${getEventTypeColor(event.type)}`,
                          }}
                          onClick={(e) => handleEventClick(e, event)}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-gray-500 text-xs">
                            {format(new Date(event.startTime), 'HH:mm')} -{' '}
                            {format(new Date(event.endTime), 'HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
