import { Routes, Route, Navigate } from 'react-router-dom'
import { ClockIn } from './ClockIn'
import { Schedule } from './Schedule'
import { LeaveRequest } from './LeaveRequest'
import { Statistics } from './Statistics'
import { Header } from '@/components/Header'
import { motion } from 'framer-motion'
import { Clock, Calendar, FileText, BarChart3 } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const tabs = [
    { path: '/attendance/clock-in', name: '打卡签到', icon: Clock },
    { path: '/attendance/schedule', name: '排班管理', icon: Calendar },
    { path: '/attendance/leave', name: '请假申请', icon: FileText },
    { path: '/attendance/statistics', name: '考勤统计', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900">考勤管理</h1>
          <p className="text-gray-500 mt-1">打卡签到、排班查询、请假申请、考勤统计</p>
        </motion.div>

        {/* Tab 导航 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6"
        >
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = location.pathname === tab.path
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </NavLink>
              )
            })}
          </div>
        </motion.div>

        {/* 内容区域 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

export function AttendanceModule() {
  return (
    <AttendanceLayout>
      <Routes>
        <Route path="clock-in" element={<ClockIn />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="leave" element={<LeaveRequest />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="*" element={<Navigate to="clock-in" replace />} />
      </Routes>
    </AttendanceLayout>
  )
}

export default AttendanceModule
