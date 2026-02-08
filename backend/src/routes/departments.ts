import { Router } from 'express';
import {
  getTree,
  getList,
  getById,
  create,
  update,
  remove,
  getUsers,
  move,
} from '../controllers/departmentController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有部门路由都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/departments/tree
 * @desc    获取部门树形结构
 * @access  Private
 */
router.get('/tree', getTree);

/**
 * @route   GET /api/departments/list
 * @desc    获取所有部门列表（扁平结构）
 * @access  Private
 */
router.get('/list', getList);

/**
 * @route   GET /api/departments/:id/users
 * @desc    获取部门成员列表
 * @access  Private
 */
router.get('/:id/users', getUsers);

/**
 * @route   GET /api/departments/:id
 * @desc    获取部门详情
 * @access  Private
 */
router.get('/:id', getById);

/**
 * @route   POST /api/departments
 * @desc    创建部门
 * @access  Private (Admin only)
 */
router.post('/', requireRole(UserRole.ADMIN), create);

/**
 * @route   POST /api/departments/:id/move
 * @desc    移动部门
 * @access  Private (Admin only)
 */
router.post('/:id/move', requireRole(UserRole.ADMIN), move);

/**
 * @route   PUT /api/departments/:id
 * @desc    更新部门
 * @access  Private (Admin only)
 */
router.put('/:id', requireRole(UserRole.ADMIN), update);

/**
 * @route   DELETE /api/departments/:id
 * @desc    删除部门
 * @access  Private (Admin only)
 */
router.delete('/:id', requireRole(UserRole.ADMIN), remove);

export default router;
