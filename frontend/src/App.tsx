import { Routes, Route, Navigate } from "react-router-dom"
import { Header } from "@/components/Header"
import { Login } from "@/pages/Login"
import Dashboard from "@/pages/dashboard"
import { ApplicationsModule } from "@/pages/applications"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Sidebar } from "@/components/Sidebar"
import Users from "@/pages/Users"
import Settings from "@/pages/Settings"

// 带侧边栏的布局组件
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      <Sidebar />
      {children}
    </div>
  )
}

// 占位页面布局
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 ml-[260px] h-screen overflow-auto">
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)]">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-4">模块开发中...</p>
      </main>
    </div>
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

      {/* 其他模块占位 */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlaceholderPage title="考勤管理" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlaceholderPage title="日程管理" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlaceholderPage title="文档中心" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlaceholderPage title="通讯录" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PlaceholderPage title="公告通知" />
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

      {/* 旧路由重定向 */}
      <Route path="/applications/*" element={<Navigate to="/approval" replace />} />
    </Routes>
  )
}

export default App
