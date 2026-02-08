import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutGrid,
  FileCheck,
  Clock,
  Calendar,
  FolderOpen,
  Users,
  Bell,
  Settings,
  UserCog,
  LogOut,
  Plus,
  HelpCircle,
  Receipt,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  pendingCount?: number
}

const iconMap: Record<string, React.ElementType> = {
  LayoutGrid,
  FileCheck,
  Clock,
  Calendar,
  FolderOpen,
  Users,
  Bell,
  Receipt,
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

  // 检查当前是否在审批中心相关页面
  const isApprovalActive = location.pathname.startsWith("/approval")

  // 主导航项
  const mainNavItems = [
    { path: "/dashboard", name: "工作台", icon: "LayoutGrid", active: location.pathname === "/dashboard" },
    { path: "/approval", name: "审批中心", icon: "FileCheck", badge: pendingCount, active: isApprovalActive },
    { path: "/attendance", name: "考勤管理", icon: "Clock" },
    { path: "/schedule", name: "日程管理", icon: "Calendar" },
    { path: "/documents", name: "文档中心", icon: "FolderOpen" },
    { path: "/contacts", name: "通讯录", icon: "Users" },
    { path: "/announcements", name: "公告通知", icon: "Bell" },
  ]

  // 快捷入口
  const favouriteItems = [
    { path: "/approval/pending", name: "我的审批", icon: "FileCheck", show: isApprover },
    { path: "/approval/new?type=reimbursement", name: "报销申请", icon: "Receipt", show: true },
    { path: "/approval/new?type=leave", name: "请假申请", icon: "Calendar", show: true },
  ]

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-[260px] h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">智慧OA</p>
          <p className="text-xs text-gray-500">企业办公系统</p>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-gray-200 text-gray-700">
            {(user?.name?.charAt(0) || user?.username?.charAt(0) || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || user?.username}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email || getRoleLabel(user?.role || "")}</p>
        </div>
      </div>

      {/* Create Task Button */}
      <div className="px-4 pb-4">
        <Button
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          onClick={() => navigate("/approval/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          新建申请
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* Main Navigation */}
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutGrid
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    item.active
                      ? "bg-gray-100 text-gray-900 font-medium border-l-3 border-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge ? (
                    <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  ) : null}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {/* Favourites */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">快捷入口</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          </div>
          <ul className="space-y-1">
            {favouriteItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = iconMap[item.icon] || LayoutGrid
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                )
              })}
          </ul>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">系统管理</span>
            </div>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/users"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                >
                  <UserCog className="h-4 w-4" />
                  <span>用户管理</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                >
                  <Settings className="h-4 w-4" />
                  <span>系统设置</span>
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Help Center & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150">
            <HelpCircle className="h-4 w-4" />
            <span>帮助中心</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
