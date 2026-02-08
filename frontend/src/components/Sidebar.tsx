import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  Settings,
  LogOut,
  PanelLeft,
  PanelRight,
  Home,
  Package,
  Inbox,
  User,
  BarChart3,
  Store,
  Headphones,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SidebarProps {
  pendingCount?: number
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const isAdmin = user?.role === "ADMIN"

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

  const isApprovalActive = location.pathname.startsWith("/approval")
  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard"
    return location.pathname.startsWith(path)
  }

  // 主导航项 - 按照截图顺序
  const mainNavItems = [
    { path: "/dashboard", name: "工作台", icon: Home },
    { path: "/approval", name: "审批中心", icon: Package, badge: pendingCount },
    { path: "/attendance", name: "考勤管理", icon: Inbox },
    { path: "/contacts", name: "通讯录", icon: User },
    { path: "/documents", name: "文档中心", icon: BarChart3, active: isApprovalActive },
    { path: "/store", name: "应用中心", icon: Store },
  ]

  // 底部导航项
  const bottomNavItems = [
    { path: "/help", name: "帮助中心", icon: Headphones },
    { path: "/settings", name: "系统设置", icon: Settings, show: isAdmin },
  ]

  // 动画配置
  const sidebarVariants = {
    expanded: { width: 240 },
    collapsed: { width: 72 },
  }

  const textVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 },
  }

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50 shadow-sm"
    >
      {/* Toggle Button - 顶部 */}
      <div className="h-14 flex items-center justify-center border-b border-gray-100">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="expand"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PanelRight className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="collapse"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PanelLeft className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = item.active ?? isActive(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: navActive }) => {
                const isItemActive = item.active ?? navActive
                return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isItemActive
                    ? "bg-orange-50 text-orange-600 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`
              }}
            >
              <div className={`flex-shrink-0 ${active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    variants={textVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 whitespace-nowrap"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.name}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="py-4 px-3 border-t border-gray-100 space-y-1">
        {bottomNavItems
          .filter((item) => item.show !== false)
          .map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <div className={`flex-shrink-0 ${active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      variants={textVariants}
                      initial="collapsed"
                      animate="expanded"
                      exit="collapsed"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </NavLink>
            )
          })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-red-600 transition-all duration-200 group relative"
        >
          <div className="flex-shrink-0 text-gray-400 group-hover:text-red-500">
            <LogOut className="h-5 w-5" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 whitespace-nowrap text-left"
              >
                退出登录
              </motion.span>
            )}
          </AnimatePresence>
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              退出登录
            </div>
          )}
        </button>
      </div>

      {/* User Profile - 底部 */}
      <div className="p-3 border-t border-gray-100">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-sm font-medium">
                {(user?.name?.charAt(0) || user?.username?.charAt(0) || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || user?.username}</p>
                <p className="text-xs text-gray-500 truncate">{getRoleLabel(user?.role || "")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
