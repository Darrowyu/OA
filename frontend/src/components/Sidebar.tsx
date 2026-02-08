import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
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
  ChevronRight,
  FilePlus,
  ClipboardCheck,
  CheckCircle,
  List,
} from "lucide-react"

interface SidebarProps {
  pendingCount?: number
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [approvalExpanded, setApprovalExpanded] = useState(true)

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
    { path: "/dashboard", label: "工作台", icon: LayoutGrid, show: true },
    {
      id: "approval-center",
      label: "审批中心",
      icon: FileCheck,
      show: true,
      badge: pendingCount,
      isExpandable: true,
      isExpanded: approvalExpanded,
      onToggle: () => setApprovalExpanded(!approvalExpanded),
    },
    { path: "/attendance", label: "考勤管理", icon: Clock, show: true },
    { path: "/schedule", label: "日程管理", icon: Calendar, show: true },
    { path: "/documents", label: "文档中心", icon: FolderOpen, show: true },
    { path: "/contacts", label: "通讯录", icon: Users, show: true },
    { path: "/announcements", label: "公告通知", icon: Bell, show: true },
  ]

  // 审批中心子菜单
  const approvalSubItems = [
    { path: "/approval", label: "全部申请", icon: List, show: true },
    { path: "/approval/new", label: "新建申请", icon: FilePlus, show: true },
    { path: "/approval/pending", label: "待审批", icon: ClipboardCheck, show: isApprover, badge: pendingCount },
    { path: "/approval/approved", label: "已审批", icon: CheckCircle, show: true },
  ]

  // 快捷入口
  const quickNavItems = [
    { path: "/approval/pending", label: "我的审批", icon: FileCheck, show: isApprover },
    { path: "/approval/new?type=reimbursement", label: "报销申请", icon: FilePlus, show: true },
    { path: "/approval/new?type=leave", label: "请假申请", icon: Calendar, show: true },
  ]

  // 系统管理
  const adminItems = [
    { path: "/users", label: "用户管理", icon: UserCog, show: isAdmin },
    { path: "/settings", label: "系统设置", icon: Settings, show: isAdmin },
  ]

  const NavItem = ({ item }: { item: any }) => {
    if (item.isExpandable) {
      return (
        <div>
          <button
            onClick={item.onToggle}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isApprovalActive
                ? "bg-coral-light text-coral"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
              isApprovalActive
                ? "bg-coral text-white shadow-lg shadow-coral/30"
                : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-md"
            }`}>
              <item.icon className="h-4.5 w-4.5" />
            </div>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge ? (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-coral rounded-full">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${item.isExpanded ? "rotate-90" : ""}`} />
          </button>

          {/* 子菜单 */}
          {item.isExpanded && (
            <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
              {approvalSubItems
                .filter((subItem) => subItem.show)
                .map((subItem) => (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-coral-light/50 text-coral"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`
                    }
                  >
                    <subItem.icon className="h-4 w-4" />
                    <span className="flex-1">{subItem.label}</span>
                    {subItem.badge ? (
                      <span className="flex items-center justify-center min-w-[18px] h-4.5 px-1 text-xs font-semibold text-white bg-coral rounded-full">
                        {subItem.badge > 99 ? "99+" : subItem.badge}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-coral-light text-coral"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`
        }
      >
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
          location.pathname === item.path
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
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-coral text-white shadow-lg shadow-coral/30">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">OA系统</h1>
            <p className="text-xs text-gray-400">办公自动化平台</p>
          </div>
        </div>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems
            .filter((item) => item.show)
            .map((item) => (
              <NavItem key={item.id || item.path} item={item} />
            ))}
        </div>

        {/* 快捷入口 */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              快捷入口
            </p>
            <button className="text-gray-400 hover:text-gray-600">
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
          <div className="space-y-1">
            {quickNavItems
              .filter((item) => item.show)
              .map((item) => (
                <NavLink
                  key={item.path + item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-coral-light/50 text-coral"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 text-gray-400 group-hover:text-coral" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </div>
        </div>

        {/* 系统管理 */}
        {isAdmin && (
          <div className="mt-6">
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
      <div className="p-3 border-t border-gray-100">
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
