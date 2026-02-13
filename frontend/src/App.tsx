import { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { PanelLeft, PanelRight, Loader2 } from "lucide-react"
import { Login } from "@/pages/Login"
import Dashboard from "@/pages/dashboard"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Sidebar } from "@/components/Sidebar"
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext"

// 懒加载大型模块 - 代码分割优化
const ApplicationsModule = lazy(() => import("@/pages/applications").then(m => ({ default: m.ApplicationsModule })))
const EquipmentModule = lazy(() => import("@/pages/equipment").then(m => ({ default: m.EquipmentModule })))
const AttendanceModule = lazy(() => import("@/pages/attendance").then(m => ({ default: m.AttendanceModule })))
const MeetingsModule = lazy(() => import("@/pages/meetings").then(m => ({ default: m.MeetingsModule })))
const Users = lazy(() => import("@/pages/Users").then(m => ({ default: m.default })))
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.default })))
const Profile = lazy(() => import("@/pages/Profile").then(m => ({ default: m.default })))
const AuditLogs = lazy(() => import("@/pages/admin/AuditLogs").then(m => ({ default: m.default })))
const Departments = lazy(() => import("@/pages/admin/Departments").then(m => ({ default: m.default })))
const SchedulePage = lazy(() => import("@/pages/schedule").then(m => ({ default: m.default })))
const DocumentsPage = lazy(() => import("@/pages/documents").then(m => ({ default: m.default })))
const ContactsPage = lazy(() => import("@/pages/contacts").then(m => ({ default: m.default })))
const AnnouncementsPage = lazy(() => import("@/pages/announcements").then(m => ({ default: m.default })))
const AnnouncementDetail = lazy(() => import("@/pages/announcements/AnnouncementDetail").then(m => ({ default: m.default })))
const AnnouncementForm = lazy(() => import("@/pages/announcements/AnnouncementForm").then(m => ({ default: m.default })))
const TasksPage = lazy(() => import("@/pages/tasks").then(m => ({ default: m.default })))
const WorkflowList = lazy(() => import("@/pages/workflow/WorkflowList").then(m => ({ default: m.default })))
const WorkflowDesigner = lazy(() => import("@/pages/workflow/WorkflowDesigner").then(m => ({ default: m.default })))
const ReportsCenter = lazy(() => import("@/pages/reports").then(m => ({ default: m.default })))
const ReportDashboard = lazy(() => import("@/pages/reports/Dashboard").then(m => ({ default: m.default })))
const ReportBuilder = lazy(() => import("@/pages/reports/ReportBuilder").then(m => ({ default: m.default })))
const KnowledgePage = lazy(() => import("@/pages/knowledge").then(m => ({ default: m.default })))
const ArticleView = lazy(() => import("@/pages/knowledge/ArticleView").then(m => ({ default: m.default })))
const ArticleEditor = lazy(() => import("@/pages/knowledge/ArticleEditor").then(m => ({ default: m.default })))
const SearchResults = lazy(() => import("@/pages/knowledge/SearchResults").then(m => ({ default: m.default })))

// 加载中组件
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

// 侧边栏切换按钮组件
function SidebarToggle() {
  const { isCollapsed, setIsCollapsed, isMobile } = useSidebar()

  // 移动端不显示此切换按钮
  if (isMobile) return null

  return (
    <motion.button
      initial={false}
      animate={{ left: isCollapsed ? '80px' : '268px' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="fixed top-4 z-[60] p-2 bg-transparent rounded-lg hover:bg-gray-100 text-gray-500 transition-colors hidden md:block"
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
  )
}

// 带侧边栏的布局组件 - 使用pl来适配动态宽度的侧边栏
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isMobile, isMobileOpen, setIsMobileOpen } = useSidebar()

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 移动端侧边栏遮罩 */}
      {isMobile && isMobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full z-50 md:hidden">
            <Sidebar />
          </div>
        </>
      )}

      <SidebarToggle />

      {/* 主内容区 */}
      <div
        className="flex-1 h-screen overflow-auto transition-all duration-350 w-full"
        style={{
          marginLeft: isMobile ? 0 : (isCollapsed ? '72px' : '260px'),
          transition: 'margin-left 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {children}
      </div>
    </div>
  )
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}


function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 工作台 - 新设计 Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 审批中心模块 */}
      <Route
        path="/approval/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ApplicationsModule />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 设备管理模块 */}
      <Route
        path="/equipment/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <EquipmentModule />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 考勤管理模块 */}
      <Route
        path="/attendance/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <AttendanceModule />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      {/* 会议管理模块 */}
      <Route
        path="/meetings/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <MeetingsModule />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <SchedulePage />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <DocumentsPage />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ContactsPage />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 任务管理模块 */}
      <Route
        path="/tasks/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <TasksPage />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 公告通知模块 */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <AnnouncementsPage />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <AnnouncementForm />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <AnnouncementDetail />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id/edit"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <AnnouncementForm />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 报表中心模块 */}
      <Route
        path="/reports/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ReportsCenter />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ReportDashboard />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/builder"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ReportBuilder />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 用户管理 */}
      <Route
        path="/users"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <Users />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 系统设置 */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <Settings />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 个人设置 */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <Profile />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 组织架构管理 - 管理员专用 */}
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <Departments />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 审计日志 - 管理员专用 */}
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <AuditLogs />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 工作流管理 - 管理员专用 */}
      <Route
        path="/workflow"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <WorkflowList />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflow/designer/:id"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <WorkflowDesigner />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 知识库模块 */}
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <KnowledgePage />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/search"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <SearchResults />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/articles/new"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ArticleEditor />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/articles/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ArticleView />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/articles/:id/edit"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<PageLoading />}>
                <ArticleEditor />
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* 旧路由重定向 */}
      <Route path="/applications/*" element={<Navigate to="/approval" replace />} />
      <Route path="/help" element={<Navigate to="/knowledge" replace />} />
    </Routes>
  )
}

export default App
