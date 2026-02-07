import { Routes, Route, Navigate } from "react-router-dom"
import { Login } from "@/pages/Login"
import { Applications } from "@/pages/Applications"
import { ApplicationDetail } from "@/pages/ApplicationDetail"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Users from "@/pages/Users"
import { Pending } from "@/pages/Pending"
import { Approved } from "@/pages/Approved"
import { Settings } from "@/pages/Settings"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/applications" replace />} />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications/:id"
        element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requireAdmin>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pending"
        element={
          <ProtectedRoute requireRoles={["APPROVER", "ADMIN"]}>
            <Pending />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approved"
        element={
          <ProtectedRoute>
            <Approved />
          </ProtectedRoute>
        }
      />
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
