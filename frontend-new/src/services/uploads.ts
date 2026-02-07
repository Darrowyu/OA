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
  uploadFile: (file: File, applicationId?: string, isApprovalAttachment?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (applicationId) formData.append('applicationId', applicationId);
    if (isApprovalAttachment) formData.append('isApprovalAttachment', 'true');

    return apiClient.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFiles: (applicationId?: string) =>
    apiClient.get('/uploads', { params: { applicationId } }),
  deleteFile: (id: string) => apiClient.delete(`/uploads/${id}`),
  downloadFile: (id: string) => apiClient.get(`/uploads/${id}/download`, { responseType: 'blob' }),
};
