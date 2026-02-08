import { AxiosResponse } from 'axios';
import apiClient from '@/lib/api';

export interface UploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
}

export const uploadsApi = {
  uploadFile: (file: File, applicationId?: string, isApprovalAttachment?: boolean): Promise<{ success: boolean; data: UploadResponse }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (applicationId) formData.append('applicationId', applicationId);
    if (isApprovalAttachment) formData.append('isApprovalAttachment', 'true');

    return apiClient.post<{ success: boolean; data: UploadResponse }>('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFiles: (applicationId?: string): Promise<{ success: boolean; data: UploadResponse[] }> =>
    apiClient.get<{ success: boolean; data: UploadResponse[] }>('/uploads', { params: { applicationId } }),
  deleteFile: (id: string): Promise<{ success: boolean; message?: string }> =>
    apiClient.delete<{ success: boolean; message?: string }>(`/uploads/${id}`),
  downloadFile: (id: string): Promise<AxiosResponse<Blob>> =>
    apiClient.get<AxiosResponse<Blob>>(`/uploads/${id}/download`, { responseType: 'blob' }),
};
