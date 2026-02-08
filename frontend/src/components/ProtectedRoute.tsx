import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireRoles?: string[]
}

export function ProtectedRoute({ children, requireAdmin, requireRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && user?.role !== "ADMIN") {
    return <Navigate to="/approval" replace />
  }

  if (requireRoles && user?.role && !requireRoles.includes(user.role)) {
    return <Navigate to="/approval" replace />
  }

  return <>{children}</>
}
