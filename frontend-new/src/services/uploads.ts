import apiClient from '@/lib/api';

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
