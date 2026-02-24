import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types';

const projectSourceOptions = [
  '因市场需求趋势而提出开发',
  '因本公司产品策略而主动提出开发',
  '因客户需求而提出开发',
  '因本公司上级决策而提出开发',
  '因客户对现有产品进行改善开发',
  '因本公司内部产品改善建议而提出开发',
];

const projectContentFields = [
  { key: 'nature', label: '新产品性质介绍', placeholder: '材质、规格、包装方式等' },
  { key: 'successProbability', label: '开发成功可能性预估', placeholder: '客户接受之可能性' },
  { key: 'competition', label: '同类型产品竞争情况', placeholder: '是否有同类型的新产品竞争' },
  { key: 'developmentCost', label: '开发费用预估', placeholder: '新产品开发费用的预估' },
  { key: 'productionCost', label: '生产成本预估', placeholder: '新产品开发成本的预估' },
  { key: 'compliance', label: '法令规定符合性', placeholder: 'NIOSH/CE/CNS/JIS/LL等' },
  { key: 'profitForecast', label: '获利情况预估', placeholder: '新产品开发成功量产后本公司的获利情况预估' },
];

export interface ProductDevelopmentData {
  projectName: string;
  customerName: string;
  projectSources: string[];
  projectContent: Record<string, string>;
  reviewerId: string;
  proposerId: string;
}

interface ProductDevelopmentFormProps {
  users: User[];
  onSubmit: (data: ProductDevelopmentData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ProductDevelopmentForm({ users, onSubmit, onCancel, loading }: ProductDevelopmentFormProps) {
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [projectContent, setProjectContent] = useState<Record<string, string>>({});
  const [reviewerId, setReviewerId] = useState('');
  const [proposerId, setProposerId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!projectName.trim()) newErrors.projectName = '请输入项目名称';
    if (!customerName.trim()) newErrors.customerName = '请输入客户名称';
    if (selectedSources.length === 0) newErrors.sources = '请至少选择一个开发源由';
    if (!reviewerId) newErrors.reviewer = '请选择项目审核人';
    if (!proposerId) newErrors.proposer = '请选择项目申请人';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      projectName: projectName.trim(),
      customerName: customerName.trim(),
      projectSources: selectedSources,
      projectContent,
      reviewerId,
      proposerId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>项目名称 *</Label>
          <Input
            value={projectName}
            onChange={(e) => { setProjectName(e.target.value); setErrors(p => ({ ...p, projectName: '' })); }}
            placeholder="请输入项目名称"
            className={errors.projectName ? 'border-red-500' : ''}
          />
          {errors.projectName && <p className="text-sm text-red-500 mt-1">{errors.projectName}</p>}
        </div>
        <div>
          <Label>客户名称 *</Label>
          <Input
            value={customerName}
            onChange={(e) => { setCustomerName(e.target.value); setErrors(p => ({ ...p, customerName: '' })); }}
            placeholder="请输入客户名称"
            className={errors.customerName ? 'border-red-500' : ''}
          />
          {errors.customerName && <p className="text-sm text-red-500 mt-1">{errors.customerName}</p>}
        </div>
      </div>

      <div>
        <Label>开发源由 * {selectedSources.length > 0 && <span className="text-sm text-gray-400">(已选择{selectedSources.length}项)</span>}</Label>
        <div className={`mt-2 border rounded-lg p-4 space-y-2 ${errors.sources ? 'border-red-500' : 'border-gray-200'}`}>
          {projectSourceOptions.map((source) => (
            <div key={source} className="flex items-center">
              <Checkbox
                id={`source-${source}`}
                checked={selectedSources.includes(source)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedSources([...selectedSources, source]);
                  } else {
                    setSelectedSources(selectedSources.filter((s) => s !== source));
                  }
                  setErrors(p => ({ ...p, sources: '' }));
                }}
              />
              <label htmlFor={`source-${source}`} className="ml-2 text-sm cursor-pointer">{source}</label>
            </div>
          ))}
        </div>
        {errors.sources && <p className="text-sm text-red-500 mt-1">{errors.sources}</p>}
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-semibold">项目内容（7个维度）</Label>
        <div className="mt-4 space-y-4">
          {projectContentFields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="text-sm text-gray-600">{label}</Label>
              <Textarea
                value={projectContent[key] || ''}
                onChange={(e) => setProjectContent(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={3}
                className="mt-1"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>项目审核人 *</Label>
          <Select value={reviewerId} onValueChange={(v) => { setReviewerId(v); setErrors(p => ({ ...p, reviewer: '' })); }}>
            <SelectTrigger className={errors.reviewer ? 'border-red-500' : ''}>
              <SelectValue placeholder="请选择审核人" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} {user.department && `(${user.department})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.reviewer && <p className="text-sm text-red-500 mt-1">{errors.reviewer}</p>}
        </div>
        <div>
          <Label>项目申请人 *</Label>
          <Select value={proposerId} onValueChange={(v) => { setProposerId(v); setErrors(p => ({ ...p, proposer: '' })); }}>
            <SelectTrigger className={errors.proposer ? 'border-red-500' : ''}>
              <SelectValue placeholder="请选择申请人" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} {user.department && `(${user.department})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.proposer && <p className="text-sm text-red-500 mt-1">{errors.proposer}</p>}
        </div>
      </div>

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
