/**
 * 配置缓存服务 - 带TTL和LRU淘汰策略
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class ConfigCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000;
  private defaultTTL = 5 * 60 * 1000; // 默认5分钟

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, ttl = this.defaultTTL): void {
    // 如果缓存已满，淘汰最久未使用的
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问时间（LRU）
    entry.timestamp = Date.now();

    return entry.value as T;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 淘汰最久未使用的缓存项
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// 单例实例
export const configCache = new ConfigCache();
