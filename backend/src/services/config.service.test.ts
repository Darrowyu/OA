/**
 * ConfigService 单元测试
 */

import { ConfigService } from './config.service';
import { ConfigValueType } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  configCategory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  systemConfig: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
  },
  configHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.all(callback);
  }),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('应该返回所有启用的配置分类', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          code: 'system',
          name: '系统基础',
          description: '系统基础配置',
          icon: 'Settings',
          sortOrder: 1,
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-2',
          code: 'security',
          name: '安全设置',
          description: '安全相关配置',
          icon: 'Shield',
          sortOrder: 2,
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.configCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(mockPrisma.configCategory.findMany).toHaveBeenCalledWith({
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('system');
      expect(result[1].code).toBe('security');
    });

    it('应该返回空数组当没有分类时', async () => {
      mockPrisma.configCategory.findMany.mockResolvedValue([]);

      const result = await service.getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getConfigs', () => {
    it('应该返回配置列表', async () => {
      const mockConfigs = [
        {
          id: 'config-1',
          key: 'system.name',
          value: 'OA系统',
          valueType: ConfigValueType.STRING,
          label: '系统名称',
          description: '系统显示名称',
          placeholder: null,
          options: null,
          validation: null,
          isSecret: false,
          isSystem: false,
          sortOrder: 1,
          isEnabled: true,
          category: {
            id: 'cat-1',
            code: 'system',
            name: '系统基础',
            description: null,
            icon: null,
            sortOrder: 1,
            isEnabled: true,
          },
        },
      ];

      mockPrisma.systemConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getConfigs();

      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('system.name');
      expect(result[0].value).toBe('OA系统');
    });

    it('应该支持按分类筛选', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      await service.getConfigs({ category: 'system' });

      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { code: 'system' },
          }),
        })
      );
    });

    it('应该支持搜索', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      await service.getConfigs({ search: 'test' });

      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ key: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  describe('getValue', () => {
    it('应该从数据库获取配置值并缓存', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'system.name',
        value: 'OA系统',
        valueType: ConfigValueType.STRING,
      };

      mockPrisma.systemConfig.findFirst.mockResolvedValue(mockConfig);

      // 第一次调用
      const result1 = await service.getValue('system.name');
      expect(result1).toBe('OA系统');
      expect(mockPrisma.systemConfig.findFirst).toHaveBeenCalledTimes(1);

      // 第二次调用应该使用缓存
      const result2 = await service.getValue('system.name');
      expect(result2).toBe('OA系统');
      // 不应该再次查询数据库
      expect(mockPrisma.systemConfig.findFirst).toHaveBeenCalledTimes(1);
    });

    it('应该正确解析布尔值', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'email.enabled',
        value: 'true',
        valueType: ConfigValueType.BOOLEAN,
      });

      const result = await service.getValue('email.enabled');
      expect(result).toBe(true);
    });

    it('应该正确解析数字值', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system.sessionTimeout',
        value: '30',
        valueType: ConfigValueType.NUMBER,
      });

      const result = await service.getValue('system.sessionTimeout');
      expect(result).toBe(30);
    });

    it('应该正确解析JSON值', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system.options',
        value: '{"key": "value"}',
        valueType: ConfigValueType.JSON,
      });

      const result = await service.getValue('system.options');
      expect(result).toEqual({ key: 'value' });
    });

    it('应该返回默认值当配置不存在时', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue(null);

      const result = await service.getValue('nonexistent.key', 'default');
      expect(result).toBe('default');
    });

    it('应该返回null当配置不存在且没有默认值', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue(null);

      const result = await service.getValue('nonexistent.key');
      expect(result).toBeNull();
    });
  });

  describe('getValues', () => {
    it('应该批量获取配置值', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { key: 'key1', value: 'value1', valueType: ConfigValueType.STRING },
        { key: 'key2', value: 'value2', valueType: ConfigValueType.STRING },
      ]);

      const result = await service.getValues(['key1', 'key2']);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('应该返回空对象当没有配置', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      const result = await service.getValues(['key1', 'key2']);

      expect(result).toEqual({});
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置并记录历史', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'system.name',
        value: '旧名称',
        valueType: ConfigValueType.STRING,
        isSystem: false,
        category: { code: 'system', name: '系统基础' },
      };

      mockPrisma.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrisma.systemConfig.update.mockResolvedValue({
        ...mockConfig,
        value: '新名称',
      });
      mockPrisma.configHistory.create.mockResolvedValue({});

      const result = await service.updateConfig(
        'system.name',
        { value: '新名称', reason: '测试更新' },
        'user-1'
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.value).toBe('新名称');
    });

    it('应该抛出错误当配置不存在', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue(null);

      await expect(
        service.updateConfig('nonexistent.key', { value: 'test' }, 'user-1')
      ).rejects.toThrow('配置项不存在');
    });

    it('应该抛出错误当配置是系统级', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system.key',
        value: 'value',
        valueType: ConfigValueType.STRING,
        isSystem: true,
      });

      await expect(
        service.updateConfig('system.key', { value: 'new' }, 'user-1')
      ).rejects.toThrow('该配置项不可编辑');
    });
  });

  describe('batchUpdateConfigs', () => {
    it('应该批量更新配置', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        {
          id: 'config-1',
          key: 'key1',
          value: 'old1',
          valueType: ConfigValueType.STRING,
          isSystem: false,
        },
        {
          id: 'config-2',
          key: 'key2',
          value: 'old2',
          valueType: ConfigValueType.STRING,
          isSystem: false,
        },
      ]);

      mockPrisma.systemConfig.update.mockResolvedValue({});
      mockPrisma.configHistory.create.mockResolvedValue({});

      await service.batchUpdateConfigs(
        { key1: 'new1', key2: 'new2' },
        'user-1',
        '批量更新'
      );

      expect(mockPrisma.systemConfig.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.configHistory.create).toHaveBeenCalledTimes(2);
    });

    it('应该跳过系统级配置', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        {
          id: 'config-1',
          key: 'key1',
          value: 'old1',
          valueType: ConfigValueType.STRING,
          isSystem: true,
        },
      ]);

      await service.batchUpdateConfigs({ key1: 'new1' }, 'user-1');

      expect(mockPrisma.systemConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('getConfigHistory', () => {
    it('应该返回配置变更历史', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system.name',
      });

      mockPrisma.configHistory.findMany.mockResolvedValue([
        {
          id: 'hist-1',
          configId: 'config-1',
          oldValue: '旧值',
          newValue: '新值',
          changedBy: 'user-1',
          changeReason: '测试',
          createdAt: new Date('2024-01-01'),
          user: { id: 'user-1', name: '测试用户' },
        },
      ]);

      const result = await service.getConfigHistory('system.name');

      expect(result).toHaveLength(1);
      expect(result[0].configKey).toBe('system.name');
      expect(result[0].oldValue).toBe('旧值');
      expect(result[0].newValue).toBe('新值');
      expect(result[0].changedByName).toBe('测试用户');
    });

    it('应该返回空数组当配置不存在', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue(null);

      const result = await service.getConfigHistory('nonexistent.key');

      expect(result).toEqual([]);
    });
  });

  describe('initializeDefaults', () => {
    it('应该初始化默认配置', async () => {
      mockPrisma.configCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        code: 'system',
      });

      mockPrisma.systemConfig.upsert.mockResolvedValue({});

      await service.initializeDefaults();

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalled();
    });

    it('应该跳过不存在的分类', async () => {
      mockPrisma.configCategory.findUnique.mockResolvedValue(null);

      await service.initializeDefaults();

      expect(mockPrisma.systemConfig.upsert).not.toHaveBeenCalled();
    });
  });
});
