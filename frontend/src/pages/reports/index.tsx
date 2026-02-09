import { motion } from 'framer-motion';
import { Routes, Route, NavLink } from 'react-router-dom';
import { BarChart3, FileText, Settings, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { ApprovalReport } from './components/ApprovalReport';
import { EquipmentReport } from './components/EquipmentReport';
import { AttendanceReport } from './components/AttendanceReport';
import { PerformanceReport } from './components/PerformanceReport';

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

// 主页面组件
export default function ReportsCenter() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />
      <main className="p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">报表中心</h1>
            <p className="text-gray-500 mt-1">查看和分析系统数据报表</p>
          </div>
        </motion.div>

        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <SidebarNav />
          </div>

          <div className="flex-1">
            <Routes>
              <Route path="/" element={<div>请选择报表类型</div>} />
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
