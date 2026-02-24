import { UserRole, ApprovalAction } from '@prisma/client';

// 总监审批选项
export interface DirectorApprovalOptions {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  flowType: 'TO_MANAGER' | 'TO_CEO' | 'COMPLETE';
  selectedManagerIds?: string[];
}

// 审批人信息
export interface ApproverInfo {
  id: string;
  name: string;
  employeeId: string;
  role: UserRole;
}

// 基础审批记录类型
export interface BaseApprovalRecord {
  id: string;
  applicationId: string;
  approverId: string;
  action: ApprovalAction;
  comment: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 厂长审批记录（不含审批人信息）
export interface FactoryApprovalRecord extends BaseApprovalRecord {
  approver?: ApproverInfo;
}

// 总监审批记录（不含审批人信息）
export interface DirectorApprovalRecord extends BaseApprovalRecord {
  selectedManagerIds: string[];
  skipManager: boolean;
  approver?: ApproverInfo;
}

// 经理审批记录（不含审批人信息）
export interface ManagerApprovalRecord extends BaseApprovalRecord {
  approver?: ApproverInfo;
}

// CEO审批记录（不含审批人信息）
export interface CeoApprovalRecord extends BaseApprovalRecord {
  approver?: ApproverInfo;
}

// 审批记录联合类型
export type ApprovalRecord =
  | FactoryApprovalRecord
  | DirectorApprovalRecord
  | ManagerApprovalRecord
  | CeoApprovalRecord;

// 带审批层级的记录（用于前端展示）
export interface ApprovalWithLevel extends BaseApprovalRecord {
  approver: ApproverInfo;
  level: 'FACTORY' | 'DIRECTOR' | 'MANAGER' | 'CEO';
  selectedManagerIds?: string[];
  skipManager?: boolean;
}

// 审批历史查询结果
export interface ApplicationWithApprovals {
  id: string;
  applicantId: string;
  status: string;
  factoryApprovals: FactoryApprovalRecord[];
  directorApprovals: DirectorApprovalRecord[];
  managerApprovals: ManagerApprovalRecord[];
  ceoApprovals: CeoApprovalRecord[];
}
