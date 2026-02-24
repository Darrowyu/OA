import prisma from '@/lib/prisma';
import { ConfigValueType } from '@prisma/client';
import {
  SystemConfigDTO,
  ConfigCategoryDTO,
  UpdateConfigDTO,
  ConfigHistoryDTO,
  ConfigQueryParams,
} from '@/types/config.types';

// 内存缓存
const configCache = new Map<string, any>();

export class ConfigService {
  /**
   * 获取所有配置分类
   */
  async getCategories(): Promise<ConfigCategoryDTO[]> {
    const categories = await prisma.configCategory.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(this.mapCategoryToDTO);
  }

  /**
   * 获取配置列表（按分类）
   */
  async getConfigs(params?: ConfigQueryParams): Promise<SystemConfigDTO[]> {
    const where: any = { isEnabled: true };

    if (params?.category) {
      where.category = { code: params.category };
    }
    if (params?.module) {
      where.module = params.module;
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

    return configs.map(this.mapConfigToDTO);
  }

  /**
   * 获取单个配置值（带缓存）
   */
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    // 检查缓存
    const cached = configCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // 由于key不是唯一字段，需要通过categoryId+key查询
    const config = await prisma.systemConfig.findFirst({
      where: { key },
    });

    if (!config) {
      return defaultValue as T;
    }

    const value = this.parseValue(config.value, config.valueType);
    configCache.set(key, value);
    return value;
  }

  /**
   * 批量获取配置值
   */
  async getValues(keys: string[]): Promise<Record<string, any>> {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = this.parseValue(config.value, config.valueType);
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
          oldValue,
          newValue,
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
    updates: Record<string, any>,
    userId: string,
    reason?: string
  ): Promise<void> {
    const keys = Object.keys(updates);
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    const configMap = new Map(configs.map(c => [c.key, c]));

    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        const config = configMap.get(key);
        if (!config || config.isSystem) continue;

        const oldValue = config.value;
        const newValue = this.serializeValue(value, config.valueType);

        await tx.systemConfig.update({
          where: { id: config.id },
          data: { value: newValue },
        });

        await tx.configHistory.create({
          data: {
            configId: config.id,
            oldValue,
            newValue,
            changedBy: userId,
            changeReason: reason,
          },
        });

        configCache.delete(key);
      }
    });
  }

  /**
   * 获取配置变更历史
   */
  async getConfigHistory(
    key: string,
    limit: number = 50
  ): Promise<ConfigHistoryDTO[]> {
    // 先找到配置项
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

    return histories.map(h => ({
      id: h.id,
      configKey: key,
      oldValue: h.oldValue ? this.parseValue(h.oldValue) : undefined,
      newValue: this.parseValue(h.newValue),
      changedBy: h.changedBy,
      changedByName: h.user?.name,
      reason: h.changeReason ?? undefined,
      createdAt: h.createdAt,
    }));
  }

  /**
   * 初始化默认配置
   */
  async initializeDefaults(): Promise<void> {
    const defaults = getDefaultConfigs();

    for (const config of defaults) {
      // 查找或创建分类
      const category = await prisma.configCategory.findUnique({
        where: { code: config.categoryCode },
      });

      if (!category) {
        continue;
      }

      await prisma.systemConfig.upsert({
        where: {
          categoryId_key: {
            categoryId: category.id,
            key: config.key,
          },
        },
        update: {},
        create: {
          categoryId: category.id,
          key: config.key,
          value: config.value,
          defaultValue: config.defaultValue,
          valueType: config.valueType,
          label: config.label,
          description: config.description,
          placeholder: config.placeholder,
          options: config.options as any,
          validation: config.validation as any,
          isSecret: config.isSecret ?? false,
          isSystem: config.isSystem ?? false,
          sortOrder: config.sortOrder ?? 0,
        },
      });
    }
  }

  // ===== 私有方法 =====

  private parseValue(value: string, type?: ConfigValueType): any {
    if (!value) return null;

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

  private serializeValue(value: any, type?: ConfigValueType): string {
    if (value === null || value === undefined) return '';

    if (type === ConfigValueType.JSON || type === ConfigValueType.ARRAY) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private mapConfigToDTO(config: any): SystemConfigDTO {
    return {
      id: config.id,
      key: config.key,
      value: this.parseValue(config.value, config.valueType),
      defaultValue: config.defaultValue
        ? this.parseValue(config.defaultValue, config.valueType)
        : undefined,
      valueType: config.valueType,
      label: config.label,
      description: config.description,
      placeholder: config.placeholder,
      options: config.options as any,
      validation: config.validation as any,
      isSecret: config.isSecret,
      isEditable: !config.isSystem,
      isVisible: config.isEnabled,
      sortOrder: config.sortOrder,
      module: config.category?.code || 'system',
      category: config.category ? this.mapCategoryToDTO(config.category) : undefined,
    };
  }

  private mapCategoryToDTO(category: any): ConfigCategoryDTO {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      isEnabled: category.isEnabled,
    };
  }
}

