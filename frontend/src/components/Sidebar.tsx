import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { useSidebar } from "@/contexts/SidebarContext"
import {
  LayoutGrid,
  FileCheck,
  Clock,
  Calendar,
  FolderOpen,
  Users,
  Bell,
  UserCog,
  Plus,
  Receipt,
  List,
  CheckCircle,
  ChevronDown,
  HelpCircle,
  Monitor,
  Info,
  Settings,
  Wrench,
  ClipboardList,
  Package,
  Gauge,
  Zap,
  CircleDollarSign,
  History,
  BarChart3,
  Trash2,
  RefreshCcw,
  Repeat,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  pendingCount?: number
}

interface SubMenuItem {
  path: string
  name: string
  icon: string
  badge?: number
  show?: boolean
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
  List,
  CheckCircle,
  Plus,
  Monitor,
  Info,
  Settings,
  Wrench,
  ClipboardList,
  Package,
  Gauge,
  Zap,
  CircleDollarSign,
  History,
  BarChart3,
  Trash2,
  RefreshCcw,
  Repeat,
  FileText,
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const { isCollapsed } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const [isApprovalExpanded, setIsApprovalExpanded] = useState(false)  // 审批中心展开状态
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(false)  // 设备管理展开状态
  const [isMaintenanceExpanded, setIsMaintenanceExpanded] = useState(false)  // 维修保养展开状态
  const [isPartsExpanded, setIsPartsExpanded] = useState(false)  // 配件管理展开状态

  // 从 localStorage 获取用户信息
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const isAdmin = user?.role === "ADMIN"
  const isApprover = user?.role === "FACTORY_MANAGER" || user?.role === "DIRECTOR" || user?.role === "MANAGER" || user?.role === "CEO" || user?.role === "ADMIN"

  const isApprovalActive = location.pathname.startsWith("/approval")
  const isEquipmentActive = location.pathname.startsWith("/equipment")

  const mainNavItems = [
    { path: "/dashboard", name: "工作台", icon: "LayoutGrid", active: location.pathname === "/dashboard" },
    { path: "/attendance", name: "考勤管理", icon: "Clock" },
    { path: "/schedule", name: "日程管理", icon: "Calendar" },
    { path: "/documents", name: "文档中心", icon: "FolderOpen" },
    { path: "/contacts", name: "通讯录", icon: "Users" },
    { path: "/announcements", name: "公告通知", icon: "Bell" },
  ]

  const approvalSubItems: SubMenuItem[] = [
    { path: "/approval", name: "全部申请", icon: "List" },
    { path: "/approval/pending", name: "待我审批", icon: "FileCheck", badge: pendingCount, show: isApprover },
    { path: "/approval/approved", name: "已审批", icon: "CheckCircle" },
    { path: "/approval/new", name: "新建申请", icon: "Plus" },
  ]

  // 设备管理 - 维修保养子菜单
  const maintenanceSubItems: SubMenuItem[] = [
    { path: "/equipment/maintenance/records", name: "维修/保养记录", icon: "ClipboardList" },
    { path: "/equipment/maintenance/plans", name: "保养计划", icon: "Calendar" },
    { path: "/equipment/maintenance/templates", name: "保养模板", icon: "FileText" },
  ]

  // 设备管理 - 配件管理子菜单
  const partsSubItems: SubMenuItem[] = [
    { path: "/equipment/parts/list", name: "配件列表", icon: "List" },
    { path: "/equipment/parts/lifecycle", name: "生命周期", icon: "Gauge" },
    { path: "/equipment/parts/usage", name: "日常领用", icon: "ClipboardList" },
    { path: "/equipment/parts/scrap", name: "配件报废", icon: "Trash2" },
    { path: "/equipment/parts/stock", name: "出入库流水", icon: "RefreshCcw" },
    { path: "/equipment/parts/statistics", name: "使用统计", icon: "BarChart3" },
  ]

  // 设备管理子菜单
  const equipmentSubItems: SubMenuItem[] = [
    { path: "/equipment", name: "设备信息", icon: "Monitor" },
    { path: "/equipment/health", name: "设备健康度评估", icon: "Gauge" },
    { path: "/equipment/capacity", name: "设备产能管理", icon: "Zap" },
  ]

