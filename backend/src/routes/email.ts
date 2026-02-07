import { Router } from 'express';
// 邮件服务相关函数通过动态导入使用
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @route   POST /api/email/test
 * @desc    测试邮件发送功能（仅管理员）
 * @access  Private (Admin only)
 */
router.post('/test', authMiddleware, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { to, subject, content } = req.body;

    const { sendEmailNotification } = await import('../services/email');
    const success = await sendEmailNotification(
      to,
      subject || '测试邮件',
      content || '<h1>这是一封测试邮件</h1><p>如果您收到此邮件，说明邮件服务配置正确。</p>'
    );

    if (success) {
      res.json({ success: true, message: '测试邮件发送成功' });
    } else {
      res.status(500).json({ success: false, message: '测试邮件发送失败' });
    }
  } catch (error) {
    console.error('发送测试邮件失败:', error);
    res.status(500).json({ success: false, message: '发送测试邮件失败' });
  }
});

export default router;
