import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import * as profileService from '../services/profileService';

const success = <T>(data: T) => ({ success: true, data });
const fail = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, details },
});

/**
 * 获取当前用户完整个人资料
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const profile = await profileService.getFullProfile(userId);
    res.json(success(profile));
  } catch (error) {
    logger.error('获取个人资料失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取个人资料失败'));
  }
}

/**
 * 更新基础信息
 */
export async function updateBasicInfo(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { name, email, phone, position } = req.body;

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json(fail('INVALID_EMAIL', '邮箱格式不正确'));
      return;
    }

    // 验证手机号格式（中国大陆）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      res.status(400).json(fail('INVALID_PHONE', '手机号格式不正确'));
      return;
    }

    const updated = await profileService.updateBasicInfo(userId, { name, email, phone, position });
    res.json(success(updated));
  } catch (error) {
    logger.error('更新基础信息失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '更新基础信息失败'));
  }
}

/**
 * 更新头像
 */
export async function updateAvatar(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    if (!req.file) {
      res.status(400).json(fail('NO_FILE', '请上传头像文件'));
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updated = await profileService.updateAvatar(userId, avatarUrl);
    res.json(success({ avatar: updated.avatar }));
  } catch (error) {
    logger.error('更新头像失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '更新头像失败'));
  }
}

/**
 * 修改密码
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json(fail('MISSING_FIELDS', '请提供原密码和新密码'));
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json(fail('WEAK_PASSWORD', '新密码长度至少为6位'));
      return;
    }

    // 验证原密码
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json(fail('INVALID_PASSWORD', '原密码不正确'));
      return;
    }

    await profileService.changePassword(userId, newPassword);
    res.json(success({ message: '密码修改成功' }));
  } catch (error) {
    logger.error('修改密码失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '修改密码失败'));
  }
}

/**
 * 获取用户偏好设置
 */
export async function getPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const preferences = await profileService.getPreferences(userId);
    res.json(success(preferences));
  } catch (error) {
    logger.error('获取偏好设置失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取偏好设置失败'));
  }
}

/**
 * 更新用户偏好设置
 */
export async function updatePreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const preferences = await profileService.updatePreferences(userId, req.body);
    res.json(success(preferences));
  } catch (error) {
    logger.error('更新偏好设置失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '更新偏好设置失败'));
  }
}

/**
 * 获取登录设备列表
 */
export async function getDevices(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const devices = await profileService.getDevices(userId);
    res.json(success(devices));
  } catch (error) {
    logger.error('获取设备列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取设备列表失败'));
  }
}

/**
 * 踢出指定设备
 */
export async function revokeDevice(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { deviceId } = req.params;
    await profileService.revokeDevice(userId, deviceId);
    res.json(success({ message: '设备已踢出' }));
  } catch (error) {
    logger.error('踢出设备失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '踢出设备失败'));
  }
}

/**
 * 踢出所有其他设备
 */
export async function revokeAllDevices(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const currentDeviceId = req.headers['x-device-id'] as string;
    await profileService.revokeAllDevices(userId, currentDeviceId);
    res.json(success({ message: '其他设备已踢出' }));
  } catch (error) {
    logger.error('踢出所有设备失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '踢出设备失败'));
  }
}

/**
 * 设置双因素认证
 */
export async function setupTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const result = await profileService.setupTwoFactor(userId);
    res.json(success(result));
  } catch (error) {
    logger.error('设置2FA失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '设置2FA失败'));
  }
}

/**
 * 验证并启用双因素认证
 */
export async function verifyTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).json(fail('MISSING_CODE', '请提供验证码'));
      return;
    }

    await profileService.verifyTwoFactor(userId, code);
    res.json(success({ message: '双因素认证已启用' }));
  } catch (error) {
    logger.error('验证2FA失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(400).json(fail('INVALID_CODE', '验证码不正确'));
  }
}

/**
 * 禁用双因素认证
 */
export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { password } = req.body;
    if (!password) {
      res.status(400).json(fail('MISSING_PASSWORD', '请提供密码确认'));
      return;
    }

    await profileService.disableTwoFactor(userId, password);
    res.json(success({ message: '双因素认证已禁用' }));
  } catch (error) {
    logger.error('禁用2FA失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(400).json(fail('INVALID_PASSWORD', '密码不正确'));
  }
}

/**
 * 获取签名设置
 */
export async function getSignature(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const signature = await profileService.getSignature(userId);
    res.json(success({ signature }));
  } catch (error) {
    logger.error('获取签名失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '获取签名失败'));
  }
}

/**
 * 更新签名
 */
export async function updateSignature(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const { signature } = req.body;
    if (!signature) {
      res.status(400).json(fail('MISSING_SIGNATURE', '请提供签名数据'));
      return;
    }

    await profileService.updateSignature(userId, signature);
    res.json(success({ message: '签名已更新' }));
  } catch (error) {
    logger.error('更新签名失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '更新签名失败'));
  }
}

/**
 * 导出个人数据
 */
export async function exportPersonalData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(fail('UNAUTHORIZED', '未登录'));
      return;
    }

    const data = await profileService.exportPersonalData(userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="personal-data.json"');
    res.json(data);
  } catch (error) {
    logger.error('导出个人数据失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json(fail('INTERNAL_ERROR', '导出个人数据失败'));
  }
}
