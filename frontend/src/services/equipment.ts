import apiClient from '@/lib/api';

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
  name: string;
  model: string;
  location: string;
  status: 'running' | 'warning' | 'stopped' | 'maintenance';
  health: number;
  lastMaintenance: string;
  nextMaintenance: string;
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
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  location: string;
  supplier: string;
  status: 'normal' | 'low' | 'high';
}

export const equipmentApi = {
  getEquipmentList: (params?: PaginationParams): Promise<PaginatedResponse<Equipment>> =>
    apiClient.get<PaginatedResponse<Equipment>>('/equipment', { params }),

  getMaintenanceRecords: (params?: PaginationParams): Promise<PaginatedResponse<MaintenanceRecord>> =>
    apiClient.get<PaginatedResponse<MaintenanceRecord>>('/equipment/maintenance', { params }),

  getPartsList: (params?: PaginationParams): Promise<PaginatedResponse<Part>> =>
    apiClient.get<PaginatedResponse<Part>>('/equipment/parts', { params }),
};
