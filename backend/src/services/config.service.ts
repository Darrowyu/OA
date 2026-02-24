import prisma from '@/lib/prisma';
import { ConfigValueType, Prisma } from '@prisma/client';
import type {
  SystemConfigDTO,
  ConfigCategoryDTO,
  UpdateConfigDTO,
  ConfigHistoryDTO,
  ConfigQueryParams,
  ParsedConfigValue,
  ConfigOption,
} from '@/types/config.types';
import { configCache } from './config.cache';
import { maskSecret, shouldMaskValue } from '@/utils/security';
import { getDefaultConfigs } from './config.defaults';

/**
 * 配置服务
 * 提供配置的CRUD操作、缓存管理和变更历史记录
 */
export class ConfigService {
  /**
   * 获取所有配置分类
   */
  async getCategories(): Promise<ConfigCategoryDTO[]> {
    const categories = await prisma.configCategory.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((category) => this.mapCategoryToDTO(category));
  }

  /**
   * 获取配置列表（支持筛选和搜索）
   */
  async getConfigs(params?: ConfigQueryParams): Promise<SystemConfigDTO[]> {
    const where: Prisma.SystemConfigWhereInput = { isEnabled: true };

    if (params?.category) {
      where.category = { code: params.category };
    }

    if (params?.search) {
      where.OR = [
        { key: { contains: params.search, mode: 'insensitive' } },
        { label: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      include: { category: true },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    return configs.map((config) => this.mapConfigToDTO(config));
  }

  /**
   * 获取单个配置值（带缓存）
   * @template T 返回值类型
   * @param key 配置键名
   * @param defaultValue 默认值
   * @returns 配置值或默认值
   */
  async getValue<T = ParsedConfigValue>(
    key: string,
    defaultValue?: T
  ): Promise<T | null> {
    // 检查缓存
    const cached = configCache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const config = await prisma.systemConfig.findFirst({
      where: { key },
    });

    if (!config) {
      return defaultValue ?? null;
    }

    const value = this.parseValue(config.value, config.valueType) as T;
    configCache.set(key, value);

    return value;
  }

  /**
   * 批量获取配置值
   */
  async getValues(
    keys: string[]
  ): Promise<Record<string, ParsedConfigValue>> {
    // 先从缓存获取
    const result: Record<string, ParsedConfigValue> = {};
    const missingKeys: string[] = [];

    for (const key of keys) {
      const cached = configCache.get<ParsedConfigValue>(key);
      if (cached !== undefined) {
        result[key] = cached;
      } else {
        missingKeys.push(key);
      }
    }

    // 从数据库获取缺失的
    if (missingKeys.length > 0) {
      const configs = await prisma.systemConfig.findMany({
        where: { key: { in: missingKeys } },
      });

      for (const config of configs) {
        const value = this.parseValue(config.value, config.valueType);
        result[config.key] = value;
        configCache.set(config.key, value);
      }
    }

    return result;
  }

  /**
   * 更新配置值
   */
  async updateConfig(
    key: string,
    data: UpdateConfigDTO,
    userId: string
  ): Promise<SystemConfigDTO> {
    const config = await prisma.systemConfig.findFirst({
      where: { key },
    });

    if (!config) {
      throw new Error('配置项不存在');
    }

    if (config.isSystem) {
      throw new Error('该配置项不可编辑');
    }

    const oldValue = config.value;
    const newValue = this.serializeValue(data.value, config.valueType);

    // 判断是否敏感配置
    const isSensitive = config.isSecret || shouldMaskValue(key);

    // 对敏感数据进行脱敏
    const maskedOldValue = isSensitive ? maskSecret(oldValue) : oldValue;
    const maskedNewValue = isSensitive ? maskSecret(newValue) : newValue;

    // 开启事务
    const [updated] = await prisma.$transaction([
      prisma.systemConfig.update({
        where: { id: config.id },
        data: { value: newValue },
        include: { category: true },
      }),
      prisma.configHistory.create({
        data: {
          configId: config.id,
          oldValue: maskedOldValue,
          newValue: maskedNewValue,
          changedBy: userId,
          changeReason: data.reason,
        },
      }),
    ]);

    // 清除缓存
    configCache.delete(key);

    return this.mapConfigToDTO(updated);
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(
    updates: Record<string, ParsedConfigValue>,
    userId: string,
    reason?: string
  ): Promise<void> {
    const keys = Object.keys(updates);

    if (keys.length === 0) {
      return;
    }

    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const configMap = new Map(configs.map((c) => [c.key, c]));

    // 准备批量操作
    const updateOperations: Prisma.PrismaPromise<unknown>[] = [];
    const historyOperations: Prisma.PrismaPromise<unknown>[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const config = configMap.get(key);

      if (!config || config.isSystem) {
        continue;
      }

      const oldValue = config.value;
      const newValue = this.serializeValue(value, config.valueType);

      // 判断是否敏感配置
      const isSensitive = config.isSecret || shouldMaskValue(key);
      const maskedOldValue = isSensitive ? maskSecret(oldValue) : oldValue;
      const maskedNewValue = isSensitive ? maskSecret(newValue) : newValue;

      // 批量更新
      updateOperations.push(
        prisma.systemConfig.update({
          where: { id: config.id },
          data: { value: newValue },
        })
      );

      // 批量创建历史记录
      historyOperations.push(
        prisma.configHistory.create({
          data: {
            configId: config.id,
            oldValue: maskedOldValue,
            newValue: maskedNewValue,
            changedBy: userId,
            changeReason: reason,
          },
        })
      );

      // 清除缓存
      configCache.delete(key);
    }

    // 执行批量操作
    await prisma.$transaction([...updateOperations, ...historyOperations]);
  }

  /**
   * 获取配置变更历史
   */
  async getConfigHistory(
    key: string,
    limit = 50
  ): Promise<ConfigHistoryDTO[]> {
    const config = await prisma.systemConfig.findFirst({
      where: { key },
    });

    if (!config) {
      return [];
    }

    const histories = await prisma.configHistory.findMany({
      where: { configId: config.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return histories.map((history) => this.mapHistoryToDTO(history, key));
  }

  /**
   * 初始化默认配置
   */
  async initializeDefaults(): Promise<void> {
    const defaults = getDefaultConfigs();

    for (const configData of defaults) {
      const category = await prisma.configCategory.findUnique({
        where: { code: configData.categoryCode },
      });

      if (!category) {
        continue;
      }

      await prisma.systemConfig.upsert({
        where: {
          categoryId_key: {
            categoryId: category.id,
            key: configData.key,
          },
        },
        update: {},
        create: {
          categoryId: category.id,
          key: configData.key,
          value: configData.value,
          defaultValue: configData.defaultValue,
          valueType: configData.valueType,
          label: configData.label,
          description: configData.description,
          placeholder: configData.placeholder,
          options: configData.options as Prisma.InputJsonValue,
          validation: configData.validation as Prisma.InputJsonValue,
          isSecret: configData.isSecret ?? false,
          isSystem: configData.isSystem ?? false,
          sortOrder: configData.sortOrder ?? 0,
        },
      });
    }
  }

  // ===== 私有方法 =====

  /**
   * 解析配置值
   */
  private parseValue(
    value: string,
    type?: ConfigValueType
  ): ParsedConfigValue {
    if (!value) {
      return null;
    }

    switch (type) {
      case ConfigValueType.BOOLEAN:
        return value === 'true';

      case ConfigValueType.NUMBER:
        return parseFloat(value);

      case ConfigValueType.JSON:
      case ConfigValueType.ARRAY:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }

      default:
        return value;
    }
  }

  /**
   * 序列化配置值
   */
  private serializeValue(
    value: ParsedConfigValue,
    type?: ConfigValueType
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (type === ConfigValueType.JSON || type === ConfigValueType.ARRAY) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 映射配置到DTO
   */
  private mapConfigToDTO(
    config: Prisma.SystemConfigGetPayload<{ include: { category: true } }>
  ): SystemConfigDTO {
    return {
      id: config.id,
      key: config.key,
      value: this.parseValue(config.value, config.valueType),
      defaultValue: config.defaultValue
        ? this.parseValue(config.defaultValue, config.valueType)
        : undefined,
      valueType: config.valueType,
      label: config.label,
      description: config.description ?? undefined,
      placeholder: config.placeholder ?? undefined,
      options: config.options as unknown as ConfigOption[] | undefined,
      validation: config.validation as Record<string, unknown> | undefined,
      isSecret: config.isSecret,
      isEditable: !config.isSystem,
      isVisible: config.isEnabled,
      sortOrder: config.sortOrder,
      module: config.category?.code || 'system',
      category: config.category
        ? this.mapCategoryToDTO(config.category)
        : undefined,
    };
  }

  /**
   * 映射分类到DTO
   */
  private mapCategoryToDTO(
    category: Prisma.ConfigCategoryGetPayload<object>
  ): ConfigCategoryDTO {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      sortOrder: category.sortOrder,
      isEnabled: category.isEnabled,
    };
  }

  /**
   * 映射历史记录到DTO
   */
  private mapHistoryToDTO(
    history: Prisma.ConfigHistoryGetPayload<{
      include: { user: { select: { id: true; name: true } } };
    }>,
    configKey: string
  ): ConfigHistoryDTO {
    return {
      id: history.id,
      configKey,
      oldValue: history.oldValue
        ? this.parseValue(history.oldValue)
        : undefined,
      newValue: this.parseValue(history.newValue),
      changedBy: history.changedBy,
      changedByName: history.user?.name ?? undefined,
      reason: history.changeReason ?? undefined,
      createdAt: history.createdAt,
    };
  }
}

export const configService = new ConfigService();
