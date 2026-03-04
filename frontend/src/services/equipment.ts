import apiClient from '@/lib/api';
import { axiosInstance } from '@/lib/api';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  model: string;
  category: string;
  location: string;
  manufacturer?: string;
  status: 'RUNNING' | 'WARNING' | 'STOPPED' | 'MAINTENANCE' | 'SCRAPPED';
  healthScore: number | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  purchaseDate?: string | null;
  warrantyDate?: string | null;
  factoryId?: string;
  factory?: {
    id: string;
    name: string;
  };
}

export interface FilterOptions {
  categories: string[];
  locations: string[];
  factories: { id: string; name: string }[];
  statuses: string[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: '保养' | '维修';
  content: string;
  operator: string;
  startTime: string;
  endTime: string | null;
  duration: string | null;
  status: 'completed' | 'in_progress' | 'pending';
  cost: number | null;
}

export interface Part {
  id: string;
  name: string;
  model: string;
  category: string;
  categoryId?: string;
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  location: string;
  supplier: string;
  status: 'normal' | 'low' | 'high';
}

// 配件分类
export interface SparePartCategory {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: SparePartCategory[];
  _count?: { parts: number };
}

// 库存日志
export interface PartInventoryLog {
  id: string;
  partId: string;
  part?: Part;
  type: 'in' | 'out' | 'adjust' | 'initial';
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  operator: string | null;
  notes: string | null;
  createdAt: string;
}

// 请购单
export interface RequisitionItem {
  partId: string;
  partCode: string;
  partName: string;
  specification: string;
  currentStock: number;
  minStock: number | null;
  suggestedQuantity: number;
  unit: string;
  category: string | null;
}

export interface Requisition {
  requisitionNo: string;
  createdAt: string;
  items: RequisitionItem[];
}

export const equipmentApi = {
  getEquipmentList: (params?: PaginationParams & { category?: string; location?: string; factoryId?: string; status?: string; keyword?: string }): Promise<PaginatedResponse<Equipment>> =>
    apiClient.get<PaginatedResponse<Equipment>>('/equipment', { params }),

  getMaintenanceRecords: (params?: PaginationParams): Promise<PaginatedResponse<MaintenanceRecord>> =>
    apiClient.get<PaginatedResponse<MaintenanceRecord>>('/equipment/maintenance', { params }),

  getPartsList: (params?: PaginationParams): Promise<PaginatedResponse<Part>> =>
    apiClient.get<PaginatedResponse<Part>>('/equipment/parts', { params }),

  // 筛选选项
  getFilterOptions: (): Promise<{ success: boolean; data: FilterOptions }> =>
    apiClient.get<{ success: boolean; data: FilterOptions }>('/equipment/filter-options'),

  // 批量删除
  batchDelete: (ids: string[]): Promise<{ success: boolean; message: string }> =>
    apiClient.post<{ success: boolean; message: string }>('/equipment/batch-delete', { ids }),

  // Excel导出
  exportExcel: async (filter?: object): Promise<void> => {
    const response = await axiosInstance.get('/equipment/export', {
      params: filter,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `设备清单_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Excel导入
  importExcel: (file: File): Promise<{ success: boolean; data: ImportResult }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ success: boolean; data: ImportResult }>('/equipment/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 配件分类管理
  getPartCategories: (): Promise<{ success: boolean; data: SparePartCategory[] }> =>
    apiClient.get<{ success: boolean; data: SparePartCategory[] }>('/equipment/parts/categories'),

  createPartCategory: (data: { name: string; parentId?: string; description?: string }): Promise<{ success: boolean; data: SparePartCategory }> =>
    apiClient.post<{ success: boolean; data: SparePartCategory }>('/equipment/parts/categories', data),

  updatePartCategory: (id: string, data: { name?: string; parentId?: string; description?: string; sortOrder?: number }): Promise<{ success: boolean; data: SparePartCategory }> =>
    apiClient.put<{ success: boolean; data: SparePartCategory }>(`/equipment/parts/categories/${id}`, data),

  deletePartCategory: (id: string): Promise<{ success: boolean; message: string }> =>
    apiClient.delete<{ success: boolean; message: string }>(`/equipment/parts/categories/${id}`),

  // 库存日志
  getInventoryLogs: (params?: { partId?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<PartInventoryLog>> =>
    apiClient.get<PaginatedResponse<PartInventoryLog>>('/equipment/parts/inventory-logs', { params }),

  // 库存预警
  getStockAlerts: (): Promise<{ success: boolean; data: (Part & { alertType: 'low' | 'high'; alertMessage: string })[] }> =>
    apiClient.get<{ success: boolean; data: (Part & { alertType: 'low' | 'high'; alertMessage: string })[] }>('/equipment/parts/stock-alerts'),

  // 生成请购单
  generateRequisition: (lowStockOnly?: boolean): Promise<{ success: boolean; data: Requisition }> =>
    apiClient.get<{ success: boolean; data: Requisition }>('/equipment/parts/requisition', {
      params: { lowStockOnly },
    }),

  // 保养计划日历
  getMaintenanceCalendar: (year: number, month: number): Promise<{ success: boolean; data: { id: string; title: string; date: string; equipmentName: string; equipmentId: string; type: string }[] }> =>
    apiClient.get<{ success: boolean; data: { id: string; title: string; date: string; equipmentName: string; equipmentId: string; type: string }[] }>('/equipment/maintenance-plans/calendar', {
      params: { year, month },
    }),

  // 检查保养提醒
  checkMaintenanceReminders: (): Promise<{ success: boolean; data: { planId: string; planName: string; equipmentName: string; equipmentId: string; nextDate: string; daysUntil: number; reminderType: string }[] }> =>
    apiClient.get<{ success: boolean; data: { planId: string; planName: string; equipmentName: string; equipmentId: string; nextDate: string; daysUntil: number; reminderType: string }[] }>('/equipment/maintenance-plans/reminders'),

  // 执行保养计划
  executeMaintenancePlan: (planId: string): Promise<{ success: boolean; message: string; data: { recordId: string } }> =>
    apiClient.post<{ success: boolean; message: string; data: { recordId: string } }>(`/equipment/maintenance-plans/${planId}/execute`),
};
