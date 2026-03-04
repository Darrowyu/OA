import { Request, Response } from 'express';
import { sparePartCategoryService } from '../services/sparePartCategoryService';

export const sparePartCategoryController = {
  async getAll(_req: Request, res: Response) {
    try {
      const categories = await sparePartCategoryService.findAll();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getTree(_req: Request, res: Response) {
    try {
      const tree = await sparePartCategoryService.findTree();
      res.json({ success: true, data: tree });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const category = await sparePartCategoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const category = await sparePartCategoryService.update(req.params.id, req.body);
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await sparePartCategoryService.delete(req.params.id);
      res.json({ success: true, message: '分类已删除' });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  }
};
