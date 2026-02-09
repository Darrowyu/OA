import { ApplicationStatus, Priority } from '@/types';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import * as React from 'react';

export const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  [ApplicationStatus.DRAFT]: {
    label: "草稿",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: React.createElement(FileText, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.PENDING_FACTORY]: {
    label: "待厂长审核",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: React.createElement(Clock, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.PENDING_DIRECTOR]: {
    label: "待总监审批",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: React.createElement(Clock, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.PENDING_MANAGER]: {
    label: "待经理审批",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: React.createElement(Clock, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.PENDING_CEO]: {
    label: "待CEO审批",
    color: "text-coral",
    bgColor: "bg-coral-light",
    icon: React.createElement(Clock, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.APPROVED]: {
    label: "已通过",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: React.createElement(CheckCircle, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.REJECTED]: {
    label: "已拒绝",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: React.createElement(XCircle, { className: "h-4 w-4" }),
  },
  [ApplicationStatus.ARCHIVED]: {
    label: "已归档",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: React.createElement(FileText, { className: "h-4 w-4" }),
  },
};

export const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  [Priority.LOW]: { label: "低", color: "text-gray-600", bgColor: "bg-gray-100" },
  [Priority.NORMAL]: { label: "普通", color: "text-blue-600", bgColor: "bg-blue-100" },
  [Priority.HIGH]: { label: "高", color: "text-amber-600", bgColor: "bg-amber-100" },
  [Priority.URGENT]: { label: "紧急", color: "text-red-600", bgColor: "bg-red-100" },
};

export const getStatusLabel = (status: ApplicationStatus): string => statusConfig[status]?.label || status;
