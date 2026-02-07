import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  employeeId?: string;
  name?: string;
  department?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(
  userId: string,
  username: string,
  role: UserRole,
  employeeId?: string,
  name?: string,
  department?: string
): string {
  return jwt.sign(
    { userId, username, role, employeeId, name, department },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * 生成令牌对（访问令牌+刷新令牌）
 */
export function generateTokenPair(
  userId: string,
  username: string,
  role: UserRole
): TokenPair {
  return {
    accessToken: generateAccessToken(userId, username, role),
    refreshToken: generateRefreshToken(userId),
  };
}

/**
 * 验证访问令牌
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

/**
 * 验证刷新令牌
 */
export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
}

/**
 * 从请求头中提取令牌
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
