import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  FilePlus,
  ClipboardCheck,
  CheckCircle,
  Settings,
  Users,
  LogOut,
  LayoutDashboard,
} from "lucide-react"

interface SidebarProps {
  pendingCount?: number
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const isAdmin = user?.role === "ADMIN"
  const isApprover = user?.role === "FACTORY_MANAGER" || user?.role === "DIRECTOR" || user?.role === "MANAGER" || user?.role === "CEO" || user?.role === "ADMIN"

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "管理员",
      FACTORY_MANAGER: "厂长",
      DIRECTOR: "总监",
      MANAGER: "经理",
      CEO: "CEO",
      USER: "普通用户",
      READONLY: "只读用户",
    }
    return map[role] || role
  }

  const navItems = [
    { path: "/applications", label: "申请管理", icon: LayoutDashboard, show: true },
    { path: "/applications/new", label: "新建申请", icon: FilePlus, show: true },
    { path: "/applications/pending", label: "待我审批", icon: ClipboardCheck, show: isApprover, badge: pendingCount },
    { path: "/applications/approved", label: "已审批", icon: CheckCircle, show: true },
  ]

  const adminItems = [
    { path: "/users", label: "用户管理", icon: Users, show: isAdmin },
    { path: "/settings", label: "系统设置", icon: Settings, show: isAdmin },
  ]

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.path ||
      (item.path !== "/applications" && location.pathname.startsWith(item.path))

    return (
      <NavLink
        to={item.path}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-coral-light text-coral"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-coral text-white shadow-lg shadow-coral/30"
            : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-md"
        }`}>
          <item.icon className="h-4.5 w-4.5" />
        </div>
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-coral rounded-full">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </NavLink>
    )
  }

  return (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo区域 */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-coral text-white shadow-lg shadow-coral/30">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">OA系统</h1>
            <p className="text-xs text-gray-400">办公自动化平台</p>
          </div>
        </div>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            主要功能
          </p>
          <div className="space-y-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
          </div>
        </div>

        {isAdmin && (
          <div className="mb-6">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              系统管理
            </p>
            <div className="space-y-1">
              {adminItems
                .filter((item) => item.show)
                .map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
            </div>
          </div>
        )}
      </nav>

      {/* 用户信息 */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-coral to-orange-400 text-white font-semibold text-sm shadow-md">
            {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name || user?.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {getRoleLabel(user?.role || "")}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-coral hover:bg-coral-light transition-all opacity-0 group-hover:opacity-100"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
