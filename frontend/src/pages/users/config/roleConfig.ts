import type { UserRole } from '@/types';

export const ROLE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: 'USER', label: '普通用户' },
  { value: 'READONLY', label: '只读用户' },
  { value: 'FINANCE', label: '财务' },
  { value: 'FACTORY_MANAGER', label: '厂长' },
  { value: 'DIRECTOR', label: '总监' },
  { value: 'MANAGER', label: '经理' },
  { value: 'CEO', label: 'CEO' },
  { value: 'ADMIN', label: '管理员' },
];

export const ROLE_CONFIG: Record<UserRole, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  USER: { label: '普通用户', color: 'default' },
  READONLY: { label: '只读用户', color: 'outline' },
  FINANCE: { label: '财务', color: 'secondary' },
  FACTORY_MANAGER: { label: '厂长', color: 'secondary' },
  DIRECTOR: { label: '总监', color: 'secondary' },
  MANAGER: { label: '经理', color: 'outline' },
  CEO: { label: 'CEO', color: 'destructive' },
  ADMIN: { label: '管理员', color: 'destructive' },
};

export const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'true', label: '启用' },
  { value: 'false', label: '禁用' },
];
