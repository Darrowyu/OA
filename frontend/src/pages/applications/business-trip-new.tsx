import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BusinessTripForm, BusinessTripData } from '@/components/BusinessTripForm';
import { ArrowLeft, Plane } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/services/users';
import { User } from '@/types';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function BusinessTripNew() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 加载用户列表
        const response = await usersApi.getUsers();
        setUsers(response.data?.items || []);

        // 获取当前登录用户
        const userStr = localStorage.getItem('user');
        if (userStr) {
          setCurrentUser(JSON.parse(userStr));
        }
      } catch (error) {
        logger.error('加载数据失败', { error });
        toast.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (data: BusinessTripData) => {
    setSubmitting(true);
    try {
      // TODO: 调用API创建出差申请
      // await applicationsApi.createBusinessTrip(data);
      logger.info('提交出差申请', { data });
      toast.success('出差申请创建成功');
      navigate('/approval/new');
    } catch (error) {
      logger.error('创建出差申请失败', { error });
      toast.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      {/* 页面标题栏 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
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
            <h1 className="text-2xl font-bold text-gray-900">出差申请单</h1>
            <p className="text-sm text-gray-500 mt-0.5">简化流程，单级审批</p>
          </div>
        </div>
      </motion.div>

      {/* 表单卡片 */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <Plane className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">填写出差信息</h2>
              <p className="text-sm text-gray-500">请填写出差人员、目的地及事由</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-purple-500 mb-3" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : (
            <BusinessTripForm
              users={users}
              currentUser={currentUser}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/approval/new')}
              loading={submitting}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