// 默认配置数据
function getDefaultConfigs(): any[] {
  return [
    // 系统基础配置
    {
      categoryCode: 'system',
      key: 'system.name',
      value: 'OA办公系统',
      valueType: ConfigValueType.STRING,
      label: '系统名称',
      description: '显示在页面标题和登录页的系统名称',
      sortOrder: 1,
    },
    {
      categoryCode: 'system',
      key: 'system.logo',
      value: '/logo.png',
      valueType: ConfigValueType.STRING,
      label: '系统Logo',
      description: '系统Logo图片地址',
      sortOrder: 2,
    },
    {
      categoryCode: 'system',
      key: 'system.sessionTimeout',
      value: '30',
      defaultValue: '30',
      valueType: ConfigValueType.NUMBER,
      label: '会话超时时间',
      description: '用户无操作后自动登出的时间（分钟）',
      placeholder: '30',
      validation: { required: true, min: 5, max: 1440 },
      sortOrder: 3,
    },
    {
      categoryCode: 'system',
      key: 'system.timezone',
      value: 'Asia/Shanghai',
      defaultValue: 'Asia/Shanghai',
      valueType: ConfigValueType.STRING,
      label: '系统时区',
      description: '系统默认时区设置',
      options: [
        { label: '北京时间', value: 'Asia/Shanghai' },
        { label: '东京时间', value: 'Asia/Tokyo' },
        { label: '纽约时间', value: 'America/New_York' },
        { label: '伦敦时间', value: 'Europe/London' },
      ],
      sortOrder: 4,
    },
    // 安全设置
    {
      categoryCode: 'security',
      key: 'security.password.minLength',
      value: '8',
      defaultValue: '8',
      valueType: ConfigValueType.NUMBER,
      label: '密码最小长度',
      description: '用户密码的最小字符数',
      validation: { required: true, min: 6, max: 32 },
      sortOrder: 1,
    },
    {
      categoryCode: 'security',
      key: 'security.password.requireComplexity',
      value: 'true',
      defaultValue: 'true',
      valueType: ConfigValueType.BOOLEAN,
      label: '要求密码复杂度',
      description: '是否要求密码包含大小写字母、数字和特殊字符',
      sortOrder: 2,
    },
    {
      categoryCode: 'security',
      key: 'security.password.expiryDays',
      value: '90',
      defaultValue: '90',
      valueType: ConfigValueType.NUMBER,
      label: '密码过期天数',
      description: '密码多少天后必须更换（0表示永不过期）',
      validation: { min: 0, max: 365 },
      sortOrder: 3,
    },
    {
      categoryCode: 'security',
      key: 'security.login.maxAttempts',
      value: '5',
      defaultValue: '5',
      valueType: ConfigValueType.NUMBER,
      label: '登录失败次数',
      description: '连续登录失败多少次后锁定账号',
      validation: { required: true, min: 3, max: 10 },
      sortOrder: 4,
    },
    {
      categoryCode: 'security',
      key: 'security.login.lockDuration',
      value: '30',
      defaultValue: '30',
      valueType: ConfigValueType.NUMBER,
      label: '账号锁定时间',
      description: '账号锁定后多少分钟自动解锁',
      validation: { required: true, min: 5, max: 1440 },
      sortOrder: 5,
    },
    // 邮件通知配置
    {
      categoryCode: 'notification',
      key: 'email.enabled',
      value: 'true',
      defaultValue: 'true',
      valueType: ConfigValueType.BOOLEAN,
      label: '启用邮件通知',
      description: '是否启用系统邮件通知功能',
      sortOrder: 1,
    },
    {
      categoryCode: 'notification',
      key: 'email.smtp.host',
      value: '',
      valueType: ConfigValueType.STRING,
      label: 'SMTP服务器',
      description: '邮件服务器地址',
      placeholder: 'smtp.example.com',
      sortOrder: 2,
    },
    {
      categoryCode: 'notification',
      key: 'email.smtp.port',
      value: '587',
      defaultValue: '587',
      valueType: ConfigValueType.NUMBER,
      label: 'SMTP端口',
      description: '邮件服务器端口',
      options: [
        { label: '25', value: 25 },
        { label: '465 (SSL)', value: 465 },
        { label: '587 (TLS)', value: 587 },
      ],
      sortOrder: 3,
    },
    {
      categoryCode: 'notification',
      key: 'email.smtp.user',
      value: '',
      valueType: ConfigValueType.STRING,
      label: '发件人邮箱',
      description: '系统发件邮箱地址',
      placeholder: 'noreply@company.com',
      validation: { email: true },
      sortOrder: 4,
    },
    {
      categoryCode: 'notification',
      key: 'email.smtp.password',
      value: '',
      valueType: ConfigValueType.STRING,
      label: '邮箱密码/授权码',
      description: '邮箱密码或SMTP授权码',
      isSecret: true,
      sortOrder: 5,
    },
    // 审批流程配置
    {
      categoryCode: 'approval',
      key: 'approval.defaultFlowEnabled',
      value: 'true',
      defaultValue: 'true',
      valueType: ConfigValueType.BOOLEAN,
      label: '启用默认审批流',
      description: '是否启用系统默认审批流程',
      sortOrder: 1,
    },
    {
      categoryCode: 'approval',
      key: 'approval.ceoApprovalThreshold',
      value: '100000',
      defaultValue: '100000',
      valueType: ConfigValueType.NUMBER,
      label: 'CEO审批金额阈值',
      description: '超过此金额需要CEO审批（元）',
      validation: { min: 0 },
      sortOrder: 2,
    },
    {
      categoryCode: 'approval',
      key: 'approval.timeoutHours',
      value: '48',
      defaultValue: '48',
      valueType: ConfigValueType.NUMBER,
      label: '审批超时时间',
      description: '审批人需在多少小时内处理（0表示不限制）',
      validation: { min: 0 },
      sortOrder: 3,
    },
    // 考勤配置
    {
      categoryCode: 'attendance',
      key: 'attendance.workStartTime',
      value: '09:00',
      defaultValue: '09:00',
      valueType: ConfigValueType.STRING,
      label: '上班时间',
      description: '标准上班时间',
      placeholder: '09:00',
      sortOrder: 1,
    },
    {
      categoryCode: 'attendance',
      key: 'attendance.workEndTime',
      value: '18:00',
      defaultValue: '18:00',
      valueType: ConfigValueType.STRING,
      label: '下班时间',
      description: '标准下班时间',
      placeholder: '18:00',
      sortOrder: 2,
    },
    {
      categoryCode: 'attendance',
      key: 'attendance.lateThresholdMinutes',
      value: '15',
      defaultValue: '15',
      valueType: ConfigValueType.NUMBER,
      label: '迟到阈值',
      description: '晚于上班时间多少分钟算迟到',
      validation: { min: 0, max: 120 },
      sortOrder: 3,
    },
    {
      categoryCode: 'attendance',
      key: 'attendance.earlyLeaveThresholdMinutes',
      value: '15',
      defaultValue: '15',
      valueType: ConfigValueType.NUMBER,
      label: '早退阈值',
      description: '早于下班时间多少分钟算早退',
      validation: { min: 0, max: 120 },
      sortOrder: 4,
    },
    // 任务管理配置
    {
      categoryCode: 'task',
      key: 'task.defaultPriority',
      value: 'medium',
      defaultValue: 'medium',
      valueType: ConfigValueType.STRING,
      label: '默认优先级',
      description: '新建任务的默认优先级',
      options: [
        { label: '高', value: 'high' },
        { label: '中', value: 'medium' },
        { label: '低', value: 'low' },
      ],
      sortOrder: 1,
    },
    {
      categoryCode: 'task',
      key: 'task.reminderBeforeHours',
      value: '24',
      defaultValue: '24',
      valueType: ConfigValueType.NUMBER,
      label: '任务提醒时间',
      description: '截止前多少小时发送提醒',
      validation: { min: 1, max: 168 },
      sortOrder: 2,
    },
    // 设备管理配置
    {
      categoryCode: 'equipment',
      key: 'equipment.maintenanceReminderDays',
      value: '7',
      defaultValue: '7',
      valueType: ConfigValueType.NUMBER,
      label: '保养提醒天数',
      description: '保养到期前多少天发送提醒',
      validation: { min: 1, max: 30 },
      sortOrder: 1,
    },
    {
      categoryCode: 'equipment',
      key: 'equipment.lowStockThreshold',
      value: '10',
      defaultValue: '10',
      valueType: ConfigValueType.NUMBER,
      label: '库存预警阈值',
      description: '配件库存低于此数量时预警',
      validation: { min: 1 },
      sortOrder: 2,
    },
    // 文档管理配置
    {
      categoryCode: 'document',
      key: 'document.maxFileSizeMB',
      value: '50',
      defaultValue: '50',
      valueType: ConfigValueType.NUMBER,
      label: '单文件大小限制',
      description: '上传文件的单个大小限制（MB）',
      validation: { min: 1, max: 500 },
      sortOrder: 1,
    },
    {
      categoryCode: 'document',
      key: 'document.allowedFileTypes',
      value: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar',
      defaultValue: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar',
      valueType: ConfigValueType.STRING,
      label: '允许的文件类型',
      description: '允许上传的文件扩展名，逗号分隔',
      placeholder: 'pdf,doc,docx,xls,xlsx',
      sortOrder: 2,
    },
    {
      categoryCode: 'document',
      key: 'document.userStorageQuotaMB',
      value: '1024',
      defaultValue: '1024',
      valueType: ConfigValueType.NUMBER,
      label: '用户存储配额',
      description: '每个用户的存储空间配额（MB）',
      validation: { min: 100 },
      sortOrder: 3,
    },
  ];
}

export const configService = new ConfigService();
