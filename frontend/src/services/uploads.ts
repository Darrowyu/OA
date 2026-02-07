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

    return apiClient.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res: unknown) => res as { success: boolean; data: UploadResponse });
  },
  getFiles: (applicationId?: string): Promise<{ success: boolean; data: UploadResponse[] }> =>
    apiClient.get('/uploads', { params: { applicationId } }).then((res: unknown) => res as { success: boolean; data: UploadResponse[] }),
  deleteFile: (id: string): Promise<{ success: boolean; message?: string }> =>
    apiClient.delete(`/uploads/${id}`).then((res: unknown) => res as { success: boolean; message?: string }),
  downloadFile: (id: string) => apiClient.get(`/uploads/${id}/download`, { responseType: 'blob' }),
};
