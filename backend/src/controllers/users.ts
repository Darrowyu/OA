import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { UserRole, Prisma } from '@prisma/client';
import logger from '../lib/logger';
import { success, fail } from '../utils/response';
import { config } from '../config';

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
  departmentId?: string;
  employeeId: string;
  isActive?: boolean;
}

// 更新用户请求类型
interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  departmentId?: string;
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
    departmentId?: string;
    employeeId: string;
  }>;
}



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
      where.department = {
        is: {
          name: { contains: department, mode: 'insensitive' },
        },
      };
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
          isActive: true,
          employeeId: true,
          department: {
            select: {
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
    ]);

    const totalPages = Math.ceil(total / size);

    // 格式化返回数据，将 department 对象转换为字符串
    const formattedUsers = users.map(user => ({
      ...user,
      department: user.department?.name || '',
    }));

    res.json(success(formattedUsers, {
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
    logger.error('获取用户列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取用户列表时发生错误'));
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
        department: { select: { name: true } },
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json(fail('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 权限检查：只有管理员或本人可以查看
    const currentUser = (req as Request & { user: { id: string; role: string } }).user;
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      res.status(403).json(fail('FORBIDDEN', '无权查看此用户信息'));
      return;
    }

    // 格式化返回数据
    const formattedUser = {
      ...user,
      department: user.department?.name || '',
    };

    res.json(success(formattedUser));
  } catch (error) {
    logger.error('获取用户信息失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取用户信息时发生错误'));
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
      departmentId,
      employeeId,
      isActive = true,
    } = req.body as CreateUserRequest;

    // 验证必填字段
    if (!username || !password || !name || !email || !role || !employeeId) {
      res.status(400).json(fail('MISSING_FIELDS', '请填写所有必填字段'));
      return;
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json(fail('INVALID_USERNAME', '用户名只能包含字母、数字和下划线，长度3-20位'));
      return;
    }

    // 验证密码强度
    if (password.length < 6) {
      res.status(400).json(fail('WEAK_PASSWORD', '密码长度至少为6位'));
      return;
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json(fail('INVALID_EMAIL', '邮箱格式不正确'));
      return;
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      res.status(409).json(fail('USERNAME_EXISTS', '用户名已被使用'));
      return;
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json(fail('EMAIL_EXISTS', '邮箱已被注册'));
      return;
    }

    // 检查工号是否已存在
    const existingEmployeeId = await prisma.user.findUnique({ where: { employeeId } });
    if (existingEmployeeId) {
      res.status(409).json(fail('EMPLOYEE_ID_EXISTS', '工号已被使用'));
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email,
        role,
        departmentId: departmentId || null,
        employeeId,
        isActive,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            name: true,
          }
        }
      },
    });

    // 格式化返回数据
    const formattedUser = {
      ...user,
      department: user.department?.name || '',
    };

    res.status(201).json(success(formattedUser));
  } catch (error) {
    logger.error('创建用户失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '创建用户时发生错误'));
  }
}

/**
 * 更新用户
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, role, departmentId, isActive } = req.body as UpdateUserRequest;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json(fail('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 如果更新邮箱，检查是否与其他用户冲突
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        res.status(409).json(fail('EMAIL_EXISTS', '邮箱已被其他用户使用'));
        return;
      }
    }

    // 构建更新数据
    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (departmentId !== undefined) {
      updateData.department = departmentId ? { connect: { id: departmentId } } : { disconnect: true };
    }
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
        departmentId: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            name: true,
          }
        }
      },
    });

    // 格式化返回数据
    const formattedUser = {
      ...user,
      department: user.department?.name || '',
    };

    res.json(success(formattedUser));
  } catch (error) {
    logger.error('更新用户失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '更新用户时发生错误'));
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
      res.status(404).json(fail('USER_NOT_FOUND', '用户不存在'));
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
      res.json(success({ message: '用户已禁用（存在关联申请记录）' }));
      return;
    }

    // 物理删除
    await prisma.user.delete({ where: { id } });
    res.json(success({ message: '用户已删除' }));
  } catch (error) {
    logger.error('删除用户失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '删除用户时发生错误'));
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
      res.status(400).json(fail('WEAK_PASSWORD', '新密码长度至少为6位'));
      return;
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json(fail('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json(success({ message: '密码重置成功' }));
  } catch (error) {
    logger.error('重置密码失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '重置密码时发生错误'));
  }
}

// 导入结果类型
interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; field: string; message: string }>;
}

// 单个导入用户类型
interface ImportUserData {
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  employeeId: string;
}

/**
 * 验证用户数据格式
 */
function validateUserData(userData: ImportUserData, index: number): { valid: boolean; error?: { index: number; field: string; message: string } } {
  // 验证必填字段
  if (!userData.username || !userData.password || !userData.name ||
      !userData.email || !userData.role || !userData.employeeId) {
    return { valid: false, error: { index, field: 'multiple', message: '缺少必填字段' } };
  }

  // 验证用户名格式
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
    return { valid: false, error: { index, field: 'username', message: '用户名格式不正确' } };
  }

  // 验证密码强度
  if (userData.password.length < 6) {
    return { valid: false, error: { index, field: 'password', message: '密码长度不足' } };
  }

  // 验证邮箱格式
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    return { valid: false, error: { index, field: 'email', message: '邮箱格式不正确' } };
  }

  return { valid: true };
}

/**
 * 检查用户是否已存在
 */
