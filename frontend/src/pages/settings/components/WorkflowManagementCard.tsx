import { useNavigate } from 'react-router-dom';
import { GitBranch, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WorkflowManagementCard() {
  const navigate = useNavigate();

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate('/workflow')}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-emerald-600" />
            <CardTitle>工作流管理</CardTitle>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
        <CardDescription>配置审批流程和工作流规则</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-emerald-50 rounded-lg p-4">
          <p className="text-sm text-emerald-700">
            点击进入工作流管理页面，设计和配置审批流程，设置各阶段的审批规则。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
