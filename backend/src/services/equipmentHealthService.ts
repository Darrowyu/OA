import { PrismaClient } from '@prisma/client';
import { addDays, differenceInDays, subYears } from 'date-fns';

const prisma = new PrismaClient();

interface HealthDimensionScores {
  ageScore: number;
  repairFrequencyScore: number;
  faultSeverityScore: number;
  maintenanceScore: number;
}

// 健康度计算结果接口 - 使用Prisma返回类型
import type { EquipmentHealthHistory } from '@prisma/client';
type HealthCalculationResult = EquipmentHealthHistory;

// 当前健康度接口
interface CurrentHealthResult {
  equipment: {
    id: string;
    code: string;
    name: string;
    healthScore: number | null;
    healthMetrics: unknown;
    lastMaintenanceAt: Date | null;
    nextMaintenanceAt: Date | null;
    status: string;
  };
  currentScore: number | null;
  metrics: unknown;
  healthLevel: string | null;
  lastAssessment: EquipmentHealthHistory | null;
}

// 统计结果接口
interface HealthStatisticsResult {
  totalAssessed: number;
  averageScore: number;
  excellentCount: number;
  goodCount: number;
  averageCount: number;
  poorCount: number;
  dangerousCount: number;
}

// 趋势预警接口
interface TrendAlert {
  type: string;
  level: string;
  message: string;
  data: Record<string, unknown>;
}

