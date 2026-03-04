import { Request, Response } from 'express';
import { factoryService } from '../services/factoryService';

export const factoryController = {
  async findMany(_req: Request, res: Response) {
    try {
      const factories = await factoryService.findAll();
      res.json({ success: true, data: factories });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getAll(_req: Request, res: Response) {
    try {
      const factories = await factoryService.findAll();
      res.json({ success: true, data: factories });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const factory = await factoryService.findById(req.params.id);
      if (!factory) {
        res.status(404).json({ success: false, error: '厂区不存在' });
        return;
      }
      res.json({ success: true, data: factory });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const factory = await factoryService.create(req.body);
      res.status(201).json({ success: true, data: factory });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const factory = await factoryService.update(req.params.id, req.body);
      res.json({ success: true, data: factory });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await factoryService.delete(req.params.id);
      res.json({ success: true, message: '厂区已删除' });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async getStatistics(_req: Request, res: Response) {
    try {
      const count = await factoryService.findAll();
      res.json({ success: true, data: { total: count.length } });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
};
