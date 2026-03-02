import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserManagementCard() {
  const navigate = useNavigate();

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate('/users')}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <CardTitle>用户管理</CardTitle>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
        <CardDescription>管理系统用户、角色和权限</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-sm text-indigo-700">
            点击进入用户管理页面，添加、编辑或删除系统用户，配置用户角色和权限。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
