import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FeasibilityForm, FeasibilityData } from '@/components/FeasibilityForm';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/services/users';
import { User } from '@/types';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

export function FeasibilityNew() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await usersApi.getUsers();
        setUsers(response.data?.items || []);
      } catch (error) {
        logger.error('加载用户列表失败', { error });
        toast.error('加载用户列表失败');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSubmit = async (data: FeasibilityData) => {
    setSubmitting(true);
    try {
      // TODO: 调用API创建可行性评估表
      // await applicationsApi.createFeasibility(data);
      logger.info('提交可行性评估表', { data });
      toast.success('可行性评估表创建成功');
      navigate('/approval/new');
    } catch (error) {
      logger.error('创建可行性评估表失败', { error });
      toast.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 页面标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/approval/new')}
            className="rounded-xl hover:bg-blue-500 hover:text-white text-blue-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">可行性评估表</h1>
            <p className="text-sm text-gray-500 mt-0.5">5部门并行审批评估</p>
          </div>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <ClipboardCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">填写评估信息</h2>
              <p className="text-sm text-gray-500">请完成12项可行性评估内容</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-emerald-500 mb-3" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <FeasibilityForm
              users={users}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/approval/new')}
              loading={submitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
