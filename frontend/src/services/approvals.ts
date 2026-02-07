import apiClient from '@/lib/api';

export interface ApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  selectedManagerIds?: string[];
  skipManager?: boolean;
}

import { ApprovalRecord } from '@/types';

export interface ApprovalResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    [key: string]: unknown;
  };
  message?: string;
}

export const approvalsApi = {
  factoryApprove: (applicationId: string, data: ApprovalRequest): Promise<ApprovalResponse> =>
    apiClient.post(`/approvals/factory/${applicationId}`, data).then((res: unknown) => res as ApprovalResponse),
  directorApprove: (applicationId: string, data: ApprovalRequest): Promise<ApprovalResponse> =>
    apiClient.post(`/approvals/director/${applicationId}`, data).then((res: unknown) => res as ApprovalResponse),
  managerApprove: (applicationId: string, data: ApprovalRequest): Promise<ApprovalResponse> =>
    apiClient.post(`/approvals/manager/${applicationId}`, data).then((res: unknown) => res as ApprovalResponse),
  ceoApprove: (applicationId: string, data: ApprovalRequest): Promise<ApprovalResponse> =>
    apiClient.post(`/approvals/ceo/${applicationId}`, data).then((res: unknown) => res as ApprovalResponse),
  getApprovalHistory: (applicationId: string): Promise<{ success: boolean; data: ApprovalRecord[] }> =>
    apiClient.get(`/approvals/${applicationId}/history`).then((res: unknown) => res as { success: boolean; data: ApprovalRecord[] }),
  withdrawApproval: (applicationId: string, level: 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO'): Promise<ApprovalResponse> =>
    apiClient.post(`/approvals/${applicationId}/withdraw`, { level }).then((res: unknown) => res as ApprovalResponse),
};
