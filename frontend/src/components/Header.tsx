import { motion, AnimatePresence } from "framer-motion"
import { Search, Share2, Bell, MoreHorizontal, ChevronRight, LayoutGrid, FileCheck, Settings, LogOut, User } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"

const breadcrumbMap: Record<string, { name: string; icon: React.ElementType }> = {
  "/dashboard": { name: "工作台", icon: LayoutGrid },
  "/approval": { name: "审批中心", icon: FileCheck },
  "/attendance": { name: "考勤管理", icon: LayoutGrid },
  "/schedule": { name: "日程管理", icon: LayoutGrid },
  "/documents": { name: "文档中心", icon: LayoutGrid },
  "/contacts": { name: "通讯录", icon: LayoutGrid },
  "/announcements": { name: "公告通知", icon: LayoutGrid },
  "/users": { name: "用户管理", icon: LayoutGrid },
  "/settings": { name: "系统设置", icon: LayoutGrid },
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // 获取当前页面面包屑
  const getBreadcrumb = () => {
    const path = location.pathname
    // 优先匹配完整路径
    if (breadcrumbMap[path]) return breadcrumbMap[path]
    // 匹配父路径
    for (const key of Object.keys(breadcrumbMap)) {
      if (path.startsWith(key)) return breadcrumbMap[key]
    }
    return { name: "工作台", icon: LayoutGrid }
  }

  const breadcrumb = getBreadcrumb()

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white/95 backdrop-blur-sm"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm ml-8">
        <span className="text-gray-900 font-medium">{breadcrumb.name}</span>
      </nav>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索审批、文档、联系人..."
            className="pl-10 bg-white border-gray-200 focus:border-gray-900 focus:ring-0"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">3分钟前更新</span>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
          <Share2 className="h-4 w-4 text-gray-600" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 relative">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* 更多菜单 */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </Button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
              >
                {/* 用户信息 */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                        {(user?.name?.charAt(0) || user?.username?.charAt(0) || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.username}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || user?.role}</p>
                    </div>
                  </div>
                </div>

                {/* 菜单项 */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      navigate("/settings")
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    系统设置
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      // TODO: 打开个人资料页面
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-500" />
                    个人资料
                  </button>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-gray-100 my-1" />

                {/* 退出登录 */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  )
}
