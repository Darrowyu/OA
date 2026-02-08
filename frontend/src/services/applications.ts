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

// API 响应类型
interface ApplicationResponse {
  success: boolean;
  data: Application;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}

export const applicationsApi = {
  getApplications: (params?: GetApplicationsParams): Promise<ApplicationsResponse> =>
    apiClient.get<ApplicationsResponse>('/applications', { params }),
  getApplication: (id: string): Promise<ApplicationResponse> =>
    apiClient.get<ApplicationResponse>(`/applications/${id}`),
  createApplication: (data: CreateApplicationRequest): Promise<ApplicationResponse> =>
    apiClient.post<ApplicationResponse>('/applications', data),
  updateApplication: (id: string, data: UpdateApplicationRequest): Promise<ApplicationResponse> =>
    apiClient.put<ApplicationResponse>(`/applications/${id}`, data),
  deleteApplication: (id: string): Promise<DeleteResponse> =>
    apiClient.delete<DeleteResponse>(`/applications/${id}`),
  submitApplication: (id: string): Promise<ApplicationResponse> =>
    apiClient.post<ApplicationResponse>(`/applications/${id}/submit`),
};
