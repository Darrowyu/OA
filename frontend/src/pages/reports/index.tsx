import { motion } from 'framer-motion';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Settings, Users, Clock, Menu, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ApprovalReport } from './components/ApprovalReport';
import { EquipmentReport } from './components/EquipmentReport';
import { AttendanceReport } from './components/AttendanceReport';
import { PerformanceReport } from './components/PerformanceReport';
import { useState, useEffect } from 'react';

// 导航菜单配置
const menuItems = [
  { path: '/reports', icon: BarChart3, label: '数据仪表板', exact: true },
  { path: '/reports/approval', icon: FileText, label: '审批效率分析' },
  { path: '/reports/equipment', icon: Settings, label: '设备利用率报表' },
  { path: '/reports/attendance', icon: Clock, label: '考勤统计报表' },
  { path: '/reports/performance', icon: Users, label: '人员绩效报表' },
];

// 侧边导航组件
function SidebarNav() {
  return (
    <Card>
      <CardContent className="p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}

// 移动端侧边栏抽屉组件
function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();

  // 路径改变时关闭侧边栏
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // 仅在路径改变时执行

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* 抽屉 */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-64 bg-white z-50 lg:hidden transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-semibold text-gray-900">报表中心</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4">
          <SidebarNav />
        </div>
      </div>
    </>
  );
}

// 主页面组件
export default function ReportsCenter() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />
      <main className="p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">报表中心</h1>
            <p className="text-sm text-gray-500 mt-1">查看和分析系统数据报表</p>
          </div>
          {/* 移动端菜单按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-4 w-4 mr-2" />
            菜单
          </Button>
        </motion.div>

        {/* 移动端侧边栏 */}
        <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* 桌面端侧边栏 */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <SidebarNav />
          </div>

          <div className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<div className="text-center text-gray-500 py-12 bg-white rounded-lg">请选择报表类型</div>} />
              <Route path="approval" element={<ApprovalReport />} />
              <Route path="equipment" element={<EquipmentReport />} />
              <Route path="attendance" element={<AttendanceReport />} />
              <Route path="performance" element={<PerformanceReport />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
