import { useEffect } from 'react';
import { Mail, Clock, Calendar, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEmailSettings } from '../hooks/useEmailSettings';

const weekdays = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export function EmailModule() {
  const {
    emailSettings,
    newSkipDate,
    skipDateRangeStart,
    skipDateRangeEnd,
    isSaving,
    isLoading,
    setNewSkipDate,
    setSkipDateRangeStart,
    setSkipDateRangeEnd,
    loadSettings,
    saveSettings,
    updateInterval,
    toggleWorkday,
    addSkipDate,
    addSkipDateRange,
    removeSkipDate,
    setWorkdayOnly,
    setWorkHours,
  } = useEmailSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <CardTitle>邮件提醒设置</CardTitle>
        </div>
        <CardDescription>配置申请审批的邮件提醒策略</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 按优先级设置 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            提醒间隔设置（小时）
          </h3>

          {/* 紧急申请 */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">紧急</Badge>
              <span className="text-sm text-gray-600">申请提醒间隔</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">初始延迟</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.urgent.initialDelay}
                  onChange={(e) => updateInterval('urgent', 'initialDelay', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">正常间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.urgent.normalInterval}
                  onChange={(e) => updateInterval('urgent', 'normalInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">中期间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.urgent.mediumInterval}
                  onChange={(e) => updateInterval('urgent', 'mediumInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">紧急间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.urgent.urgentInterval}
                  onChange={(e) => updateInterval('urgent', 'urgentInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* 中等申请 */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-yellow-500">中等</Badge>
              <span className="text-sm text-gray-600">申请提醒间隔</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">初始延迟</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.medium.initialDelay}
                  onChange={(e) => updateInterval('medium', 'initialDelay', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">正常间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.medium.normalInterval}
                  onChange={(e) => updateInterval('medium', 'normalInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">中期间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.medium.mediumInterval}
                  onChange={(e) => updateInterval('medium', 'mediumInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">紧急间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.medium.urgentInterval}
                  onChange={(e) => updateInterval('medium', 'urgentInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* 普通申请 */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">普通</Badge>
              <span className="text-sm text-gray-600">申请提醒间隔</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">初始延迟</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.normal.initialDelay}
                  onChange={(e) => updateInterval('normal', 'initialDelay', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">正常间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.normal.normalInterval}
                  onChange={(e) => updateInterval('normal', 'normalInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">中期间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.normal.mediumInterval}
                  onChange={(e) => updateInterval('normal', 'mediumInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">紧急间隔</Label>
                <Input
                  type="number"
                  min={1}
                  value={emailSettings.normal.urgentInterval}
                  onChange={(e) => updateInterval('normal', 'urgentInterval', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 时间控制设置 */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            时间控制设置
          </h3>

          <div className="flex items-center gap-2">
            <Checkbox
              id="workdayOnly"
              checked={emailSettings.workdayOnly}
              onCheckedChange={(checked) => setWorkdayOnly(checked as boolean)}
            />
            <Label htmlFor="workdayOnly" className="text-sm cursor-pointer">
              仅在工作日和工作时间发送提醒
            </Label>
          </div>

          {emailSettings.workdayOnly && (
            <>
              {/* 工作日选择 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">工作日</Label>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleWorkday(day.value)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        emailSettings.workdays.includes(day.value)
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
                    value={emailSettings.workHoursStart}
                    onChange={(e) => setWorkHours('workHoursStart', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">结束时间</Label>
                  <Input
                    type="time"
                    value={emailSettings.workHoursEnd}
                    onChange={(e) => setWorkHours('workHoursEnd', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 自定义跳过日期 */}
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
          {emailSettings.skipDates.length > 0 && (
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {emailSettings.skipDates.map((date) => (
                  <Badge
                    key={date}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    {date}
                    <button onClick={() => removeSkipDate(date)} className="ml-1 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 保存按钮 */}
        <Button onClick={saveSettings} disabled={isSaving || isLoading} className="w-full">
          {isSaving ? '保存中...' : '保存邮件设置'}
        </Button>
      </CardContent>
    </Card>
  );
}
