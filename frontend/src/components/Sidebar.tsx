import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { useSidebar } from "@/contexts/SidebarContext"
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
  PanelLeft,
  PanelRight,
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
  const { isCollapsed, setIsCollapsed } = useSidebar()
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

  // 动画配置
  const sidebarVariants = {
    expanded: { width: 260 },
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
      className="h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              variants={textVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-lg font-bold text-gray-900">智慧OA</p>
              <p className="text-xs text-gray-500">企业办公系统</p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
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
                <PanelRight className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="collapse"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PanelLeft className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Create Task Button */}
      <div className="px-4 py-4">
        <Button
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          onClick={() => navigate("/approval/new")}
        >
          <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                新建申请
              </motion.span>
            )}
          </AnimatePresence>
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 group relative ${
                    item.active
                      ? "bg-gray-100 text-gray-900 font-medium border-l-3 border-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
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
                  {item.badge && !isCollapsed ? (
                    <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  ) : null}
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {/* Favourites */}
        <div className="mt-6">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between px-3 mb-2"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">快捷入口</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-3 w-3 text-gray-400" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="space-y-1">
            {favouriteItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = iconMap[item.icon] || LayoutGrid
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150 group relative"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={textVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="whitespace-nowrap"
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
                  </li>
                )
              })}
          </ul>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="px-3 mb-2"
                >
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">系统管理</span>
                </motion.div>
              )}
            </AnimatePresence>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/users"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150 group relative"
                >
                  <UserCog className="h-4 w-4 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        variants={textVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="whitespace-nowrap"
                      >
                        用户管理
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      用户管理
                    </div>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150 group relative"
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        variants={textVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="whitespace-nowrap"
                      >
                        系统设置
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      系统设置
                    </div>
                  )}
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Help Center & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150 group relative">
            <HelpCircle className="h-4 w-4 flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="whitespace-nowrap"
                >
                  帮助中心
                </motion.span>
              )}
            </AnimatePresence>
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                帮助中心
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors duration-150 group relative"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="whitespace-nowrap"
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
      </div>

      {/* User Profile - 底部 */}
      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="bg-gray-200 text-gray-700">
              {(user?.name?.charAt(0) || user?.username?.charAt(0) || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
                <p className="text-xs text-gray-500 truncate">{user?.email || getRoleLabel(user?.role || "")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
