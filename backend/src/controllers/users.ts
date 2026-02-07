import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { UserRole, Prisma } from '@prisma/client';

// 查询参数类型
interface UserQueryParams {
  page?: string;
  pageSize?: string;
  role?: UserRole;
  department?: string;
  isActive?: string;
  search?: string;
}

// 创建用户请求类型
interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  employeeId: string;
  isActive?: boolean;
}

// 更新用户请求类型
interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
}

// 批量导入用户请求类型
interface ImportUserRequest {
  users: Array<{
    username: string;
    password: string;
    name: string;
    email: string;
    role: UserRole;
    department: string;
    employeeId: string;
  }>;
}

// 响应辅助函数
const successResponse = <T>(data: T, meta?: Record<string, unknown>) => ({
  success: true,
  data,
  ...(meta && { meta }),
});

const errorResponse = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});

/**
 * 获取用户列表
 */
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = '1',
      pageSize = '20',
      role,
      department,
      isActive,
      search,
    } = req.query as UserQueryParams;

    const pageNum = Math.max(1, parseInt(page, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const skip = (pageNum - 1) * size;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 并行查询总数和数据
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          department: true,
          employeeId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
    ]);

    const totalPages = Math.ceil(total / size);

    res.json(successResponse(users, {
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    }));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '获取用户列表时发生错误'));
  }
}

/**
 * 获取单个用户
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    res.json(successResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '获取用户信息时发生错误'));
  }
}

/**
 * 创建用户
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const {
      username,
      password,
      name,
      email,
      role,
      department,
      employeeId,
      isActive = true,
    } = req.body as CreateUserRequest;

    // 验证必填字段
    if (!username || !password || !name || !email || !role || !department || !employeeId) {
      res.status(400).json(errorResponse('MISSING_FIELDS', '请填写所有必填字段'));
      return;
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json(errorResponse('INVALID_USERNAME', '用户名只能包含字母、数字和下划线，长度3-20位'));
      return;
    }

    // 验证密码强度
    if (password.length < 6) {
      res.status(400).json(errorResponse('WEAK_PASSWORD', '密码长度至少为6位'));
      return;
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json(errorResponse('INVALID_EMAIL', '邮箱格式不正确'));
      return;
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      res.status(409).json(errorResponse('USERNAME_EXISTS', '用户名已被使用'));
      return;
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json(errorResponse('EMAIL_EXISTS', '邮箱已被注册'));
      return;
    }

    // 检查工号是否已存在
    const existingEmployeeId = await prisma.user.findUnique({ where: { employeeId } });
    if (existingEmployeeId) {
      res.status(409).json(errorResponse('EMPLOYEE_ID_EXISTS', '工号已被使用'));
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        role,
        department,
        employeeId,
        isActive,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(successResponse(user));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '创建用户时发生错误'));
  }
}

/**
 * 更新用户
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, role, department, isActive } = req.body as UpdateUserRequest;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 如果更新邮箱，检查是否与其他用户冲突
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        res.status(409).json(errorResponse('EMAIL_EXISTS', '邮箱已被其他用户使用'));
        return;
      }
    }

    // 构建更新数据
    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(successResponse(user));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '更新用户时发生错误'));
  }
}

/**
 * 删除用户
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 检查是否有相关申请记录
    const hasApplications = await prisma.application.count({
      where: { applicantId: id },
    });

    if (hasApplications > 0) {
      // 软删除：禁用用户而不是物理删除
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      res.json(successResponse({ message: '用户已禁用（存在关联申请记录）' }));
      return;
    }

    // 物理删除
    await prisma.user.delete({ where: { id } });
    res.json(successResponse({ message: '用户已删除' }));
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '删除用户时发生错误'));
  }
}

/**
 * 重置用户密码
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { newPassword } = req.body as { newPassword?: string };

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json(errorResponse('WEAK_PASSWORD', '新密码长度至少为6位'));
      return;
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json(successResponse({ message: '密码重置成功' }));
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '重置密码时发生错误'));
  }
}

/**
 * 批量导入用户
 */
export async function importUsers(req: Request, res: Response): Promise<void> {
  try {
    const { users } = req.body as ImportUserRequest;

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json(errorResponse('INVALID_DATA', '请提供有效的用户数据数组'));
      return;
    }

    if (users.length > 100) {
      res.status(400).json(errorResponse('TOO_MANY_USERS', '单次导入用户数量不能超过100'));
      return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ index: number; field: string; message: string }>,
    };

    const createdUsers = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];

      // 验证必填字段
      if (!userData.username || !userData.password || !userData.name ||
          !userData.email || !userData.role || !userData.department || !userData.employeeId) {
        results.failed++;
        results.errors.push({
          index: i,
          field: 'multiple',
          message: '缺少必填字段',
        });
        continue;
      }

      // 验证用户名格式
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
        results.failed++;
        results.errors.push({
          index: i,
          field: 'username',
          message: '用户名格式不正确',
        });
        continue;
      }

      // 验证密码强度
      if (userData.password.length < 6) {
        results.failed++;
        results.errors.push({
          index: i,
          field: 'password',
          message: '密码长度不足',
        });
        continue;
      }

      // 验证邮箱格式
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        results.failed++;
        results.errors.push({
          index: i,
          field: 'email',
          message: '邮箱格式不正确',
        });
        continue;
      }

      try {
        // 检查用户名是否已存在
        const existingUsername = await prisma.user.findUnique({
          where: { username: userData.username },
        });
        if (existingUsername) {
          results.failed++;
          results.errors.push({
            index: i,
            field: 'username',
            message: '用户名已存在',
          });
          continue;
        }

        // 检查邮箱是否已存在
        const existingEmail = await prisma.user.findUnique({
          where: { email: userData.email },
        });
        if (existingEmail) {
          results.failed++;
          results.errors.push({
            index: i,
            field: 'email',
            message: '邮箱已存在',
          });
          continue;
        }

        // 检查工号是否已存在
        const existingEmployeeId = await prisma.user.findUnique({
          where: { employeeId: userData.employeeId },
        });
        if (existingEmployeeId) {
          results.failed++;
          results.errors.push({
            index: i,
            field: 'employeeId',
            message: '工号已存在',
          });
          continue;
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // 创建用户
        const user = await prisma.user.create({
          data: {
            username: userData.username,
            password: hashedPassword,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            department: userData.department,
            employeeId: userData.employeeId,
            isActive: true,
          },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            department: true,
            employeeId: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        createdUsers.push(user);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          field: 'unknown',
          message: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    res.status(201).json(successResponse({
      imported: createdUsers,
      summary: {
        total: users.length,
        success: results.success,
        failed: results.failed,
      },
      errors: results.errors,
    }));
  } catch (error) {
    console.error('Import users error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '导入用户时发生错误'));
  }
}

/**
 * 获取厂长列表
 * GET /api/users/factory-managers
 */
export async function getFactoryManagers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const managers = await prisma.user.findMany({
      where: {
        role: 'FACTORY_MANAGER',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        employeeId: true,
        department: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(successResponse(managers));
  } catch (error) {
    console.error('Get factory managers error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '获取厂长列表失败'));
  }
}

/**
 * 获取经理列表
 * GET /api/users/managers
 */
export async function getManagers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        employeeId: true,
        department: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(successResponse(managers));
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '获取经理列表失败'));
  }
}
