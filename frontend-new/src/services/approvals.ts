import apiClient from '@/lib/api';

export interface ApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  selectedManagerIds?: string[];
  skipManager?: boolean;
}

export const approvalsApi = {
  factoryApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/factory/${applicationId}`, data),
  directorApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/director/${applicationId}`, data),
  managerApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/manager/${applicationId}`, data),
  ceoApprove: (applicationId: string, data: ApprovalRequest) =>
    apiClient.post(`/approvals/ceo/${applicationId}`, data),
  getApprovalHistory: (applicationId: string) =>
    apiClient.get(`/approvals/${applicationId}/history`),
};
