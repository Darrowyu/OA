import { Router } from 'express';
import {
  getAnnouncementsList,
  getAnnouncementDetail,
  create,
  update,
  remove,
  getStats,
  toggleTopStatus,
  getUnreadCountHandler,
} from '../controllers/announcementController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取未读公告数量
router.get('/unread-count', getUnreadCountHandler);

// 获取公告列表
router.get('/', getAnnouncementsList);

// 创建公告
router.post('/', create);

// 获取公告详情
router.get('/:id', getAnnouncementDetail);

// 更新公告
router.put('/:id', update);

// 删除公告
router.delete('/:id', remove);

// 获取阅读统计
router.get('/:id/stats', getStats);

// 切换置顶状态
router.post('/:id/toggle-top', toggleTopStatus);

export default router;
