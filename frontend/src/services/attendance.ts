import apiClient from '@/lib/api'

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    items: T[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  }
}

export interface LocationData {
  lat: number
  lng: number
  address?: string
}

export interface ClockInData {
  type: 'GPS' | 'WIFI' | 'MANUAL'
  location?: LocationData
  notes?: string
}

export interface ClockOutData extends ClockInData {}

export type AttendanceStatus = 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'ON_LEAVE'
export type ClockInType = 'GPS' | 'WIFI' | 'MANUAL'
export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MARRIAGE' | 'MATERNITY' | 'PATERNITY' | 'FUNERAL' | 'OTHER'
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AttendanceRecord {
  id: string
  userId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  clockInLocation: string | null
  clockOutLocation: string | null
  clockInType: ClockInType | null
  clockOutType: ClockInType | null
  status: AttendanceStatus
  workHours: number | null
  notes: string | null
  user?: {
    id: string
    name: string
    employeeId: string
    department?: {
      name: string
    }
  }
}

export interface LeaveRequest {
  id: string
  userId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveRequestStatus
  approverId: string | null
  approvedAt: string | null
  rejectReason: string | null
  createdAt: string
  user?: {
    id: string
    name: string
    employeeId: string
    department?: {
      name: string
    }
  }
  approver?: {
    id: string
    name: string
  }
}

export interface AttendanceStatistics {
  totalDays: number
  normalDays: number
  lateDays: number
  earlyLeaveDays: number
  absentDays: number
  onLeaveDays: number
  attendanceRate: number
  avgWorkHours: number
}

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  breakTime: number
  color: string | null
  isActive: boolean
  createdAt: string
}

export interface Schedule {
  id: string
  userId: string
  date: string
  shiftId: string
  isRestDay: boolean
  shift: Shift
  user?: {
    id: string
    name: string
    employeeId: string
  }
}

export interface CreateLeaveRequestData {
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
}

export interface CreateShiftData {
  name: string
  startTime: string
  endTime: string
  breakTime?: number
  color?: string
}

export const attendanceApi = {
  // ============ 打卡 ============
  clockIn: (data: ClockInData) =>
    apiClient.post<{ success: boolean; data: AttendanceRecord }>('/attendance/clock-in', data),

  clockOut: (data: ClockOutData) =>
    apiClient.post<{ success: boolean; data: AttendanceRecord }>('/attendance/clock-out', data),

  getTodayAttendance: () =>
    apiClient.get<{ success: boolean; data: AttendanceRecord | null }>('/attendance/today'),

  // ============ 考勤记录 ============
  getAttendanceList: (params?: {
    startDate?: string
    endDate?: string
    userId?: string
    status?: AttendanceStatus
  } & PaginationParams) =>
    apiClient.get<PaginatedResponse<AttendanceRecord>>('/attendance', { params }),

  // ============ 请假申请 ============
  createLeaveRequest: (data: CreateLeaveRequestData) =>
    apiClient.post<{ success: boolean; data: LeaveRequest }>('/attendance/leave', data),

  getLeaveRequests: (params?: {
    userId?: string
    status?: LeaveRequestStatus
  } & PaginationParams) =>
    apiClient.get<PaginatedResponse<LeaveRequest>>('/attendance/leave', { params }),

  approveLeaveRequest: (id: string, data: { approved: boolean; rejectReason?: string }) =>
    apiClient.put<{ success: boolean; data: LeaveRequest }>(`/attendance/leave/${id}/approve`, data),

  // ============ 统计 ============
  getStatistics: (params: { userId?: string; startDate: string; endDate: string }) =>
    apiClient.get<{ success: boolean; data: AttendanceStatistics }>('/attendance/statistics', { params }),

  // ============ 班次管理 ============
  getShifts: (includeInactive?: boolean) =>
    apiClient.get<{ success: boolean; data: Shift[] }>('/attendance/shifts', {
      params: { includeInactive }
    }),

  createShift: (data: CreateShiftData) =>
    apiClient.post<{ success: boolean; data: Shift }>('/attendance/shifts', data),

  updateShift: (id: string, data: Partial<CreateShiftData>) =>
    apiClient.put<{ success: boolean; data: Shift }>(`/attendance/shifts/${id}`, data),

  deleteShift: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/attendance/shifts/${id}`),

  // ============ 排班管理 ============
  getSchedules: (params: { userId?: string; month: string }) =>
    apiClient.get<{ success: boolean; data: Schedule[] }>('/attendance/schedules', { params }),

  createSchedule: (data: { userId: string; date: string; shiftId: string; isRestDay?: boolean }) =>
    apiClient.post<{ success: boolean; data: Schedule }>('/attendance/schedules', data),

  deleteSchedule: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/attendance/schedules/${id}`),

  setRestDay: (data: { userId: string; date: string; isRestDay: boolean }) =>
    apiClient.post<{ success: boolean; data: Schedule }>('/attendance/schedules/rest-day', data),
}
