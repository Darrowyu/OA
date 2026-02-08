import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  importUsers,
  getFactoryManagers,
  getManagers,
  getContacts,
  getContactDetail,
  exportContacts,
} from '../controllers/users';
import { authMiddleware, requireRole, requireMinRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有用户路由都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/users/factory-managers
 * @desc    获取厂长列表
 * @access  Private
 */
router.get('/factory-managers', getFactoryManagers);

/**
 * @route   GET /api/users/managers
 * @desc    获取经理列表
 * @access  Private
 */
router.get('/managers', getManagers);

/**
 * @route   GET /api/users
 * @desc    获取用户列表（支持分页、筛选、搜索）
 * @access  Private (Manager+)
 */
router.get('/', requireMinRole(UserRole.MANAGER), getUsers);

/**
 * @route   POST /api/users
 * @desc    创建新用户
 * @access  Private (Admin only)
 */
router.post('/', requireRole(UserRole.ADMIN), createUser);

/**
 * @route   POST /api/users/import
 * @desc    批量导入用户
 * @access  Private (Admin only)
 */
router.post('/import', requireRole(UserRole.ADMIN), importUsers);

/**
 * @route   GET /api/users/:id
 * @desc    获取单个用户信息
 * @access  Private (Manager+ 或用户本人)
 */
router.get('/:id', requireMinRole(UserRole.MANAGER), getUser);

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户信息
 * @access  Private (Admin only)
 */
router.put('/:id', requireRole(UserRole.ADMIN), updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户
 * @access  Private (Admin only)
 */
router.delete('/:id', requireRole(UserRole.ADMIN), deleteUser);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    重置用户密码
 * @access  Private (Admin only)
 */
router.post('/:id/reset-password', requireRole(UserRole.ADMIN), resetPassword);

/**
 * @route   GET /api/users/contacts
 * @desc    获取通讯录列表（支持分页、搜索、部门筛选）
 * @access  Private
 */
router.get('/contacts', getContacts);

/**
 * @route   GET /api/users/export
 * @desc    导出通讯录
 * @access  Private
 */
router.get('/export', exportContacts);

/**
 * @route   GET /api/users/:id/contact
 * @desc    获取通讯录用户详情
 * @access  Private
 */
router.get('/:id/contact', getContactDetail);

export default router;
