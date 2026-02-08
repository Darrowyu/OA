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
      <Route path="/" element={<Navigate to="/applications" replace />} />

      {/* 申请管理模块 */}
      <Route
        path="/applications/*"
        element={
          <ProtectedRoute>
            <ApplicationsModule />
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
    </Routes>
  )
}

export default App
