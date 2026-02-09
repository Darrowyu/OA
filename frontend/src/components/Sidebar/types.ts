import type { LucideIcon } from 'lucide-react';

// 用户角色
export type UserRole = 'USER' | 'FACTORY_MANAGER' | 'DIRECTOR' | 'MANAGER' | 'CEO' | 'ADMIN' | 'READONLY';

// 导航项
export interface NavItem {
  path: string;
  name: string;
  icon: string;
  badge?: number;
  show?: boolean;
  active?: boolean;
}

// 子菜单项
export interface SubMenuItem extends NavItem {
  children?: SubMenuItem[];
}

// 导航区块配置
export interface NavSection {
  title: string;
  items: NavItem[];
  requireAdmin?: boolean;
}

// Sidebar属性
export interface SidebarProps {
  pendingCount?: number;
}

// 菜单展开状态
export type ExpandedState = Record<string, boolean>;

// 图标映射类型
export type IconMap = Record<string, LucideIcon>;
