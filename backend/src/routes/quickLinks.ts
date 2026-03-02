import { Router } from 'express';
import {
  getQuickLinks,
  createQuickLink,
  updateQuickLink,
  deleteQuickLink,
  reorderQuickLinks,
} from '../controllers/quickLinks';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', getQuickLinks);
router.post('/', createQuickLink);
router.put('/reorder', reorderQuickLinks);
router.put('/:id', updateQuickLink);
router.delete('/:id', deleteQuickLink);

export default router;
