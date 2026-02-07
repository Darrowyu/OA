import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FilePlus,
  FileText,
  ClipboardCheck,
  CheckCircle,
  Settings,
  Users,
  LogOut,
  User,
} from "lucide-react"

interface SidebarProps {
  pendingCount?: number
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const isAdmin = user?.role === "ADMIN"
  const isApprover = user?.role === "APPROVER" || user?.role === "ADMIN"

  const navItems = [
    { path: "/applications/new", label: "新建申请", icon: FilePlus, show: true },
    { path: "/applications", label: "申请记录", icon: FileText, show: true },
    { path: "/pending", label: "待审核", icon: ClipboardCheck, show: isApprover, badge: pendingCount },
    { path: "/approved", label: "已审核", icon: CheckCircle, show: true },
    { path: "/settings", label: "系统设置", icon: Settings, show: isAdmin },
    { path: "/users", label: "用户管理", icon: Users, show: isAdmin },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">OA系统</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
              {item.badge ? (
                <Badge variant="destructive" className="text-xs">
                  {item.badge}
                </Badge>
              ) : null}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role === "ADMIN"
                ? "管理员"
                : user?.role === "APPROVER"
                ? "审批员"
                : "普通用户"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-700 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>
    </aside>
  )
}