async function checkUserExists(userData: ImportUserData): Promise<{ exists: boolean; field?: string }> {
  const existingUsername = await prisma.user.findUnique({ where: { username: userData.username } });
  if (existingUsername) return { exists: true, field: 'username' };

  const existingEmail = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existingEmail) return { exists: true, field: 'email' };

  const existingEmployeeId = await prisma.user.findUnique({ where: { employeeId: userData.employeeId } });
  if (existingEmployeeId) return { exists: true, field: 'employeeId' };

  return { exists: false };
}

/**
 * 创建单个用户
 */
async function createSingleUser(userData: ImportUserData) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  return prisma.user.create({
    data: {
      username: userData.username,
      password: hashedPassword,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      departmentId: userData.departmentId || null,
      employeeId: userData.employeeId,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      department: {
        select: {
          name: true,
        }
      },
      employeeId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * 批量导入用户
 */
export async function importUsers(req: Request, res: Response): Promise<void> {
  try {
    const { users } = req.body as ImportUserRequest;

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json(fail('INVALID_DATA', '请提供有效的用户数据数组'));
      return;
    }

    if (users.length > 100) {
      res.status(400).json(fail('TOO_MANY_USERS', '单次导入用户数量不能超过100'));
      return;
    }

    const results: ImportResult = { success: 0, failed: 0, errors: [] };
    const createdUsers = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];

      // 验证数据格式
      const validation = validateUserData(userData, i);
      if (!validation.valid) {
        results.failed++;
        if (validation.error) results.errors.push(validation.error);
        continue;
      }

      try {
        // 检查用户是否已存在
        const existsCheck = await checkUserExists(userData);
        if (existsCheck.exists) {
          results.failed++;
          results.errors.push({
            index: i,
            field: existsCheck.field || 'unknown',
            message: `${existsCheck.field === 'username' ? '用户名' : existsCheck.field === 'email' ? '邮箱' : '工号'}已存在`,
          });
          continue;
        }

        // 创建用户
        const user = await createSingleUser(userData);
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

    // 格式化返回数据
    const formattedUsers = createdUsers.map(user => ({
      ...user,
      department: user.department?.name || '',
    }));

    res.status(201).json(success({
      imported: formattedUsers,
      summary: { total: users.length, success: results.success, failed: results.failed },
      errors: results.errors,
    }));
  } catch (error) {
    logger.error('导入用户失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '导入用户时发生错误'));
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
        department: {
          select: { name: true }
        },
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // 格式化返回数据
    const formattedManagers = managers.map(manager => ({
      ...manager,
      department: manager.department?.name || '',
    }));

    res.json(success(formattedManagers));
  } catch (error) {
    logger.error('获取厂长列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取厂长列表失败'));
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
        department: {
          select: { name: true }
        },
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // 格式化返回数据
    const formattedManagers = managers.map(manager => ({
      ...manager,
      department: manager.department?.name || '',
    }));

    res.json(success(formattedManagers));
  } catch (error) {
    logger.error('获取经理列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取经理列表失败'));
  }
}

// 通讯录查询参数类型
interface ContactsQueryParams {
  page?: string;
  pageSize?: string;
  departmentId?: string;
  search?: string;
}

/**
 * 获取通讯录列表
 * GET /api/users/contacts
 */
export async function getContacts(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = '1',
      pageSize = '20',
      departmentId,
      search,
    } = req.query as ContactsQueryParams;

    const pageNum = Math.max(1, parseInt(page, 10));
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const skip = (pageNum - 1) * size;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {
      isActive: true,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
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
          employeeId: true,
          phone: true,
          position: true,
          isActive: true,
          createdAt: true,
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: size,
      }),
    ]);

    const totalPages = Math.ceil(total / size);

    // 格式化返回数据
    const formattedUsers = users.map(user => ({
      ...user,
      department: user.department?.name || '',
      departmentId: user.department?.id || '',
    }));

    res.json(success({
      items: formattedUsers,
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
    logger.error('获取通讯录失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取通讯录时发生错误'));
  }
}

/**
 * 获取通讯录用户详情
 * GET /api/users/:id/contact
 */
export async function getContactDetail(req: Request, res: Response): Promise<void> {
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
        employeeId: true,
        phone: true,
        position: true,
        isActive: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
      },
    });

    if (!user) {
      res.status(404).json(fail('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 格式化返回数据
    const formattedUser = {
      ...user,
      department: user.department?.name || '',
      departmentId: user.department?.id || '',
      departmentName: user.department?.name || '',
      manager: user.department?.manager || null,
    };

    res.json(success(formattedUser));
  } catch (error) {
    logger.error('获取用户详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取用户详情时发生错误'));
  }
}

/**
 * 导出通讯录
 * GET /api/users/export
 */
export async function exportContacts(req: Request, res: Response): Promise<void> {
  try {
    const { departmentId, search } = req.query as { departmentId?: string; search?: string };

    // 构建查询条件
    const where: Prisma.UserWhereInput = {
      isActive: true,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询所有符合条件的用户
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        phone: true,
        position: true,
        department: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    // 生成 CSV 内容
    const headers = ['姓名', '工号', '部门', '职位', '邮箱', '电话'];
    const rows = users.map(user => [
      user.name,
      user.employeeId || '',
      user.department?.name || '',
      user.position || '',
      user.email,
      user.phone || '',
    ]);

    // BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="通讯录_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('导出通讯录失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '导出通讯录时发生错误'));
  }
}
