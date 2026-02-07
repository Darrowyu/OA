import { Routes, Route, Navigate } from "react-router-dom"
import { Login } from "@/pages/Login"
import { Applications } from "@/pages/Applications"
import { ApplicationDetail } from "@/pages/ApplicationDetail"
import { ProtectedRoute } from "@/components/ProtectedRoute"

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
    </Routes>
  )
}

export default App
