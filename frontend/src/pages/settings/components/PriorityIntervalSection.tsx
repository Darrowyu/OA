import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReminderInterval {
  initialDelay: number;
  normalInterval: number;
  mediumInterval: number;
  urgentInterval: number;
}

interface PriorityIntervalSectionProps {
  priority: 'urgent' | 'medium' | 'normal';
  label: string;
  badgeVariant: 'destructive' | 'default' | 'secondary';
  badgeClassName?: string;
  interval: ReminderInterval;
  onUpdateInterval: (
    priority: 'urgent' | 'medium' | 'normal',
    field: keyof ReminderInterval,
    value: number
  ) => void;
}

export default function PriorityIntervalSection({
  priority,
  label,
  badgeVariant,
  badgeClassName,
  interval,
  onUpdateInterval,
}: PriorityIntervalSectionProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant} className={badgeClassName}>
          {label}
        </Badge>
        <span className="text-sm text-gray-600">申请提醒间隔</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500">初始延迟</Label>
          <Input
            type="number"
            min={1}
            value={interval.initialDelay}
            onChange={(e) =>
              onUpdateInterval(priority, 'initialDelay', parseInt(e.target.value) || 1)
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">正常间隔</Label>
          <Input
            type="number"
            min={1}
            value={interval.normalInterval}
            onChange={(e) =>
              onUpdateInterval(priority, 'normalInterval', parseInt(e.target.value) || 1)
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">中期间隔</Label>
          <Input
            type="number"
            min={1}
            value={interval.mediumInterval}
            onChange={(e) =>
              onUpdateInterval(priority, 'mediumInterval', parseInt(e.target.value) || 1)
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">紧急间隔</Label>
          <Input
            type="number"
            min={1}
            value={interval.urgentInterval}
            onChange={(e) =>
              onUpdateInterval(priority, 'urgentInterval', parseInt(e.target.value) || 1)
            }
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
