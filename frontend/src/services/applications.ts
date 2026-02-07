import apiClient from '@/lib/api';
import { ApplicationStatus, Priority } from '@/types';

export interface CreateApplicationRequest {
  title: string;
  content: string;
  amount?: number;
  priority: Priority;
  factoryManagerIds: string[];
}

export interface UpdateApplicationRequest {
  title?: string;
  content?: string;
  amount?: number;
  priority?: Priority;
  factoryManagerIds?: string[];
}

export interface GetApplicationsParams {
  page?: number;
  pageSize?: number;
  status?: ApplicationStatus;
  keyword?: string;
}

export interface ApplicationsResponse {
  success: boolean;
  data: {
    items: Application[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

import { Application } from '@/types';

export const applicationsApi = {
  getApplications: (params?: GetApplicationsParams): Promise<ApplicationsResponse> =>
    apiClient.get('/applications', { params }).then((res: unknown) => res as ApplicationsResponse),
  getApplication: (id: string): Promise<{ success: boolean; data: Application }> =>
    apiClient.get(`/applications/${id}`).then((res: unknown) => res as { success: boolean; data: Application }),
  createApplication: (data: CreateApplicationRequest): Promise<{ success: boolean; data: Application }> =>
    apiClient.post('/applications', data).then((res: unknown) => res as { success: boolean; data: Application }),
  updateApplication: (id: string, data: UpdateApplicationRequest): Promise<{ success: boolean; data: Application }> =>
    apiClient.put(`/applications/${id}`, data).then((res: unknown) => res as { success: boolean; data: Application }),
  deleteApplication: (id: string): Promise<{ success: boolean; message?: string }> =>
    apiClient.delete(`/applications/${id}`).then((res: unknown) => res as { success: boolean; message?: string }),
  submitApplication: (id: string): Promise<{ success: boolean; data: Application }> =>
    apiClient.post(`/applications/${id}/submit`).then((res: unknown) => res as { success: boolean; data: Application }),
};
