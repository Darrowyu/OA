import { Application, ApplicationStatus, ApprovalRecord } from '@/types';

/**
 * 获取申请状态描述
 * 根据申请状态和审批历史动态生成状态描述
 */
export function getApplicationStatusDesc(
  status: ApplicationStatus,
  _application?: Application,
  approvalHistory?: ApprovalRecord[]
): string {
  switch (status) {
    case ApplicationStatus.DRAFT:
      return '草稿状态，等待提交';

    case ApplicationStatus.PENDING_FACTORY:
      return '等待厂长审批';

    case ApplicationStatus.PENDING_DIRECTOR:
      // 检查是否经过了厂长审批
      const hasFactoryApproval = approvalHistory?.some(
        (record) => record.level === 'FACTORY' && record.action === 'APPROVE'
      );
      if (hasFactoryApproval) {
        return '厂长已审批通过，等待总监审批';
      }
      return '等待总监审批';

    case ApplicationStatus.PENDING_MANAGER:
      // 检查审批历史
      const hasDirectorApproval = approvalHistory?.some(
        (record) => record.level === 'DIRECTOR' && record.action === 'APPROVE'
      );
      if (hasDirectorApproval) {
        return '总监已审批通过，等待经理审批';
      }
      return '等待经理审批';

    case ApplicationStatus.PENDING_CEO:
      // 检查审批历史
      const hasManagerApproval = approvalHistory?.some(
        (record) => record.level === 'MANAGER' && record.action === 'APPROVE'
      );
      if (hasManagerApproval) {
        return '经理已审批通过，等待CEO审批';
      }
      return '等待CEO审批';

    case ApplicationStatus.APPROVED:
      return '审批已通过';

    case ApplicationStatus.REJECTED:
      // 查找拒绝的审批人
      const rejectRecord = approvalHistory?.find((record) => record.action === 'REJECT');
      if (rejectRecord) {
        return `已被${rejectRecord.approver?.name || '未知用户'}(${getRoleLabel(rejectRecord.approver?.role || '')})拒绝`;
      }
      return '已拒绝';

    case ApplicationStatus.ARCHIVED:
      return '已归档';

    default:
      return '未知状态';
  }
}

/**
 * 获取角色显示标签
 */
function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    USER: '普通用户',
    FACTORY_MANAGER: '厂长',
    DIRECTOR: '总监',
    MANAGER: '经理',
    CEO: 'CEO',
    ADMIN: '管理员',
    READONLY: '只读用户',
  };
  return roleMap[role] || role;
}

/**
 * 获取状态进度百分比
 */
export function getStatusProgress(status: ApplicationStatus): number {
  const progressMap: Record<ApplicationStatus, number> = {
    [ApplicationStatus.DRAFT]: 0,
    [ApplicationStatus.PENDING_FACTORY]: 20,
    [ApplicationStatus.PENDING_DIRECTOR]: 40,
    [ApplicationStatus.PENDING_MANAGER]: 60,
    [ApplicationStatus.PENDING_CEO]: 80,
    [ApplicationStatus.APPROVED]: 100,
    [ApplicationStatus.REJECTED]: 100,
    [ApplicationStatus.ARCHIVED]: 100,
  };
  return progressMap[status] || 0;
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: ApplicationStatus): string {
  const colorMap: Record<ApplicationStatus, string> = {
    [ApplicationStatus.DRAFT]: 'text-gray-500',
    [ApplicationStatus.PENDING_FACTORY]: 'text-yellow-600',
    [ApplicationStatus.PENDING_DIRECTOR]: 'text-blue-600',
    [ApplicationStatus.PENDING_MANAGER]: 'text-purple-600',
    [ApplicationStatus.PENDING_CEO]: 'text-orange-600',
    [ApplicationStatus.APPROVED]: 'text-green-600',
    [ApplicationStatus.REJECTED]: 'text-red-600',
    [ApplicationStatus.ARCHIVED]: 'text-gray-400',
  };
  return colorMap[status] || 'text-gray-500';
}