interface TrendAlertsResult {
  alerts: TrendAlert[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  currentScore?: number;
  averageScore?: number;
  message?: string;
}

// 故障预测结果接口
interface FaultPredictionResult {
  prediction: string;
  confidence: number;
  trend?: number;
  avgScore?: number;
  predictedFailureDate?: string | null;
}

export const equipmentHealthService = {
  // 四维度健康度计算
  async calculateHealth(equipmentId: string, assessor: string): Promise<HealthCalculationResult> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        maintenanceRecords: {
          where: { createdAt: { gte: subYears(new Date(), 1) } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!equipment) throw new Error('设备不存在');

    // 1. 设备年龄分数 (20%)
    const ageScore = this.calculateAgeScore(equipment.purchaseDate);

    // 2. 维修频率分数 (30%)
    const repairFrequencyScore = this.calculateRepairFrequencyScore(equipment.maintenanceRecords);

    // 3. 故障严重度分数 (30%)
    const faultSeverityScore = this.calculateFaultSeverityScore(equipment.maintenanceRecords);

    // 4. 保养状况分数 (20%)
    const maintenanceScore = this.calculateMaintenanceScore(equipment, equipment.maintenanceRecords);

    // 计算总分
    const totalScore = Math.round(
      ageScore * 0.2 +
      repairFrequencyScore * 0.3 +
      faultSeverityScore * 0.3 +
      maintenanceScore * 0.2
    );

    const healthLevel = this.getHealthLevel(totalScore);
    const failureProbability = this.calculateFailureProbability(totalScore, equipment.maintenanceRecords);
    const nextMaintenanceDate = this.predictNextMaintenance(equipment, equipment.maintenanceRecords);

    // 保存到历史记录
    const history = await prisma.equipmentHealthHistory.create({
      data: {
        equipmentId,
        totalScore,
        healthLevel,
        ageScore,
        repairFrequencyScore,
        faultSeverityScore,
        maintenanceScore,
        assessor,
        failureProbability,
        nextMaintenanceDate,
        assessmentDate: new Date(),
        recommendations: this.generateRecommendations({
          ageScore, repairFrequencyScore, faultSeverityScore, maintenanceScore
        })
      }
    });

    // 更新设备当前健康度
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        healthScore: totalScore,
        healthMetrics: {
          ageScore,
          repairFrequencyScore,
          faultSeverityScore,
          maintenanceScore
        }
      }
    });

    return history;
  },

  calculateAgeScore(purchaseDate: Date | null): number {
    if (!purchaseDate) return 80;
    const ageYears = differenceInDays(new Date(), purchaseDate) / 365;
    if (ageYears < 1) return 100;
    if (ageYears < 3) return 90;
    if (ageYears < 5) return 75;
    if (ageYears < 8) return 60;
    return 40;
  },

  calculateRepairFrequencyScore(records: any[]): number {
    const repairCount = records.filter(r => r.type === 'REPAIR').length;
    if (repairCount === 0) return 100;
    if (repairCount <= 2) return 85;
    if (repairCount <= 5) return 65;
    if (repairCount <= 10) return 40;
    return 20;
  },

  calculateFaultSeverityScore(records: any[]): number {
    const severityWeights: Record<string, number> = {
      'low': 1,
      'moderate': 2,
      'high': 3,
      'critical': 5
    };

    const repairs = records.filter(r => r.type === 'REPAIR');
    if (repairs.length === 0) return 100;

    const totalWeight = repairs.reduce((sum, r) => {
      return sum + (severityWeights[r.severity || 'moderate'] || 2);
    }, 0);

    const avgSeverity = totalWeight / repairs.length;
    return Math.max(0, 100 - avgSeverity * 20);
  },

  calculateMaintenanceScore(equipment: any, _records: any[]): number {
    const daysSinceLastMaintenance = equipment.lastMaintenanceAt
      ? differenceInDays(new Date(), equipment.lastMaintenanceAt)
      : 365;

    if (daysSinceLastMaintenance < 30) return 100;
    if (daysSinceLastMaintenance < 60) return 90;
    if (daysSinceLastMaintenance < 90) return 75;
    if (daysSinceLastMaintenance < 180) return 60;
    return 40;
  },

  getHealthLevel(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 60) return 'average';
    if (score >= 40) return 'poor';
    return 'dangerous';
  },

  calculateFailureProbability(score: number, records: any[]): number {
    const baseProbability = (100 - score) / 100;
    const recentRepairs = records.filter(r =>
      r.type === 'REPAIR' && differenceInDays(new Date(), r.createdAt) < 30
    ).length;
    return Math.min(0.95, baseProbability + recentRepairs * 0.1);
  },

  predictNextMaintenance(equipment: any, _records: any[]): Date {
    const baseDays = equipment.healthScore && equipment.healthScore > 80 ? 90 : 60;
    return addDays(new Date(), baseDays);
  },

  generateRecommendations(scores: HealthDimensionScores): string[] {
    const recommendations: string[] = [];

    if (scores.ageScore < 60) {
      recommendations.push('设备使用年限较长，建议增加保养频率');
    }
    if (scores.repairFrequencyScore < 60) {
      recommendations.push('近期维修频率较高，建议进行全面检查');
    }
    if (scores.faultSeverityScore < 60) {
      recommendations.push('故障严重程度较高，建议重点关注关键部件');
    }
    if (scores.maintenanceScore < 60) {
      recommendations.push('保养状况不佳，请按时执行保养计划');
    }

    if (recommendations.length === 0) {
      recommendations.push('设备整体状况良好，请继续保持定期保养');
    }

    return recommendations;
  },

  async getHealthHistory(equipmentId: string, limit: number = 12): Promise<HealthCalculationResult[]> {
    return prisma.equipmentHealthHistory.findMany({
      where: { equipmentId },
      orderBy: { assessmentDate: 'desc' },
      take: limit
    });
  },

  async getFaultPrediction(equipmentId: string): Promise<FaultPredictionResult> {
    const history = await prisma.equipmentHealthHistory.findMany({
      where: { equipmentId },
      orderBy: { assessmentDate: 'desc' },
      take: 6
    });

    if (history.length < 3) {
      return { prediction: '数据不足', confidence: 0 };
    }

    const trend = history[0].totalScore - history[history.length - 1].totalScore;
    const avgScore = history.reduce((sum, h) => sum + h.totalScore, 0) / history.length;

    let prediction: string;
    let confidence: number;

    if (trend < -20 && avgScore < 60) {
      prediction = '高风险：设备健康度持续下降，建议立即检修';
      confidence = 0.85;
    } else if (trend < -10) {
      prediction = '中风险：设备健康度有下降趋势，建议关注';
      confidence = 0.7;
    } else if (avgScore < 50) {
      prediction = '中风险：设备健康度较低，建议加强保养';
      confidence = 0.6;
    } else {
      prediction = '低风险：设备状态稳定';
      confidence = 0.8;
    }

    return {
      prediction,
      confidence,
      trend,
      avgScore,
      predictedFailureDate: history[0]?.failureProbability && history[0].failureProbability > 0.5
        ? addDays(new Date(), 30).toISOString().split('T')[0]
        : null
    };
  },

  async batchCalculate(equipmentIds: string[], assessor: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const MAX_BATCH_SIZE = 50;
    const SINGLE_TIMEOUT = 10000; // 10s
    const TOTAL_TIMEOUT = 120000; // 2min

    if (equipmentIds.length > MAX_BATCH_SIZE) {
      throw new Error(`批量计算最多支持 ${MAX_BATCH_SIZE} 台设备，当前 ${equipmentIds.length} 台`);
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const startTime = Date.now();

    for (const id of equipmentIds) {
      if (Date.now() - startTime > TOTAL_TIMEOUT) {
        errors.push(`已超过总体超时限制(${TOTAL_TIMEOUT / 1000}s)，剩余设备跳过`);
        failed += equipmentIds.length - success - failed;
        break;
      }

      try {
        await Promise.race([
          this.calculateHealth(id, assessor),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`设备 ${id} 计算超时`)), SINGLE_TIMEOUT))
        ]);
        success++;
      } catch (error) {
        failed++;
        errors.push(`设备 ${id}: ${(error as Error).message}`);
      }
    }

    return { success, failed, errors };
  },

  // 获取设备当前健康度（不触发重新计算）
  async getCurrentHealth(equipmentId: string): Promise<CurrentHealthResult> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        code: true,
        name: true,
        healthScore: true,
        healthMetrics: true,
        lastMaintenanceAt: true,
        nextMaintenanceAt: true,
        status: true,
      }
    });

    if (!equipment) throw new Error('设备不存在');

    const latestHistory = await prisma.equipmentHealthHistory.findFirst({
      where: { equipmentId },
      orderBy: { assessmentDate: 'desc' }
    });

    return {
      equipment,
      currentScore: equipment.healthScore,
      metrics: equipment.healthMetrics,
      healthLevel: equipment.healthScore ? this.getHealthLevel(equipment.healthScore) : null,
      lastAssessment: latestHistory,
    };
  },

  // 健康度统计（真实数据）
  async getStatistics(factoryId?: string): Promise<HealthStatisticsResult> {
    const equipmentWhere: Record<string, unknown> = { deletedAt: null };
    if (factoryId) equipmentWhere.factoryId = factoryId;

    const equipmentIds = await prisma.equipment.findMany({
      where: equipmentWhere,
      select: { id: true }
    });
    const ids = equipmentIds.map(e => e.id);

    if (ids.length === 0) {
      return { totalAssessed: 0, averageScore: 0, excellentCount: 0, goodCount: 0, averageCount: 0, poorCount: 0, dangerousCount: 0 };
    }

    // 获取每台设备最新的健康度记录
    const latestHistories = await prisma.$queryRaw`
      SELECT DISTINCT ON (equipment_id)
        equipment_id, total_score, health_level
      FROM equipment_health_history
      WHERE equipment_id = ANY(${ids})
      ORDER BY equipment_id, assessment_date DESC
    ` as Array<{ equipment_id: string; total_score: number; health_level: string }>;

    const totalAssessed = latestHistories.length;
    const averageScore = totalAssessed > 0
      ? Math.round(latestHistories.reduce((sum, h) => sum + h.total_score, 0) / totalAssessed)
      : 0;

    let excellentCount = 0, goodCount = 0, averageCount = 0, poorCount = 0, dangerousCount = 0;
    for (const h of latestHistories) {
      if (h.health_level === 'excellent') excellentCount++;
      else if (h.health_level === 'good') goodCount++;
      else if (h.health_level === 'average') averageCount++;
      else if (h.health_level === 'poor') poorCount++;
      else dangerousCount++;
    }

    return { totalAssessed, averageScore, excellentCount, goodCount, averageCount, poorCount, dangerousCount };
  },

  // 趋势预警
  async getTrendAlerts(equipmentId: string): Promise<TrendAlertsResult> {
    const history = await prisma.equipmentHealthHistory.findMany({
      where: { equipmentId },
      orderBy: { assessmentDate: 'desc' },
      take: 10
    });

    if (history.length < 3) {
      return { alerts: [], trend: 'insufficient_data', message: '数据不足，至少需要3次评估记录' };
    }

    const alerts: Array<{ type: string; level: string; message: string; data: any }> = [];
    const scores = history.map(h => h.totalScore);

    // 检测持续下降趋势
    let consecutiveDecline = 0;
    for (let i = 0; i < scores.length - 1; i++) {
      if (scores[i] < scores[i + 1]) consecutiveDecline++;
      else break;
    }

    if (consecutiveDecline >= 3) {
      alerts.push({
        type: 'continuous_decline',
        level: 'high',
        message: `健康度已连续 ${consecutiveDecline} 次下降`,
        data: { consecutiveDecline, recentScores: scores.slice(0, consecutiveDecline + 1) }
      });
    }

    // 检测分数波动异常
    const recentScores = scores.slice(0, 5);
    const avgRecent = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
    const variance = recentScores.reduce((s, v) => s + Math.pow(v - avgRecent, 2), 0) / recentScores.length;
    const stddev = Math.sqrt(variance);

    if (stddev > 15) {
      alerts.push({
        type: 'high_volatility',
        level: 'medium',
        message: `健康度波动异常，标准差 ${stddev.toFixed(1)}`,
        data: { stddev: Number(stddev.toFixed(1)), recentScores }
      });
    }

    // 检测低分预警
    if (scores[0] < 40) {
      alerts.push({
        type: 'critical_score',
        level: 'critical',
        message: `当前健康度极低(${scores[0]}分)，建议立即检修`,
        data: { currentScore: scores[0] }
      });
    } else if (scores[0] < 60) {
      alerts.push({
        type: 'low_score',
        level: 'high',
        message: `当前健康度较低(${scores[0]}分)，建议安排检修`,
        data: { currentScore: scores[0] }
      });
    }

    // 计算总体趋势
    const firstHalf = scores.slice(Math.floor(scores.length / 2));
    const secondHalf = scores.slice(0, Math.floor(scores.length / 2));
    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const trend = avgSecond > avgFirst + 5 ? 'improving' : avgSecond < avgFirst - 5 ? 'declining' : 'stable';

    return { alerts, trend, currentScore: scores[0], averageScore: Number(avgRecent.toFixed(1)) };
  },

  // 健康度缓存（内存缓存）
  _cache: new Map<string, { data: any; expireAt: number }>(),
  _CACHE_TTL: 300000, // 5分钟
  _STATS_CACHE_TTL: 120000, // 2分钟

  getCacheStats(): { size: number; keys: string[] } {
    // 清理过期项
    const now = Date.now();
    for (const [key, value] of this._cache) {
      if (value.expireAt < now) this._cache.delete(key);
    }
    return { size: this._cache.size, keys: Array.from(this._cache.keys()) };
  },

  clearCache(): { cleared: number } {
    const size = this._cache.size;
    this._cache.clear();
    return { cleared: size };
  }
};
