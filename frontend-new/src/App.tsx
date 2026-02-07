import { Routes, Route, Navigate } from "react-router-dom"
import { Login } from "@/pages/Login"
import { Applications } from "@/pages/Applications"
import { ApplicationDetail } from "@/pages/ApplicationDetail"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Users from "@/pages/Users"
import { PendingApprovals } from "@/pages/PendingApprovals"
import { ApprovedApplications } from "@/pages/ApprovedApplications"
import Settings from "@/pages/Settings"

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
          <ProtectedRoute requireRoles={["FACTORY_MANAGER", "DIRECTOR", "MANAGER", "CEO", "ADMIN"]}>
            <PendingApprovals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approved"
        element={
          <ProtectedRoute>
            <ApprovedApplications />
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
