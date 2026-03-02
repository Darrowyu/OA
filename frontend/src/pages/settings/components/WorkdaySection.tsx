import { Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const weekdays = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

interface WorkdaySectionProps {
  workdayOnly: boolean;
  workdays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  onToggleWorkdayOnly: (value: boolean) => void;
  onToggleWorkday: (day: number) => void;
  onUpdateWorkHours: (start: string, end: string) => void;
}

export default function WorkdaySection({
  workdayOnly,
  workdays,
  workHoursStart,
  workHoursEnd,
  onToggleWorkdayOnly,
  onToggleWorkday,
  onUpdateWorkHours,
}: WorkdaySectionProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        时间控制设置
      </h3>

      <div className="flex items-center gap-2">
        <Checkbox
          id="workdayOnly"
          checked={workdayOnly}
          onCheckedChange={(checked) => onToggleWorkdayOnly(checked as boolean)}
        />
        <Label htmlFor="workdayOnly" className="text-sm cursor-pointer">
          仅在工作日和工作时间发送提醒
        </Label>
      </div>

      {workdayOnly && (
        <>
          {/* 工作日选择 */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">工作日</Label>
            <div className="flex flex-wrap gap-2">
              {weekdays.map((day) => (
                <button
                  key={day.value}
                  onClick={() => onToggleWorkday(day.value)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    workdays.includes(day.value)
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* 工作时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">开始时间</Label>
              <Input
                type="time"
                value={workHoursStart}
                onChange={(e) => onUpdateWorkHours(e.target.value, workHoursEnd)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">结束时间</Label>
              <Input
                type="time"
                value={workHoursEnd}
                onChange={(e) => onUpdateWorkHours(workHoursStart, e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
