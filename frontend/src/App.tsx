import { Routes, Route, Navigate } from "react-router-dom"
import { Login } from "@/pages/Login"
import { ApplicationsModule } from "@/pages/applications"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Users from "@/pages/Users"
import Settings from "@/pages/Settings"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 工作台 - 跳转申请列表 */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navigate to="/approval" replace />
          </ProtectedRoute>
        }
      />

      {/* 审批中心模块 */}
      <Route
        path="/approval/*"
        element={
          <ProtectedRoute>
            <ApplicationsModule />
          </ProtectedRoute>
        }
      />

      {/* 其他模块占位 */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <div className="p-8">考勤管理模块开发中...</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <div className="p-8">日程管理模块开发中...</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <div className="p-8">文档中心模块开发中...</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <div className="p-8">通讯录模块开发中...</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <div className="p-8">公告通知模块开发中...</div>
          </ProtectedRoute>
        }
      />

      {/* 用户管理 */}
      <Route
        path="/users"
        element={
          <ProtectedRoute requireAdmin>
            <Users />
          </ProtectedRoute>
        }
      />

      {/* 系统设置 */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireAdmin>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* 旧路由重定向 */}
      <Route path="/applications/*" element={<Navigate to="/approval" replace />} />
    </Routes>
  )
}

export default App
