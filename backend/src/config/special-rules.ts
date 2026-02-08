/**
 * 特殊规则配置文件
 * 存储硬编码业务规则的配置化替代方案
 */

// 特殊经理配置类型定义
export interface SpecialManagerConfig {
  /** 特殊经理员工ID列表 - 这些经理审批后直接通过，跳过CEO审批 */
  specialManagerIds: string[];
  /** 缓存有效期（毫秒），默认5分钟 */
  cacheTtl: number;
}

// 默认配置值
const DEFAULT_SPECIAL_MANAGERS = ['E10002']; // 保留默认行为向后兼容
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 解析环境变量中的特殊经理ID列表
 * 格式: 逗号分隔的员工ID，如 "E10002,E10003,E10004"
 */
function parseSpecialManagersFromEnv(): string[] {
  const envValue = process.env.SPECIAL_MANAGER_IDS;
  if (!envValue) {
    return DEFAULT_SPECIAL_MANAGERS;
  }

  return envValue
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

/**
 * 解析缓存有效期
 */
function parseCacheTtlFromEnv(): number {
  const envValue = process.env.SPECIAL_RULES_CACHE_TTL;
  if (!envValue) {
    return DEFAULT_CACHE_TTL;
  }

  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) || parsed <= 0 ? DEFAULT_CACHE_TTL : parsed;
}

// 配置缓存
interface ConfigCache {
  config: SpecialManagerConfig;
  timestamp: number;
}

let configCache: ConfigCache | null = null;

/**
 * 获取特殊经理配置
 * 支持环境变量覆盖，带缓存机制
 */
export function getSpecialManagerConfig(): SpecialManagerConfig {
  const now = Date.now();

  // 检查缓存是否有效
  if (configCache && (now - configCache.timestamp) < configCache.config.cacheTtl) {
    return configCache.config;
  }

  // 重新加载配置
  const config: SpecialManagerConfig = {
    specialManagerIds: parseSpecialManagersFromEnv(),
    cacheTtl: parseCacheTtlFromEnv(),
  };

  configCache = {
    config,
    timestamp: now,
  };

  return config;
}

/**
 * 清除配置缓存
 * 用于配置热更新场景
 */
export function clearSpecialManagerCache(): void {
  configCache = null;
}

/**
 * 检查指定员工ID是否为特殊经理
 * @param employeeId 员工ID
 * @returns 是否为特殊经理
 */
export function isSpecialManager(employeeId: string): boolean {
  const config = getSpecialManagerConfig();
  return config.specialManagerIds.includes(employeeId);
}

/**
 * 获取特殊经理ID列表（用于调试或管理接口）
 * @returns 当前配置的特殊经理ID列表
 */
export function getSpecialManagerIds(): string[] {
  const config = getSpecialManagerConfig();
  return [...config.specialManagerIds]; // 返回副本防止外部修改
}
