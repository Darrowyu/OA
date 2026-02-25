import { memo, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { LayoutGrid, ChevronDown, Settings, Package, X } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

// 子组件导入
import { CreateButton } from './CreateButton';
import { NavItem } from './NavItem';
import { SubMenu } from './SubMenu';
import { NavSection } from './NavSection';
// 移除未使用的iconMap导入
import type { NavItem as NavItemType, SubMenuItem } from './types';

// Sidebar属性
interface SidebarProps {
  pendingCount?: number;
}

// 动画变体 - 使用CSS变量避免宽度跳动
const sidebarVariants: Variants = {
  expanded: { width: 260 },
  collapsed: { width: 72 },
};

// Sidebar组件
export const Sidebar = memo(function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const { isCollapsed, isMobile, setIsMobileOpen } = useSidebar();
  const location = useLocation();

  // 菜单展开状态管理
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    approval: location.pathname.startsWith('/approval'),
    equipment: location.pathname.startsWith('/equipment'),
    schedule: location.pathname.startsWith('/schedule'),
    attendance: location.pathname.startsWith('/attendance'),
    meetings: location.pathname.startsWith('/meetings'),
    maintenance: false,
    parts: false,
    settings: location.pathname === '/settings' || location.pathname === '/users',
  });

  // 获取用户信息
  const user = useMemo(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isApprover = ['FACTORY_MANAGER', 'DIRECTOR', 'MANAGER', 'CEO', 'ADMIN'].includes(user?.role);

  // 切换菜单展开状态
  const toggleMenu = useCallback((key: string) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // 主导航项
  const mainNavItems: NavItemType[] = useMemo(
    () => [
      { path: '/dashboard', name: '工作台', icon: 'LayoutGrid', active: location.pathname === '/dashboard' },
      { path: '/tasks', name: '任务管理', icon: 'KanbanSquare' },
      { path: '/documents', name: '文档中心', icon: 'FolderOpen' },
      { path: '/contacts', name: '通讯录', icon: 'Users' },
      { path: '/announcements', name: '公告通知', icon: 'Bell' },
    ],
    [location.pathname]
  );

  // 审批中心子菜单
  const approvalSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/approval', name: '全部申请', icon: 'List' },
      { path: '/approval/new', name: '新建申请', icon: 'Plus' },
      { path: '/approval/pending', name: '待我审批', icon: 'FileCheck', badge: pendingCount, show: isApprover },
      { path: '/approval/approved', name: '已审批', icon: 'CheckCircle' },
    ],
    [pendingCount, isApprover]
  );

  // 设备管理子菜单
  const equipmentSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/equipment', name: '设备信息', icon: 'Monitor' },
      { path: '/equipment/health', name: '设备健康度评估', icon: 'Gauge' },
      { path: '/equipment/capacity', name: '设备产能管理', icon: 'Zap' },
    ],
    []
  );

  // 维修保养子菜单
  const maintenanceSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/equipment/maintenance/records', name: '维修/保养记录', icon: 'ClipboardList' },
      { path: '/equipment/maintenance/plans', name: '保养计划', icon: 'Calendar' },
      { path: '/equipment/maintenance/templates', name: '保养模板', icon: 'FileText' },
    ],
    []
  );

  // 配件管理子菜单
  const partsSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/equipment/parts/list', name: '配件列表', icon: 'List' },
      { path: '/equipment/parts/lifecycle', name: '生命周期', icon: 'Gauge' },
      { path: '/equipment/parts/usage', name: '日常领用', icon: 'ClipboardList' },
      { path: '/equipment/parts/scrap', name: '配件报废', icon: 'Trash2' },
      { path: '/equipment/parts/stock', name: '出入库流水', icon: 'RefreshCcw' },
      { path: '/equipment/parts/statistics', name: '使用统计', icon: 'BarChart3' },
    ],
    []
  );

  // 日程管理子菜单
  const scheduleSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/schedule', name: '我的日程', icon: 'Calendar' },
      { path: '/schedule/team', name: '团队日程', icon: 'Users' },
      { path: '/schedule/invitations', name: '会议邀请', icon: 'Bell' },
    ],
    []
  );

  // 考勤管理子菜单
  const attendanceSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/attendance/clock-in', name: '打卡签到', icon: 'Clock' },
      { path: '/attendance/schedule', name: '排班管理', icon: 'Calendar' },
      { path: '/attendance/leave', name: '请假申请', icon: 'FileText' },
      { path: '/attendance/statistics', name: '考勤统计', icon: 'BarChart3' },
    ],
    []
  );

  // 会议管理子菜单
  const meetingsSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/meetings', name: '会议室', icon: 'Video' },
      { path: '/meetings/booking', name: '预订会议室', icon: 'Calendar' },
      { path: '/meetings?tab=organized', name: '我组织的', icon: 'Users' },
      { path: '/meetings?tab=attending', name: '我参与的', icon: 'Users' },
    ],
    []
  );

  // 快捷入口
  const favouriteItems: NavItemType[] = useMemo(
    () => [
      { path: '/approval/new?type=reimbursement', name: '报销申请', icon: 'Receipt', show: true },
      { path: '/approval/new?type=leave', name: '请假申请', icon: 'Calendar', show: true },
    ],
    []
  );

  // 系统管理子菜单
  const settingsSubItems: SubMenuItem[] = useMemo(
    () => [
      { path: '/settings', name: '系统设置', icon: 'Settings' },
      { path: '/users', name: '用户管理', icon: 'Users' },
    ],
    []
  );

  // 移动端强制展开显示
  const showExpanded = isMobile || !isCollapsed;

  return (
    <motion.aside
      initial={false}
      animate={showExpanded ? 'expanded' : 'collapsed'}
      variants={sidebarVariants}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50"
    >
      {/* Logo + 移动端关闭按钮 - 单图标固定方案 */}
      <div className="p-4 flex items-center border-b border-gray-100">
        {/* Logo图标 - 始终固定 */}
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>

        {/* 文字容器 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            showExpanded ? 'w-auto opacity-100 ml-3' : 'w-0 opacity-0 ml-0'
          )}
        >
          <div className="flex items-center justify-between flex-1">
            <div>
              <p className="text-lg font-bold text-gray-900 whitespace-nowrap">智慧OA</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">企业办公系统</p>
            </div>
            {/* 移动端关闭按钮 */}
            {isMobile && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* 新建按钮 */}
      <CreateButton isCollapsed={!showExpanded} />

      {/* 主导航 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        <ul className="space-y-1">
          {/* 工作台 */}
          <li>
            <NavItem
              item={mainNavItems[0]}
              isCollapsed={!showExpanded}            />
          </li>

          {/* 审批中心 */}
          <li>
            <SubMenu
              title="审批中心"
              icon="FileCheck"
              items={approvalSubItems}
              isExpanded={expandedMenus.approval}
              isCollapsed={!showExpanded}
              isActive={location.pathname.startsWith('/approval')}              onToggle={() => toggleMenu('approval')}
            />
          </li>

          {/* 设备管理 */}
          <li>
            <div>
              <SubMenu
                title="设备管理"
                icon="Monitor"
                items={equipmentSubItems}
                isExpanded={expandedMenus.equipment}
                isCollapsed={!showExpanded}
                isActive={location.pathname.startsWith('/equipment')}
                onToggle={() => toggleMenu('equipment')}
              />
              <AnimatePresence>
                {showExpanded && expandedMenus.equipment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden ml-5 pl-4 border-l-2 border-gray-100 space-y-1"
                  >
                    {/* 维修保养子菜单 */}
                    <div className="mt-1">
                      <button
                        onClick={() => toggleMenu('maintenance')}
                        className="w-full flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 whitespace-nowrap text-left">维修保养</span>
                        <motion.div
                          animate={{ rotate: expandedMenus.maintenance ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {expandedMenus.maintenance && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1 pb-1 pl-4 border-l-2 border-gray-100 ml-3 space-y-1">
                              {maintenanceSubItems.map((item) => {
                                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
                                return (
                                  <li key={item.path}>
                                    <NavItem
                                      item={{ ...item, active: isActive }}
                                      isCollapsed={false}
                                      isNested
                                    />
                                  </li>
                                );
                              })}
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 配件管理子菜单 */}
                    <div className="mt-1">
                      <button
                        onClick={() => toggleMenu('parts')}
                        className="w-full flex items-center gap-2 rounded-lg text-sm transition-all duration-200 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Package className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 whitespace-nowrap text-left">配件管理</span>
                        <motion.div
                          animate={{ rotate: expandedMenus.parts ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {expandedMenus.parts && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1 pb-1 pl-4 border-l-2 border-gray-100 ml-3 space-y-1">
                              {partsSubItems.map((item) => {
                                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
                                return (
                                  <li key={item.path}>
                                    <NavItem
                                      item={{ ...item, active: isActive }}
                                      isCollapsed={false}
                                      isNested
                                    />
                                  </li>
                                );
                              })}
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </li>

          {/* 日程管理 */}
          <li>
            <SubMenu
              title="日程管理"
              icon="Calendar"
              items={scheduleSubItems}
              isExpanded={expandedMenus.schedule}
              isCollapsed={!showExpanded}
              isActive={location.pathname.startsWith('/schedule')}              onToggle={() => toggleMenu('schedule')}
            />
          </li>

          {/* 考勤管理 */}
          <li>
            <SubMenu
              title="考勤管理"
              icon="Clock"
              items={attendanceSubItems}
              isExpanded={expandedMenus.attendance}
              isCollapsed={!showExpanded}
              isActive={location.pathname.startsWith('/attendance')}              onToggle={() => toggleMenu('attendance')}
            />
          </li>

          {/* 会议管理 */}
          <li>
            <SubMenu
              title="会议管理"
              icon="Video"
              items={meetingsSubItems}
              isExpanded={expandedMenus.meetings}
              isCollapsed={!showExpanded}
              isActive={location.pathname.startsWith('/meetings')}              onToggle={() => toggleMenu('meetings')}
            />
          </li>

          {/* 报表中心 */}
          <li>
            <NavItem
              item={{ path: '/reports', name: '报表中心', icon: 'BarChart3' }}
              isCollapsed={!showExpanded}            />
          </li>

          {/* 其他主导航 */}
          {mainNavItems.slice(1).map((item) => (
            <li key={item.path}>
              <NavItem item={item} isCollapsed={!showExpanded} />
            </li>
          ))}
        </ul>

        {/* 快捷入口 */}
        <NavSection
          title="快捷入口"
          items={favouriteItems}
          isCollapsed={!showExpanded}
        />

        {/* 系统管理 */}
        {isAdmin && (
          <div className="mt-4">
            <p className={cn(
              'px-3 text-xs font-medium text-gray-400 mb-2 transition-all duration-200',
              !showExpanded && 'opacity-0 h-0 mb-0 overflow-hidden'
            )}>
              系统管理
            </p>
            <SubMenu
              title="系统配置"
              icon="Settings2"
              items={settingsSubItems}
              isExpanded={expandedMenus.settings}
              isCollapsed={!showExpanded}
              isActive={location.pathname === '/settings' || location.pathname === '/users'}
              onToggle={() => toggleMenu('settings')}
            />
          </div>
        )}
      </nav>

      {/* 帮助中心 */}
      <div className="p-4 border-t border-gray-200">
        <NavItem
          item={{ path: '/knowledge', name: '帮助中心', icon: 'HelpCircle' }}
          isCollapsed={!showExpanded}
        />
      </div>
    </motion.aside>
  );
});

// 默认导出
export default Sidebar;
