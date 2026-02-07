import apiClient from '@/lib/api';
import { Application, ApplicationStatus, Priority } from '@/types';

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

export interface ApplicationsQueryParams {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
  priority?: Priority;
  keyword?: string;
  myApplications?: boolean;
}

export const applicationsApi = {
  getApplications: (params?: ApplicationsQueryParams) =>
    apiClient.get('/applications', { params }),
  getApplication: (id: string) => apiClient.get(`/applications/${id}`),
  createApplication: (data: CreateApplicationRequest) => apiClient.post('/applications', data),
  updateApplication: (id: string, data: UpdateApplicationRequest) =>
    apiClient.put(`/applications/${id}`, data),
  deleteApplication: (id: string) => apiClient.delete(`/applications/${id}`),
  submitApplication: (id: string) => apiClient.post(`/applications/${id}/submit`),
};
