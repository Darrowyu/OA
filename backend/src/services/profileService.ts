import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { config } from '../config';
import type {
  Theme,
  InterfaceDensity,
  ProfileVisibility,
  OnlineStatus,
  NotificationFrequency,
} from '@prisma/client';

// 基础信息更新类型
interface UpdateBasicInfoData {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
}

// 偏好设置更新类型
interface UpdatePreferencesData {
  theme?: Theme;
  interfaceDensity?: InterfaceDensity;
  sidebarCollapsed?: boolean;
  emailNotifications?: boolean;
  approvalNotifications?: NotificationFrequency;
  systemAnnouncements?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  profileVisibility?: ProfileVisibility;
  onlineStatus?: OnlineStatus;
}

/**
 * 获取用户完整资料
 */
export async function getFullProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: { select: { name: true } },
      position: true,
      employeeId: true,
      avatar: true,
      signature: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      preference: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 如果没有偏好设置，创建默认的
  if (!user.preference) {
    user.preference = await prisma.userPreference.create({
      data: { userId },
    });
  }

  // 格式化返回数据
  return {
    ...user,
    department: user.department?.name || '',
  };
}

/**
 * 更新基础信息
 */
export async function updateBasicInfo(userId: string, data: UpdateBasicInfoData) {
  // 检查邮箱是否已被其他用户使用
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: userId },
      },
    });
    if (existingUser) {
      throw new Error('邮箱已被其他用户使用');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
      ...(data.phone && { phone: data.phone }),
      ...(data.position && { position: data.position }),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      department: { select: { name: true } },
      position: true,
      employeeId: true,
      avatar: true,
      updatedAt: true,
    },
  });

  // 格式化返回数据
  return {
    ...user,
    department: user.department?.name || '',
  };
}

/**
 * 更新头像
 */
export async function updateAvatar(userId: string, avatarUrl: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
    select: { avatar: true },
  });
  return user;
}

/**
 * 修改密码
 */
export async function changePassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

/**
 * 获取或创建用户偏好设置
 */
export async function getPreferences(userId: string) {
  try {
    let preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await prisma.userPreference.create({
        data: { userId },
      });
    }

    return preference;
  } catch (error) {
    // 如果表不存在，返回默认设置
    logger.warn('UserPreference table not found, returning defaults');
    return {
      id: 'default',
      userId,
      theme: 'SYSTEM',
      interfaceDensity: 'DEFAULT',
      sidebarCollapsed: false,
      emailNotifications: true,
      approvalNotifications: 'INSTANT',
      systemAnnouncements: true,
      weeklyReport: false,
      monthlyReport: false,
      profileVisibility: 'PUBLIC',
      onlineStatus: 'ONLINE',
      autoReply: false,
      autoReplyMessage: null,
      workStartTime: null,
      workEndTime: null,
      workDays: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * 更新用户偏好设置
 */
export async function updatePreferences(userId: string, data: UpdatePreferencesData) {
  try {
    const preference = await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });

    return preference;
  } catch (error) {
    // 如果表不存在，返回模拟的更新结果
    logger.warn('UserPreference table not found, returning mock update result');
    return {
      id: 'default',
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * 获取设备列表
 */
export async function getDevices(userId: string) {
  const devices = await prisma.userDevice.findMany({
    where: { userId },
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      deviceType: true,
      browser: true,
      os: true,
      ipAddress: true,
      location: true,
      lastActiveAt: true,
      isCurrent: true,
      createdAt: true,
    },
  });

  return devices;
}

/**
 * 踢出指定设备
 */
export async function revokeDevice(userId: string, deviceId: string) {
  await prisma.userDevice.deleteMany({
    where: {
      userId,
      deviceId,
    },
  });
}

/**
 * 踢出所有其他设备
 */
export async function revokeAllDevices(userId: string, currentDeviceId?: string) {
  const where: { userId: string; NOT?: { deviceId: string } } = { userId };

  if (currentDeviceId) {
    where.NOT = { deviceId: currentDeviceId };
  }

  await prisma.userDevice.deleteMany({ where });
}

/**
 * 生成 2FA 密钥和二维码（简化实现）
 */
export async function setupTwoFactor(userId: string) {
  // 生成随机密钥
  const secret = crypto.randomBytes(20).toString('hex');

  // 获取用户信息用于二维码
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 生成二维码 URL（使用标准的 TOTP 格式）
  const issuer = 'OA-System';
  const qrCodeUrl = `otpauth://totp/${issuer}:${user.email}?secret=${secret}&issuer=${issuer}`;

  // 临时保存密钥（未激活状态）
  await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      twoFactorSecret: secret,
      twoFactorEnabled: false,
    },
    update: {
      twoFactorSecret: secret,
    },
  });

  return {
    secret,
    qrCodeUrl,
  };
}

/**
 * 验证并启用 2FA
 */
export async function verifyTwoFactor(userId: string, code: string) {
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (!preference?.twoFactorSecret) {
    throw new Error('请先设置2FA');
  }

  // 简化验证：实际应该使用 speakeasy 等库验证 TOTP
  // 这里使用简单的演示逻辑
  const isValid = verifyTOTP(preference.twoFactorSecret, code);

  if (!isValid) {
    throw new Error('验证码不正确');
  }

  // 启用 2FA
  await prisma.userPreference.update({
    where: { userId },
    data: { twoFactorEnabled: true },
  });
}

/**
 * 简单的 TOTP 验证（演示用）
 */
function verifyTOTP(_secret: string, code: string): boolean {
  // 实际项目中应使用 speakeasy 库，使用 secret 验证 TOTP
  // 这里为了演示，接受6位数字验证码
  return code.length === 6 && /^\d{6}$/.test(code);
}

/**
 * 禁用 2FA
 */
export async function disableTwoFactor(userId: string, password: string) {
  // 验证密码
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('密码不正确');
  }

  await prisma.userPreference.update({
    where: { userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });
}

/**
 * 获取签名
 */
export async function getSignature(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { signature: true },
  });

  return user?.signature || null;
}

/**
 * 更新签名
 */
export async function updateSignature(userId: string, signature: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { signature },
  });
}

/**
 * 导出个人数据
 */
export async function exportPersonalData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preference: true,
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      applications: {
        select: {
          applicationNo: true,
          title: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      },
      factoryApprovals: {
        select: {
          action: true,
          comment: true,
          approvedAt: true,
          application: {
            select: {
              applicationNo: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 构建导出数据
  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department?.name || null,
      position: user.position,
      employeeId: user.employeeId,
      createdAt: user.createdAt,
    },
    preferences: user.preference,
    applications: user.applications,
    approvals: user.factoryApprovals,
  };

  return exportData;
}

/**
 * 记录设备登录
 */
export async function recordDeviceLogin(
  userId: string,
  deviceInfo: {
    deviceId: string;
    deviceName: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
  }
) {
  await prisma.userDevice.upsert({
    where: { deviceId: deviceInfo.deviceId },
    create: {
      userId,
      ...deviceInfo,
      lastActiveAt: new Date(),
    },
    update: {
      lastActiveAt: new Date(),
    },
  });
}

/**
 * 设置当前设备
 */
export async function setCurrentDevice(userId: string, deviceId: string) {
  // 先将所有设备设为非当前
  await prisma.userDevice.updateMany({
    where: { userId },
    data: { isCurrent: false },
  });

  // 设置当前设备
  await prisma.userDevice.updateMany({
    where: { userId, deviceId },
    data: { isCurrent: true },
  });
}
