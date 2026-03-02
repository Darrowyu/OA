import { Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PriorityIntervalSection from './PriorityIntervalSection';
import WorkdaySection from './WorkdaySection';
import SkipDateSection from './SkipDateSection';

// 提醒间隔配置
interface ReminderInterval {
  initialDelay: number;
  normalInterval: number;
  mediumInterval: number;
  urgentInterval: number;
}

// 邮件提醒设置
interface EmailSettingsData {
  urgent: ReminderInterval;
  medium: ReminderInterval;
  normal: ReminderInterval;
  workdayOnly: boolean;
  workdays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  skipDates: string[];
}

interface EmailSettingsProps {
  emailSettings: EmailSettingsData;
  isSaving: boolean;
  isLoading: boolean;
  onUpdateInterval: (
    priority: 'urgent' | 'medium' | 'normal',
    field: keyof ReminderInterval,
    value: number
  ) => void;
  onToggleWorkday: (day: number) => void;
  onUpdateSettings: (settings: Partial<EmailSettingsData>) => void;
  onSave: () => void;
}

export default function EmailSettings({
  emailSettings,
  isSaving,
  isLoading,
  onUpdateInterval,
  onToggleWorkday,
  onUpdateSettings,
  onSave,
}: EmailSettingsProps) {
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

          <PriorityIntervalSection
            priority="urgent"
            label="紧急"
            badgeVariant="destructive"
            interval={emailSettings.urgent}
            onUpdateInterval={onUpdateInterval}
          />

          <PriorityIntervalSection
            priority="medium"
            label="中等"
            badgeVariant="default"
            badgeClassName="bg-yellow-500"
            interval={emailSettings.medium}
            onUpdateInterval={onUpdateInterval}
          />

          <PriorityIntervalSection
            priority="normal"
            label="普通"
            badgeVariant="secondary"
            interval={emailSettings.normal}
            onUpdateInterval={onUpdateInterval}
          />
        </div>

        {/* 时间控制设置 */}
        <WorkdaySection
          workdayOnly={emailSettings.workdayOnly}
          workdays={emailSettings.workdays}
          workHoursStart={emailSettings.workHoursStart}
          workHoursEnd={emailSettings.workHoursEnd}
          onToggleWorkdayOnly={(value) => onUpdateSettings({ workdayOnly: value })}
          onToggleWorkday={onToggleWorkday}
          onUpdateWorkHours={(start, end) =>
            onUpdateSettings({ workHoursStart: start, workHoursEnd: end })
          }
        />

        {/* 自定义跳过日期 */}
        <SkipDateSection
          skipDates={emailSettings.skipDates}
          onUpdateSkipDates={(dates) => onUpdateSettings({ skipDates: dates })}
        />

        {/* 保存按钮 */}
        <Button onClick={onSave} disabled={isSaving || isLoading} className="w-full">
          {isSaving ? '保存中...' : '保存邮件设置'}
        </Button>
      </CardContent>
    </Card>
  );
}
