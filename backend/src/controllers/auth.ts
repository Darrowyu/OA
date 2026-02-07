import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { UserRole } from '@prisma/client';

// 请求类型定义
interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role?: UserRole;
  department: string;
  employeeId: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 响应辅助函数
const successResponse = <T>(data: T) => ({
  success: true,
  data,
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
 * 用户登录
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body as LoginRequest;

    // 验证必填字段
    if (!username || !password) {
      res.status(400).json(errorResponse('MISSING_FIELDS', '用户名和密码不能为空'));
      return;
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json(errorResponse('INVALID_CREDENTIALS', '用户名或密码错误'));
      return;
    }

    // 检查用户状态
    if (!user.isActive) {
      res.status(403).json(errorResponse('USER_INACTIVE', '用户已被禁用，请联系管理员'));
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json(errorResponse('INVALID_CREDENTIALS', '用户名或密码错误'));
      return;
    }

    // 生成令牌
    const tokens = generateTokenPair(user.id, user.username, user.role);

    // 更新最后登录时间（可选）
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    res.json(successResponse({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
      },
      ...tokens,
    }));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '登录过程中发生错误'));
  }
}

/**
 * 用户注册
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const {
      username,
      password,
      name,
      email,
      role = UserRole.USER,
      department,
      employeeId,
    } = req.body as RegisterRequest;

    // 验证必填字段
    if (!username || !password || !name || !email || !department || !employeeId) {
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
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      res.status(409).json(errorResponse('USERNAME_EXISTS', '用户名已被使用'));
      return;
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      res.status(409).json(errorResponse('EMAIL_EXISTS', '邮箱已被注册'));
      return;
    }

    // 检查工号是否已存在
    const existingEmployeeId = await prisma.user.findUnique({
      where: { employeeId },
    });

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
        isActive: true,
      },
    });

    // 生成令牌
    const tokens = generateTokenPair(user.id, user.username, user.role);

    res.status(201).json(successResponse({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
      },
      ...tokens,
    }));
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '注册过程中发生错误'));
  }
}

/**
 * 刷新令牌
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      res.status(400).json(errorResponse('MISSING_TOKEN', '请提供刷新令牌'));
      return;
    }

    // 验证刷新令牌
    const payload = verifyRefreshToken(refreshToken);

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      res.status(401).json(errorResponse('INVALID_TOKEN', '无效的刷新令牌'));
      return;
    }

    // 生成新的令牌对
    const tokens = generateTokenPair(user.id, user.username, user.role);

    res.json(successResponse(tokens));
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json(errorResponse('TOKEN_EXPIRED', '刷新令牌已过期，请重新登录'));
      return;
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      res.status(401).json(errorResponse('INVALID_TOKEN', '无效的刷新令牌'));
      return;
    }

    console.error('Refresh token error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '刷新令牌过程中发生错误'));
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', '请先登录'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
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
    console.error('Get current user error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '获取用户信息时发生错误'));
  }
}

/**
 * 修改密码
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('UNAUTHORIZED', '请先登录'));
      return;
    }

    const { oldPassword, newPassword } = req.body as ChangePasswordRequest;

    if (!oldPassword || !newPassword) {
      res.status(400).json(errorResponse('MISSING_FIELDS', '请提供旧密码和新密码'));
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json(errorResponse('WEAK_PASSWORD', '新密码长度至少为6位'));
      return;
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('USER_NOT_FOUND', '用户不存在'));
      return;
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      res.status(400).json(errorResponse('INVALID_OLD_PASSWORD', '旧密码不正确'));
      return;
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    res.json(successResponse({ message: '密码修改成功' }));
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', '修改密码时发生错误'));
  }
}

/**
 * 用户登出
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  // 由于使用JWT无状态认证，服务端无需特殊处理
  // 客户端需要删除本地存储的令牌
  res.json(successResponse({ message: '登出成功' }));
}
