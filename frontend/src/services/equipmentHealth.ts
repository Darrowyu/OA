import apiClient from '@/lib/api';

export interface HealthHistory {
  id: string;
  equipmentId: string;
  totalScore: number;
  healthLevel: 'excellent' | 'good' | 'average' | 'poor' | 'dangerous';
  ageScore: number;
  repairFrequencyScore: number;
  faultSeverityScore: number;
  maintenanceScore: number;
  assessmentDate: string;
  assessor: string;
  failureProbability: number;
  nextMaintenanceDate: string | null;
  recommendations: string[];
  createdAt: string;
}

export interface FaultPrediction {
  prediction: string;
  confidence: number;
  trend: number;
  avgScore: number;
  predictedFailureDate: string | null;
}

export interface EquipmentHealth {
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  totalScore: number;
  healthLevel: string;
  ageScore: number;
  repairFrequencyScore: number;
  faultSeverityScore: number;
  maintenanceScore: number;
  failureProbability: number;
  nextMaintenanceDate: string | null;
  recommendations: string[];
  lastAssessmentDate: string;
}

export interface BatchCalculateResult {
  success: number;
  failed: number;
}

export const equipmentHealthApi = {
  // 计算设备健康度
  calculateHealth: (equipmentId: string): Promise<{ success: boolean; data: HealthHistory }> =>
    apiClient.post<{ success: boolean; data: HealthHistory }>(`/equipment/${equipmentId}/health/calculate`),

  // 获取健康度历史
  getHealthHistory: (equipmentId: string, limit?: number): Promise<{ success: boolean; data: HealthHistory[] }> =>
    apiClient.get<{ success: boolean; data: HealthHistory[] }>(`/equipment/${equipmentId}/health/history`, {
      params: { limit },
    }),

  // 获取故障预测
  getFaultPrediction: (equipmentId: string): Promise<{ success: boolean; data: FaultPrediction }> =>
    apiClient.get<{ success: boolean; data: FaultPrediction }>(`/equipment/${equipmentId}/health/prediction`),

  // 批量计算健康度
  batchCalculate: (equipmentIds: string[]): Promise<{ success: boolean; data: BatchCalculateResult }> =>
    apiClient.post<{ success: boolean; data: BatchCalculateResult }>('/equipment/health/batch-calculate', {
      equipmentIds,
    }),

  // 获取所有设备健康度列表
  getAllEquipmentHealth: (): Promise<{ success: boolean; data: EquipmentHealth[] }> =>
    apiClient.get<{ success: boolean; data: EquipmentHealth[] }>('/equipment/health/all'),
};
