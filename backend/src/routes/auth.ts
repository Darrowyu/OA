import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  register,
  refreshToken,
  getCurrentUser,
  changePassword,
  publicChangePassword,
  logout,
} from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 严格速率限制配置 - 用于敏感操作
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 每IP每小时5次
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '尝试次数过多，请1小时后再试',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功请求不计入限制
});

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前登录用户信息
 * @access  Private
 */
router.get('/me', authMiddleware, getCurrentUser);

/**
 * @route   POST /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', authMiddleware, changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', authMiddleware, logout);

/**
 * @route   POST /api/auth/change-password-public
 * @desc    公共修改密码（无需登录）
 * @access  Public
 */
router.post('/change-password-public', strictLimiter, publicChangePassword);

export default router;
