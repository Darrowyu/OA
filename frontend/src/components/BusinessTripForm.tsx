import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types';

export interface BusinessTripData {
  applicantName: string;
  department: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  supervisorId: string;
}

interface BusinessTripFormProps {
  users: User[];
  currentUser: User | null;
  onSubmit: (data: BusinessTripData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BusinessTripForm({ users, currentUser, onSubmit, onCancel, loading }: BusinessTripFormProps) {
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!applicantName.trim()) newErrors.applicantName = '请输入出差人员';
    if (!department.trim()) newErrors.department = '请输入所属部门';
    if (!destination.trim()) newErrors.destination = '请输入出差目的地';
    if (!startDate) newErrors.startDate = '请选择开始日期';
    if (!endDate) newErrors.endDate = '请选择结束日期';
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.dateRange = '结束日期不能早于开始日期';
    }
    if (!purpose.trim()) newErrors.purpose = '请输入出差事由';
    if (!supervisorId) newErrors.supervisor = '请选择主管审批人';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      applicantName: applicantName.trim(),
      department: department.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      purpose: purpose.trim(),
      supervisorId,
    });
  };

  // 过滤出主管级别用户
  const supervisors = users.filter(u =>
    ['FACTORY_MANAGER', 'DIRECTOR', 'MANAGER', 'CEO'].includes(u.role)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 出差人员信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>出差人员 *</Label>
          <Input
            value={applicantName}
            onChange={(e) => { setApplicantName(e.target.value); setErrors(p => ({ ...p, applicantName: '' })); }}
            placeholder="请输入出差人员姓名"
            className={errors.applicantName ? 'border-red-500' : ''}
          />
          {errors.applicantName && <p className="text-sm text-red-500 mt-1">{errors.applicantName}</p>}
        </div>
        <div>
          <Label>所属部门 *</Label>
          <Input
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setErrors(p => ({ ...p, department: '' })); }}
            placeholder="请输入所属部门"
            className={errors.department ? 'border-red-500' : ''}
          />
          {errors.department && <p className="text-sm text-red-500 mt-1">{errors.department}</p>}
        </div>
      </div>

      {/* 出差目的地 */}
      <div>
        <Label>出差目的地 *</Label>
        <Input
          value={destination}
          onChange={(e) => { setDestination(e.target.value); setErrors(p => ({ ...p, destination: '' })); }}
          placeholder="请输入出差目的地"
          className={errors.destination ? 'border-red-500' : ''}
        />
        {errors.destination && <p className="text-sm text-red-500 mt-1">{errors.destination}</p>}
      </div>

      {/* 出差日期 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>开始日期 *</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setErrors(p => ({ ...p, startDate: '', dateRange: '' })); }}
            className={errors.startDate || errors.dateRange ? 'border-red-500' : ''}
          />
          {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <Label>结束日期 *</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setErrors(p => ({ ...p, endDate: '', dateRange: '' })); }}
            className={errors.endDate || errors.dateRange ? 'border-red-500' : ''}
          />
          {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
        </div>
      </div>
      {errors.dateRange && <p className="text-sm text-red-500 -mt-4">{errors.dateRange}</p>}

      {/* 出差事由 */}
      <div>
        <Label>出差事由 *</Label>
        <Textarea
          value={purpose}
          onChange={(e) => { setPurpose(e.target.value); setErrors(p => ({ ...p, purpose: '' })); }}
          placeholder="请详细描述出差事由..."
          rows={4}
          className={errors.purpose ? 'border-red-500' : ''}
        />
        {errors.purpose && <p className="text-sm text-red-500 mt-1">{errors.purpose}</p>}
      </div>

      {/* 主管审批人 */}
      <div>
        <Label>主管审批人 *</Label>
        <Select
          value={supervisorId}
          onValueChange={(v) => { setSupervisorId(v); setErrors(p => ({ ...p, supervisor: '' })); }}
          disabled={supervisors.length === 0}
        >
          <SelectTrigger className={errors.supervisor ? 'border-red-500' : ''}>
            <SelectValue placeholder={supervisors.length === 0 ? '暂无可用主管' : '请选择主管审批人'} />
          </SelectTrigger>
          <SelectContent>
            {supervisors.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.department || '无部门'} - {user.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.supervisor && <p className="text-sm text-red-500 mt-1">{errors.supervisor}</p>}
        {supervisors.length === 0 && (
          <p className="text-sm text-amber-600 mt-1">系统中没有设置主管角色用户，请联系管理员</p>
        )}
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium">出差申请说明：</p>
        <ul className="list-disc list-inside mt-1 space-y-1 text-blue-600">
          <li>出差申请只需主管一级审批即可</li>
          <li>不涉及金额填写</li>
          <li>无需上传附件</li>
          <li>创建后不可编辑，如需修改请删除后重新创建</li>
        </ul>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          取消
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '提交中...' : '提交申请'}
        </Button>
      </div>
    </form>
  );
}
