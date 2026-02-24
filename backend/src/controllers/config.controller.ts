import { Request, Response } from 'express';
import { configService } from '@/services/config.service';
import { UpdateConfigDTO } from '@/types/config.types';

export class ConfigController {
  /**
   * 获取所有配置分类
   */
  async getCategories(_req: Request, res: Response) {
    try {
      const categories = await configService.getCategories();
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CATEGORIES_ERROR',
          message: '获取配置分类失败',
        },
      });
    }
  }

  /**
   * 获取配置列表
   */
  async getConfigs(req: Request, res: Response) {
    try {
      const { category, module, search } = req.query;
      const configs = await configService.getConfigs({
        category: category as string,
        module: module as string,
        search: search as string,
      });
      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CONFIGS_ERROR',
          message: '获取配置列表失败',
        },
      });
    }
  }

  /**
   * 获取单个配置值
   */
  async getConfigValue(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const value = await configService.getValue(key);
      res.json({
        success: true,
        data: { key, value },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CONFIG_ERROR',
          message: '获取配置值失败',
        },
      });
    }
  }

  /**
   * 批量获取配置值
   */
  async getConfigValues(req: Request, res: Response) {
    try {
      const { keys } = req.body;
      if (!Array.isArray(keys)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'keys 必须是数组',
          },
        });
        return;
      }
      const values = await configService.getValues(keys);
      res.json({
        success: true,
        data: values,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_CONFIGS_ERROR',
          message: '获取配置值失败',
        },
      });
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未登录',
          },
        });
        return;
      }

      const data: UpdateConfigDTO = req.body;
      const config = await configService.updateConfig(key, data, userId);
      res.json({
        success: true,
        data: config,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPDATE_CONFIG_ERROR',
          message: error.message || '更新配置失败',
        },
      });
    }
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未登录',
          },
        });
        return;
      }

      const { updates, reason } = req.body;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'updates 必须是对象',
          },
        });
        return;
      }

      await configService.batchUpdateConfigs(updates, userId, reason);
      res.json({
        success: true,
        message: '批量更新成功',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_UPDATE_ERROR',
          message: error.message || '批量更新配置失败',
        },
      });
    }
  }

  /**
   * 获取配置变更历史
   */
  async getConfigHistory(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await configService.getConfigHistory(key, limit);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_HISTORY_ERROR',
          message: '获取配置历史失败',
        },
      });
    }
  }

  /**
   * 初始化默认配置
   */
  async initializeDefaults(_req: Request, res: Response) {
    try {
      await configService.initializeDefaults();
      res.json({
        success: true,
        message: '默认配置初始化成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INIT_DEFAULTS_ERROR',
          message: '初始化默认配置失败',
        },
      });
    }
  }
}

export const configController = new ConfigController();
