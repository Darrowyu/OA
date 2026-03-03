import api from '@/lib/api';

export interface QuickLink {
  id: string;
  name: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickLinkInput {
  name: string;
  path: string;
  icon: string;
}

export interface UpdateQuickLinkInput {
  name?: string;
  path?: string;
  icon?: string;
  isActive?: boolean;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// api 返回的是标准响应格式 { success: true, data: [...] }
export const quickLinkApi = {
  getQuickLinks: (): Promise<ApiResponse<QuickLink[]>> => api.get('/quick-links'),

  createQuickLink: (data: CreateQuickLinkInput): Promise<ApiResponse<QuickLink>> =>
    api.post('/quick-links', data),

  updateQuickLink: (id: string, data: UpdateQuickLinkInput): Promise<ApiResponse<QuickLink>> =>
    api.put(`/quick-links/${id}`, data),

  deleteQuickLink: (id: string): Promise<void> =>
    api.delete(`/quick-links/${id}`),

  reorderQuickLinks: (items: ReorderItem[]): Promise<void> =>
    api.put('/quick-links/reorder', { items }),
};
