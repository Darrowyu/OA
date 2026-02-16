import { Router } from 'express';
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
router.post('/change-password-public', publicChangePassword);

export default router;
