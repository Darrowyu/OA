import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types';

// 12项评估内容
const evaluationItems = [
  { id: 1, content: '开发案源由评估', department: 'business', standard: '符合市场需求或公司策略' },
  { id: 2, content: '产品性质及规格评估', department: 'business', standard: '产品规格明确且可执行' },
  { id: 3, content: '模具开发及试产时程评估', department: 'production', standard: '时程合理可达成' },
  { id: 4, content: '生产设备评估', department: 'production', standard: '设备满足生产需求' },
  { id: 5, content: '检测设备及方法评估', department: 'quality', standard: '检测方法可行' },
  { id: 6, content: '产品质量标准评估', department: 'quality', standard: '质量目标可达' },
  { id: 7, content: '产品功能及结构评估', department: 'rd', standard: '设计技术可行' },
  { id: 8, content: '材料选用评估', department: 'rd', standard: '材料符合要求' },
  { id: 9, content: '环保要求评估', department: 'factory', standard: '符合环保法规' },
  { id: 10, content: '安全规范评估', department: 'factory', standard: '符合安全标准' },
  { id: 11, content: '开发费用评估', department: 'business', standard: '费用预算合理' },
  { id: 12, content: '预估获利评估', department: 'business', standard: '投资报酬率达标' },
];

const departmentMap: Record<string, string> = {
  business: '业务部',
  production: '生管部',
  quality: '品管部',
  rd: '研发部',
  factory: '厂务部',
};

export interface FeasibilityData {
  projectName: string;
  customerName: string;
  productModel: string;
  evaluationResults: Record<number, 'feasible' | 'not_feasible' | ''>;
  conclusion: string;
  generalManagerId: string;
}

interface FeasibilityFormProps {
  users: User[];
  onSubmit: (data: FeasibilityData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function FeasibilityForm({ users, onSubmit, onCancel, loading }: FeasibilityFormProps) {
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productModel, setProductModel] = useState('');
  const [evaluationResults, setEvaluationResults] = useState<Record<number, 'feasible' | 'not_feasible' | ''>>({});
  const [conclusion, setConclusion] = useState('');
  const [generalManagerId, setGeneralManagerId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!projectName.trim()) newErrors.projectName = '请输入项目名称';
    if (!customerName.trim()) newErrors.customerName = '请输入客户名称';
    if (!productModel.trim()) newErrors.productModel = '请输入产品型号';

    // 检查12项是否都评估了
    const incompleteItems = evaluationItems.filter(item => !evaluationResults[item.id]);
    if (incompleteItems.length > 0) {
      newErrors.evaluation = `还有 ${incompleteItems.length} 项未评估`;
    }

    if (!conclusion.trim()) newErrors.conclusion = '请输入评估结论';
    if (!generalManagerId) newErrors.generalManager = '请选择厂务总经理';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      projectName: projectName.trim(),
      customerName: customerName.trim(),
      productModel: productModel.trim(),
      evaluationResults,
      conclusion: conclusion.trim(),
      generalManagerId,
    });
  };

  const handleEvaluationChange = (itemId: number, value: 'feasible' | 'not_feasible') => {
    setEvaluationResults(prev => ({ ...prev, [itemId]: value }));
    if (errors.evaluation) setErrors(p => ({ ...p, evaluation: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 项目基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <Label>产品型号 *</Label>
          <Input
            value={productModel}
            onChange={(e) => { setProductModel(e.target.value); setErrors(p => ({ ...p, productModel: '' })); }}
            placeholder="请输入产品型号"
            className={errors.productModel ? 'border-red-500' : ''}
          />
          {errors.productModel && <p className="text-sm text-red-500 mt-1">{errors.productModel}</p>}
        </div>
      </div>

      {/* 12项评估内容 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-semibold">可行性评估项目（12项）</Label>
          <span className="text-sm text-gray-500">
            已评估 {Object.values(evaluationResults).filter(v => v).length} / 12 项
          </span>
        </div>
        {errors.evaluation && <p className="text-sm text-red-500 mb-2">{errors.evaluation}</p>}

        <div className="space-y-3">
          {evaluationItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.id}. {item.content}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {departmentMap[item.department]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">评估标准：{item.standard}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEvaluationChange(item.id, 'feasible')}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      evaluationResults[item.id] === 'feasible'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    可行
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEvaluationChange(item.id, 'not_feasible')}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      evaluationResults[item.id] === 'not_feasible'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    不可行
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 评估结论 + 厂务总经理 */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <Label>综合评估结论 *</Label>
          <Textarea
            value={conclusion}
            onChange={(e) => { setConclusion(e.target.value); setErrors(p => ({ ...p, conclusion: '' })); }}
            placeholder="请填写综合评估结论..."
            rows={4}
            className={errors.conclusion ? 'border-red-500' : ''}
          />
          {errors.conclusion && <p className="text-sm text-red-500 mt-1">{errors.conclusion}</p>}
        </div>

        <div>
          <Label>厂务总经理审核 *</Label>
          <Select
            value={generalManagerId}
            onValueChange={(v) => { setGeneralManagerId(v); setErrors(p => ({ ...p, generalManager: '' })); }}
            disabled={users.length === 0}
          >
            <SelectTrigger className={errors.generalManager ? 'border-red-500' : ''}>
              <SelectValue placeholder={users.length === 0 ? '暂无可用用户' : '请选择厂务总经理'} />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} {user.department && `(${user.department})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.generalManager && <p className="text-sm text-red-500 mt-1">{errors.generalManager}</p>}
          {users.length === 0 && (
            <p className="text-sm text-amber-600 mt-1">系统中没有可用用户，请联系管理员</p>
          )}
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          取消
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '提交中...' : '提交评估表'}
        </Button>
      </div>
    </form>
  );
}
