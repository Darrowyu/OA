import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Lightbulb, ClipboardCheck, Plane, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const applicationTypes = [
  {
    id: 'standard',
    title: '标准申请',
    description: '一般业务申请、采购申请，支持多级审批流程（厂长→总监→经理→CEO）',
    icon: FileText,
    path: '/approval/new/standard',
    color: 'bg-blue-500',
  },
  {
    id: 'product-development',
    title: '新产品开发企划表',
    description: '新产品开发项目提案，独立PD编号，单级审批',
    icon: Lightbulb,
    path: '/approval/new/product-development',
    color: 'bg-amber-500',
  },
  {
    id: 'feasibility',
    title: '可行性评估表',
    description: '5个部门并行审批的评估表（业务/生管/品管/研发/厂务）',
    icon: ClipboardCheck,
    path: '/approval/new/feasibility',
    color: 'bg-emerald-500',
  },
  {
    id: 'business-trip',
    title: '出差申请单',
    description: '简化流程，仅需主管审批，无金额和附件要求',
    icon: Plane,
    path: '/approval/new/business-trip',
    color: 'bg-purple-500',
  },
  {
    id: 'other',
    title: '其他申请',
    description: '特殊业务申请，可选择直接提交给总监或CEO审批（不经过厂长）',
    icon: MoreHorizontal,
    path: '/approval/new/other',
    color: 'bg-gray-500',
  },
];

export function ApplicationTypeSelect() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/approval')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选择申请类型</h1>
          <p className="text-sm text-gray-500 mt-1">请选择您要创建的申请类型</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {applicationTypes.map((type) => (
          <Card
            key={type.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 border-transparent hover:border-coral"
            onClick={() => navigate(type.path)}
          >
            <CardHeader className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 ${type.color} rounded-xl text-white shadow-md`}>
                  <type.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{type.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {type.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
