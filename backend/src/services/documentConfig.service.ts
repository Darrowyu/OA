import { configService } from './config.service';
import logger from '../lib/logger';

/**
 * 文档配置服务
 * 封装从系统配置读取文档相关配置的接口
 */

export interface DocumentConfig {
  /** 单文件大小限制（MB） */
  maxFileSizeMB: number;
  /** 允许的文件类型 */
  allowedFileTypes: string[];
  /** 用户存储配额（MB） */
  userStorageQuotaMB: number;
}

/**
 * 获取文档配置
 */
export async function getDocumentConfig(): Promise<DocumentConfig> {
  try {
    const [maxFileSizeRaw, allowedFileTypesRaw, userQuotaRaw] = await Promise.all([
      configService.getValue<number>('document.maxFileSizeMB', 50),
      configService.getValue<string>('document.allowedFileTypes', 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar'),
      configService.getValue<number>('document.userStorageQuotaMB', 1024),
    ]);

    // 解析文件类型
    const allowedFileTypesStr = allowedFileTypesRaw ?? 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar';
    const allowedFileTypes = allowedFileTypesStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    return {
      maxFileSizeMB: maxFileSizeRaw ?? 50,
      allowedFileTypes,
      userStorageQuotaMB: userQuotaRaw ?? 1024,
    };
  } catch (error) {
    logger.error('获取文档配置失败', { error });
    // 返回默认值
    return {
      maxFileSizeMB: 50,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'],
      userStorageQuotaMB: 1024,
    };
  }
}

/**
 * 获取单文件大小限制（MB）
 */
export async function getMaxFileSizeMB(): Promise<number> {
  try {
    const value = await configService.getValue<number>('document.maxFileSizeMB', 50);
    return value ?? 50;
  } catch (error) {
    logger.error('获取文件大小限制失败', { error });
    return 50;
  }
}

/**
 * 获取单文件大小限制（字节）
 */
export async function getMaxFileSizeBytes(): Promise<number> {
  const mb = await getMaxFileSizeMB();
  return mb * 1024 * 1024;
}

/**
 * 获取允许的文件类型
 */
export async function getAllowedFileTypes(): Promise<string[]> {
  try {
    const typesStr = await configService.getValue<string>(
      'document.allowedFileTypes',
      'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar'
    );
    const safeTypesStr = typesStr ?? 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,zip,rar';
    return safeTypesStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
  } catch (error) {
    logger.error('获取允许的文件类型失败', { error });
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'];
  }
}

/**
 * 获取用户存储配额（MB）
 */
export async function getUserStorageQuotaMB(): Promise<number> {
  try {
    const value = await configService.getValue<number>('document.userStorageQuotaMB', 1024);
    return value ?? 1024;
  } catch (error) {
    logger.error('获取用户存储配额失败', { error });
    return 1024;
  }
}

/**
 * 获取用户存储配额（字节）
 */
export async function getUserStorageQuotaBytes(): Promise<number> {
  const mb = await getUserStorageQuotaMB();
  return mb * 1024 * 1024;
}

/**
 * 验证文件类型是否允许
 * @param filename 文件名
 */
export async function isFileTypeAllowed(filename: string): Promise<boolean> {
  const allowedTypes = await getAllowedFileTypes();
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return allowedTypes.includes(ext);
}

/**
 * 验证文件大小是否允许
 * @param fileSizeBytes 文件大小（字节）
 */
export async function isFileSizeAllowed(fileSizeBytes: number): Promise<boolean> {
  const maxSizeBytes = await getMaxFileSizeBytes();
  return fileSizeBytes <= maxSizeBytes;
}

/**
 * 验证文件
 * @param filename 文件名
 * @param fileSizeBytes 文件大小（字节）
 * @returns 验证结果，包含是否通过和错误信息
 */
export async function validateFile(
  filename: string,
  fileSizeBytes: number
): Promise<{ valid: boolean; error?: string }> {
  // 验证文件类型
  const typeAllowed = await isFileTypeAllowed(filename);
  if (!typeAllowed) {
    const allowedTypes = await getAllowedFileTypes();
    return {
      valid: false,
      error: `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`,
    };
  }

  // 验证文件大小
  const sizeAllowed = await isFileSizeAllowed(fileSizeBytes);
  if (!sizeAllowed) {
    const maxSizeMB = await getMaxFileSizeMB();
    return {
      valid: false,
      error: `文件大小超过限制。最大允许: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查用户是否有足够的存储空间
 * @param currentUsageBytes 当前已使用空间（字节）
 * @param newFileSizeBytes 新文件大小（字节）
 */
export async function hasEnoughStorage(
  currentUsageBytes: number,
  newFileSizeBytes: number
): Promise<{ sufficient: boolean; available: number; quota: number }> {
  const quotaBytes = await getUserStorageQuotaBytes();
  const available = quotaBytes - currentUsageBytes;

  return {
    sufficient: available >= newFileSizeBytes,
    available,
    quota: quotaBytes,
  };
}
