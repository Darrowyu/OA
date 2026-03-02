import { useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface SkipDateSectionProps {
  skipDates: string[];
  onUpdateSkipDates: (dates: string[]) => void;
}

export default function SkipDateSection({
  skipDates,
  onUpdateSkipDates,
}: SkipDateSectionProps) {
  const [newSkipDate, setNewSkipDate] = useState('');
  const [skipDateRangeStart, setSkipDateRangeStart] = useState('');
  const [skipDateRangeEnd, setSkipDateRangeEnd] = useState('');

  // 添加单个跳过日期
  const addSkipDate = () => {
    if (!newSkipDate) return;
    if (skipDates.includes(newSkipDate)) return;
    onUpdateSkipDates([...skipDates, newSkipDate].sort());
    setNewSkipDate('');
  };

  // 批量添加日期范围
  const addSkipDateRange = () => {
    if (!skipDateRangeStart || !skipDateRangeEnd) return;
    if (skipDateRangeStart > skipDateRangeEnd) return;

    const start = new Date(skipDateRangeStart);
    const end = new Date(skipDateRangeEnd);
    const newDates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!skipDates.includes(dateStr)) {
        newDates.push(dateStr);
      }
    }

    onUpdateSkipDates([...skipDates, ...newDates].sort());
    setSkipDateRangeStart('');
    setSkipDateRangeEnd('');
  };

  // 删除跳过日期
  const removeSkipDate = (date: string) => {
    onUpdateSkipDates(skipDates.filter((d) => d !== date));
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        自定义跳过日期
      </h3>

      {/* 单个日期添加 */}
      <div className="flex gap-2">
        <Input
          type="date"
          value={newSkipDate}
          onChange={(e) => setNewSkipDate(e.target.value)}
          className="flex-1"
        />
        <Button onClick={addSkipDate} variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* 日期范围批量添加 */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs text-gray-500">开始日期</Label>
          <Input
            type="date"
            value={skipDateRangeStart}
            onChange={(e) => setSkipDateRangeStart(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-gray-500">结束日期</Label>
          <Input
            type="date"
            value={skipDateRangeEnd}
            onChange={(e) => setSkipDateRangeEnd(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={addSkipDateRange} variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* 已添加日期列表 */}
      {skipDates.length > 0 && (
        <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {skipDates.map((date) => (
              <Badge
                key={date}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {date}
                <button
                  onClick={() => removeSkipDate(date)}
                  className="ml-1 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
