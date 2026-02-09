import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { validateFilename, validateFilenames, generateValidationErrorMessage } from '../utils/validation';
import * as logger from '../lib/logger';

// 上传配置常量
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 单个文件最大10MB
  maxTotalSize: 50 * 1024 * 1024, // 总文件大小最大50MB
  allowedFileTypes: ['.pdf'], // 仅允许PDF格式
  uploadDir: path.join(__dirname, '..', '..', 'uploads'), // 上传目录
};

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_CONFIG.uploadDir)) {
  fs.mkdirSync(UPLOAD_CONFIG.uploadDir, { recursive: true });
}

// 生成存储文件名
function generateStoredName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName).toLowerCase();
  return `${timestamp}-${random}${ext}`;
}

// 存储配置
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // 按日期创建子目录
    const now = new Date();
    const dateDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const fullDir = path.join(UPLOAD_CONFIG.uploadDir, dateDir);

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    cb(null, fullDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const storedName = generateStoredName(file.originalname);
    cb(null, storedName);
  },
});

// 文件过滤
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (UPLOAD_CONFIG.allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}。允许的类型: ${UPLOAD_CONFIG.allowedFileTypes.join(', ')}`));
  }
};

// 创建multer实例
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: 10, // 最多10个文件
  },
});

// 单文件上传中间件
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// 多文件上传中间件
export const uploadMultiple = (fieldName: string, maxCount: number = 10) =>
  upload.array(fieldName, maxCount);

// 多字段上传中间件
export const uploadFields = (fields: multer.Field[]) => upload.fields(fields);

// 错误处理中间件
export function handleUploadError(err: Error & { code?: string }, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    // Multer错误
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: `文件大小超过限制，最大允许 ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: `文件数量超过限制，最多允许 10 个文件`,
      });
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        error: '意外的文件字段名',
      });
      return;
    }
    res.status(400).json({ error: `上传错误: ${err.message}` });
    return;
  }

  if (err) {
    // 其他错误
    res.status(400).json({ error: err.message });
    return;
  }

  next();
}

// 文件名验证中间件（单文件）
export function validateFilenameMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    next();
    return;
  }

  const result = validateFilename(req.file.originalname);

  if (!result.isValid) {
    // 删除已上传的文件
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(400).json({
      error: '文件名不符合规范',
      details: result.errors,
      filename: req.file.originalname,
      examples: [
        'xx公司/厂商模具报价单20250101.pdf',
        'xx厂商xx报价明细2025-01-01.pdf',
      ],
    });
    return;
  }

  next();
}

// 文件名验证中间件（多文件）
export function validateFilenamesMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    next();
    return;
  }

  const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  const filenames = files.map(f => f.originalname);
  const results = validateFilenames(filenames);
  const invalidResults = results.filter(r => !r.isValid);

  if (invalidResults.length > 0) {
    // 删除所有已上传的文件
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    const errorMessage = generateValidationErrorMessage(results);

    res.status(400).json({
      error: '以下文件名不符合规范',
      message: errorMessage,
      invalidFiles: invalidResults.map(r => ({
        filename: r.filename,
        errors: r.errors,
      })),
      examples: [
        'xx公司/厂商模具报价单20250101.pdf',
        'xx厂商xx报价明细2025-01-01.pdf',
      ],
    });
    return;
  }

  next();
}

// 清理临时文件
export function cleanupTempFiles(files: Express.Multer.File[]): void {
  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      logger.error(`清理临时文件失败: ${file.path}`, { error });
    }
  }
}

// 获取文件访问URL
export function getFileUrl(storedName: string, dateDir: string): string {
  return `/uploads/${dateDir}/${storedName}`;
}

// 获取文件完整路径
export function getFilePath(storedName: string, dateDir: string): string {
  return path.join(UPLOAD_CONFIG.uploadDir, dateDir, storedName);
}

// 删除文件
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`删除文件失败: ${filePath}`, { error });
    return false;
  }
}

// 获取文件信息
export function getFileInfo(filePath: string): { size: number; createdAt: Date } | null {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
      };
    }
    return null;
  } catch (error) {
    logger.error(`获取文件信息失败: ${filePath}`, { error });
    return null;
  }
}
