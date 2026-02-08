import { Request, Response } from 'express';
import logger from '../lib/logger';
import {
  getDepartmentTree,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentUsers,
  moveDepartment,
  getAllDepartments,
  DepartmentData,
} from '../services/departmentService';

// 响应辅助函数
const success = <T>(data: T, meta?: Record<string, unknown>) => ({
  success: true,
  data,
  ...(meta && { meta }),
});

const fail = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, details },
});

/**
 * 获取部门树形结构
 * GET /api/departments/tree
 */
export async function getTree(_req: Request, res: Response): Promise<void> {
  try {
    const tree = await getDepartmentTree();
    res.json(success(tree));
  } catch (error) {
    logger.error('获取部门树失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    res.status(500).json(fail('INTERNAL_ERROR', '获取部门树时发生错误'));
  }
}

/**
 * 获取所有部门列表（扁平结构）
 * GET /api/departments/list
 */
export async function getList(_req: Request, res: Response): Promise<void> {
  try {
    const departments = await getAllDepartments();
    res.json(success(departments));
  } catch (error) {
    logger.error('获取部门列表失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    res.status(500).json(fail('INTERNAL_ERROR', '获取部门列表时发生错误'));
  }
}

/**
 * 根据ID获取部门详情
 * GET /api/departments/:id
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const department = await getDepartmentById(id);

    if (!department) {
      res.status(404).json(fail('DEPARTMENT_NOT_FOUND', '部门不存在'));
      return;
    }

    res.json(success(department));
  } catch (error) {
    logger.error('获取部门详情失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    res.status(500).json(fail('INTERNAL_ERROR', '获取部门详情时发生错误'));
  }
}

/**
 * 创建部门
 * POST /api/departments
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { name, code, parentId, managerId, description, sortOrder, isActive } =
      req.body as DepartmentData;

    // 验证必填字段
    if (!name || !code) {
      res.status(400).json(fail('MISSING_FIELDS', '部门名称和编码为必填项'));
      return;
    }

    // 验证编码格式（只允许字母、数字、连字符和下划线）
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      res
        .status(400)
        .json(
          fail(
            'INVALID_CODE',
            '部门编码只能包含字母、数字、连字符和下划线'
          )
        );
      return;
    }

    const department = await createDepartment({
      name,
      code,
      parentId,
      managerId,
      description,
      sortOrder,
      isActive,
    });

    res.status(201).json(success(department));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '部门编码已存在') {
        res.status(409).json(fail('CODE_EXISTS', error.message));
        return;
      }
      if (error.message === '父部门不存在') {
        res.status(404).json(fail('PARENT_NOT_FOUND', error.message));
        return;
      }
      if (error.message === '负责人不存在') {
        res.status(404).json(fail('MANAGER_NOT_FOUND', error.message));
        return;
      }
    }

    logger.error('创建部门失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    res.status(500).json(fail('INTERNAL_ERROR', '创建部门时发生错误'));
  }
}

/**
 * 更新部门
 * PUT /api/departments/:id
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, code, parentId, managerId, description, sortOrder, isActive } =
      req.body as Partial<DepartmentData>;

    // 如果提供了编码，验证格式
    if (code && !/^[a-zA-Z0-9_-]+$/.test(code)) {
      res
        .status(400)
        .json(
          fail(
            'INVALID_CODE',
            '部门编码只能包含字母、数字、连字符和下划线'
          )
        );
      return;
    }

    const department = await updateDepartment(id, {
      name,
      code,
      parentId,
      managerId,
      description,
      sortOrder,
      isActive,
    });

    res.json(success(department));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '部门不存在') {
        res.status(404).json(fail('DEPARTMENT_NOT_FOUND', error.message));
        return;
      }
      if (error.message === '部门编码已存在') {
        res.status(409).json(fail('CODE_EXISTS', error.message));
        return;
      }
      if (error.message === '父部门不存在') {
        res.status(404).json(fail('PARENT_NOT_FOUND', error.message));
        return;
      }
      if (error.message === '负责人不存在') {
        res.status(404).json(fail('MANAGER_NOT_FOUND', error.message));
        return;
      }
      if (
        error.message === '不能将部门设置为自己的父部门' ||
        error.message === '不能将部门设置为其子部门的子部门'
      ) {
        res.status(400).json(fail('INVALID_PARENT', error.message));
        return;
      }
    }

    logger.error('更新部门失败', {
      error: error instanceof Error ? error.message : '未知错误',
      departmentId: req.params.id,
    });
    res.status(500).json(fail('INTERNAL_ERROR', '更新部门时发生错误'));
  }
}

/**
 * 删除部门
 * DELETE /api/departments/:id
 */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await deleteDepartment(id);
    res.json(success(result));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '部门不存在') {
        res.status(404).json(fail('DEPARTMENT_NOT_FOUND', error.message));
        return;
      }
      if (
        error.message === '该部门存在子部门，无法删除' ||
        error.message === '该部门下存在员工，无法删除'
      ) {
        res.status(409).json(fail('DEPARTMENT_IN_USE', error.message));
        return;
      }
    }

    logger.error('删除部门失败', {
      error: error instanceof Error ? error.message : '未知错误',
      departmentId: req.params.id,
    });
    res.status(500).json(fail('INTERNAL_ERROR', '删除部门时发生错误'));
  }
}

/**
 * 获取部门成员列表
 * GET /api/departments/:id/users
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const users = await getDepartmentUsers(id);
    res.json(success(users));
  } catch (error) {
    if (error instanceof Error && error.message === '部门不存在') {
      res.status(404).json(fail('DEPARTMENT_NOT_FOUND', error.message));
      return;
    }

    logger.error('获取部门成员失败', {
      error: error instanceof Error ? error.message : '未知错误',
      departmentId: req.params.id,
    });
    res.status(500).json(fail('INTERNAL_ERROR', '获取部门成员时发生错误'));
  }
}

/**
 * 移动部门
 * POST /api/departments/:id/move
 */
export async function move(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { parentId } = req.body as { parentId?: string };

    const department = await moveDepartment(id, parentId || null);
    res.json(success(department));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '部门不存在') {
        res.status(404).json(fail('DEPARTMENT_NOT_FOUND', error.message));
        return;
      }
      if (error.message === '不能将部门移动到自己下面') {
        res.status(400).json(fail('INVALID_MOVE', error.message));
        return;
      }
      if (error.message === '不能将部门移动到其子部门下') {
        res.status(400).json(fail('INVALID_MOVE', error.message));
        return;
      }
      if (error.message === '目标父部门不存在') {
        res.status(404).json(fail('PARENT_NOT_FOUND', error.message));
        return;
      }
    }

    logger.error('移动部门失败', {
      error: error instanceof Error ? error.message : '未知错误',
      departmentId: req.params.id,
    });
    res.status(500).json(fail('INTERNAL_ERROR', '移动部门时发生错误'));
  }
}