  const favouriteItems = [
    { path: "/approval/new?type=reimbursement", name: "报销申请", icon: "Receipt", show: true },
    { path: "/approval/new?type=leave", name: "请假申请", icon: "Calendar", show: true },
  ]

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 72 },
  }

  const textVariants = {
    expanded: { opacity: 1, x: 0, width: "auto" },
    collapsed: { opacity: 0, x: -10, width: 0 },
  }

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50 overflow-hidden"
    >
      {/* Logo - 只保留图标 */}
      <div className={`p-4 flex items-center border-b border-gray-100 ${isCollapsed ? "justify-center" : "gap-3"}`}>
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
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 min-w-0 overflow-hidden"
            >
              <p className="text-lg font-bold text-gray-900">智慧OA</p>
              <p className="text-xs text-gray-500">企业办公系统</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Task Button */}
      <div className={`px-4 py-4 ${isCollapsed ? "flex justify-center" : ""}`}>
        <Button
          className={`bg-gray-900 hover:bg-gray-800 text-white transition-all duration-300 ${isCollapsed ? "w-10 h-10 p-0" : "w-full"}`}
          onClick={() => navigate("/approval/new")}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="ml-2 overflow-hidden"
              >
                新建申请
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        <ul className="space-y-1">
          {/* 工作台 */}
          <li>
            <NavLink
              to="/dashboard"
              className={`flex items-center rounded-lg text-sm transition-all duration-300 group relative ${
                location.pathname === "/dashboard"
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"}`}
            >
              <LayoutGrid className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    variants={textVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 whitespace-nowrap overflow-hidden"
                  >
                    工作台
                  </motion.span>
                )}
              </AnimatePresence>
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  工作台
                </div>
              )}
            </NavLink>
          </li>

          {/* 审批中心 - 带子菜单 */}
          <li>
            <button
              onClick={() => !isCollapsed && setIsApprovalExpanded(!isApprovalExpanded)}
              className={`w-full flex items-center rounded-lg text-sm transition-all duration-300 group relative ${
                isApprovalActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"}`}
            >
              <FileCheck className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    variants={textVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 whitespace-nowrap text-left overflow-hidden"
                  >
                    审批中心
                  </motion.span>
                )}
              </AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  animate={{ rotate: isApprovalExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </motion.div>
              )}
              {pendingCount > 0 && !isCollapsed && (
                <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-100 text-red-600">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Badge>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  审批中心
                </div>
              )}
            </button>

            {/* 审批中心子菜单 */}
            <AnimatePresence>
              {!isCollapsed && isApprovalExpanded && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-1 pb-1 pl-4 border-l-2 border-gray-100 ml-5 space-y-1">
                    {approvalSubItems
                      .filter((item) => item.show !== false)
                      .map((item) => {
                        const Icon = iconMap[item.icon] || LayoutGrid
                        const isActive = location.pathname === item.path || (item.path !== "/approval" && location.pathname.startsWith(item.path))
                        return (
                          <li key={item.path}>
                            <NavLink
                              to={item.path}
                              className={`flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 ${
                                isActive
                                  ? "bg-gray-50 text-gray-900 font-medium"
                                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span className="flex-1 whitespace-nowrap">{item.name}</span>
                              {item.badge ? (
                                <Badge variant="secondary" className="h-4 min-w-4 flex items-center justify-center text-xs bg-red-100 text-red-600">
                                  {item.badge > 99 ? "99+" : item.badge}
                                </Badge>
                              ) : null}
                            </NavLink>
                          </li>
                        )
                      })}
                  </div>
                </motion.ul>
              )}
            </AnimatePresence>
          </li>

          {/* 设备管理 - 带子菜单 */}
          <li>
            <button
              onClick={() => !isCollapsed && setIsEquipmentExpanded(!isEquipmentExpanded)}
              className={`w-full flex items-center rounded-lg text-sm transition-all duration-300 group relative ${
                isEquipmentActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"}`}
            >
              <Monitor className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    variants={textVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 whitespace-nowrap text-left overflow-hidden"
                  >
                    设备管理
                  </motion.span>
                )}
              </AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  animate={{ rotate: isEquipmentExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </motion.div>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  设备管理
                </div>
              )}
            </button>

            {/* 设备管理子菜单 */}
            <AnimatePresence>
              {!isCollapsed && isEquipmentExpanded && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-1 pb-1 pl-4 border-l-2 border-gray-100 ml-5 space-y-1">
                    {/* 设备信息 */}
                    {equipmentSubItems.map((item) => {
                      const Icon = iconMap[item.icon] || Monitor
                      const isActive = location.pathname === item.path || (item.path !== "/equipment" && location.pathname.startsWith(item.path))
                      return (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            className={`flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 ${
                              isActive
                                ? "bg-gray-50 text-gray-900 font-medium"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 whitespace-nowrap">{item.name}</span>
                          </NavLink>
                        </li>
                      )
                    })}

                    {/* 维修保养子菜单 */}
                    <li>
                      <button
                        onClick={() => setIsMaintenanceExpanded(!isMaintenanceExpanded)}
                        className="w-full flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 whitespace-nowrap text-left">维修保养</span>
                        <motion.div
                          animate={{ rotate: isMaintenanceExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isMaintenanceExpanded && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1 pb-1 pl-4 border-l-2 border-gray-100 ml-3 space-y-1">
                              {maintenanceSubItems.map((item) => {
                                const Icon = iconMap[item.icon] || Settings
                                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path)
                                return (
                                  <li key={item.path}>
                                    <NavLink
                                      to={item.path}
                                      className={`flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 ${
                                        isActive
                                          ? "bg-gray-50 text-gray-900 font-medium"
                                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                      }`}
                                    >
                                      <Icon className="h-4 w-4 flex-shrink-0" />
                                      <span className="flex-1 whitespace-nowrap">{item.name}</span>
                                    </NavLink>
                                  </li>
                                )
                              })}
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>

                    {/* 配件管理子菜单 */}
                    <li>
                      <button
                        onClick={() => setIsPartsExpanded(!isPartsExpanded)}
                        className="w-full flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Package className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 whitespace-nowrap text-left">配件管理</span>
                        <motion.div
                          animate={{ rotate: isPartsExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isPartsExpanded && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1 pb-1 pl-4 border-l-2 border-gray-100 ml-3 space-y-1">
                              {partsSubItems.map((item) => {
                                const Icon = iconMap[item.icon] || Package
                                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path)
                                return (
                                  <li key={item.path}>
                                    <NavLink
                                      to={item.path}
                                      className={`flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 ${
                                        isActive
                                          ? "bg-gray-50 text-gray-900 font-medium"
                                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                      }`}
                                    >
                                      <Icon className="h-4 w-4 flex-shrink-0" />
                                      <span className="flex-1 whitespace-nowrap">{item.name}</span>
                                    </NavLink>
                                  </li>
                                )
                              })}
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  </div>
                </motion.ul>
              )}
            </AnimatePresence>
          </li>

          {/* 其他主导航 */}
          {mainNavItems.slice(1).map((item) => {
            const Icon = iconMap[item.icon] || LayoutGrid
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center rounded-lg text-sm transition-all duration-300 group relative ${
                    item.active
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  } ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        variants={textVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 whitespace-nowrap overflow-hidden"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
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

        <div className="mt-6">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between px-3 mb-2 overflow-hidden"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">快捷入口</span>
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
                      className={`flex items-center rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all duration-300 group relative ${
                        isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={textVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="whitespace-nowrap overflow-hidden"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
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

        {isAdmin && (
          <div className="mt-6">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="px-3 mb-2 overflow-hidden"
                >
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">系统管理</span>
                </motion.div>
              )}
            </AnimatePresence>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/users"
                  className={`flex items-center rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all duration-300 group relative ${
                    isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
                  }`}
                >
                  <UserCog className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        variants={textVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        用户管理
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      用户管理
                    </div>
                  )}
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* 帮助按钮 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => {
            // TODO: 打开帮助中心
          }}
          className={`flex items-center rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all duration-300 group relative w-full ${
            isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
          }`}
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                variants={textVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="whitespace-nowrap overflow-hidden"
              >
                帮助中心
              </motion.span>
            )}
          </AnimatePresence>
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              帮助中心
            </div>
          )}
        </button>
      </div>

    </motion.aside>
  )
}
