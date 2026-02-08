import { Routes, Route, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { PanelLeft, PanelRight } from "lucide-react"
import { Header } from "@/components/Header"
import { Login } from "@/pages/Login"
import Dashboard from "@/pages/dashboard"
import { ApplicationsModule } from "@/pages/applications"
import { EquipmentModule } from "@/pages/equipment"
import { AttendanceModule } from "@/pages/attendance"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Sidebar } from "@/components/Sidebar"
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext"
import Users from "@/pages/Users"
import Settings from "@/pages/Settings"
import Profile from "@/pages/Profile"
import AuditLogs from "@/pages/admin/AuditLogs"
import Departments from "@/pages/admin/Departments"
import SchedulePage from "@/pages/schedule"
import DocumentsPage from "@/pages/documents"
import { MeetingsModule } from "@/pages/meetings"
import ContactsPage from "@/pages/contacts"
import AnnouncementsPage from "@/pages/announcements"
import AnnouncementDetail from "@/pages/announcements/AnnouncementDetail"
import AnnouncementForm from "@/pages/announcements/AnnouncementForm"

// 侧边栏切换按钮组件
function SidebarToggle() {
  const { isCollapsed, setIsCollapsed } = useSidebar()

  return (
    <motion.button
      initial={false}
      animate={{ left: isCollapsed ? '80px' : '268px' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="fixed top-4 z-[60] p-2 bg-transparent rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
    >
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="expand"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PanelRight className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="collapse"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PanelLeft className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// 带侧边栏的布局组件 - 使用pl来适配动态宽度的侧边栏
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      <Sidebar />
      <SidebarToggle />
      <div
        className="flex-1 h-screen overflow-auto transition-all duration-350"
        style={{
          marginLeft: isCollapsed ? '72px' : '260px',
          transition: 'margin-left 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {children}
      </div>
    </div>
  )
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}

// 占位页面布局
function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-4">模块开发中...</p>
      </main>
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 工作台 - 新设计 Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 审批中心模块 */}
      <Route
        path="/approval/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ApplicationsModule />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 设备管理模块 */}
      <Route
        path="/equipment/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <EquipmentModule />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 考勤管理模块 */}
      <Route
        path="/attendance/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AttendanceModule />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      {/* 会议管理模块 */}
      <Route
        path="/meetings/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MeetingsModule />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SchedulePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DocumentsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ContactsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 公告通知模块 */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AnnouncementsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AnnouncementForm />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AnnouncementDetail />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id/edit"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AnnouncementForm />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 用户管理 */}
      <Route
        path="/users"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Users />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 系统设置 */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 个人设置 */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 组织架构管理 - 管理员专用 */}
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Departments />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 审计日志 - 管理员专用 */}
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <AuditLogs />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 旧路由重定向 */}
      <Route path="/applications/*" element={<Navigate to="/approval" replace />} />
    </Routes>
  )
}

export default App
