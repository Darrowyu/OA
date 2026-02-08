import { motion } from "framer-motion"
import { Search, Share2, Bell, MoreHorizontal, ChevronRight, LayoutGrid, FileCheck, Users } from "lucide-react"
import { useLocation } from "react-router-dom"
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
  const { user } = useAuth()
  const location = useLocation()

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
  const Icon = breadcrumb.icon

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-transparent"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">智慧OA</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {breadcrumb.name}
        </span>
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

        {/* User Avatar */}
        <Avatar className="w-8 h-8 border-2 border-white">
          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
            {(user?.name?.charAt(0) || user?.username?.charAt(0) || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
          <Share2 className="h-4 w-4 text-gray-600" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 relative">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <Button className="bg-gray-900 hover:bg-gray-800 text-white text-sm">
          <Users className="h-4 w-4 mr-2" />
          邀请成员
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4 text-gray-600" />
        </Button>
      </div>
    </motion.header>
  )
}
