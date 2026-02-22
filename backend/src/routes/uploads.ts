import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadSingle, handleUploadError, getFileUrl, UPLOAD_CONFIG } from '../middleware/upload';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import * as logger from '../lib/logger';

const router = Router();

// 上传文件
router.post(
  '/',
  authenticate,
  uploadSingle('file'),
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '没有上传文件' });
        return;
      }

      const user = req.user;
      if (!user) {
        res.status(401).json({ error: '未登录' });
        return;
      }

      const { applicationId, isApprovalAttachment } = req.body;
      const file = req.file;

      // 从路径中提取日期目录
      const relativePath = path.relative(UPLOAD_CONFIG.uploadDir, file.path);
      const dateDir = path.dirname(relativePath);
      const fileUrl = getFileUrl(file.filename, dateDir);

      // 保存到数据库
      const attachment = await prisma.attachment.create({
        data: {
          filename: file.originalname,
          storedName: file.filename,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype,
          applicationId: applicationId || '', // 临时为空，后续关联
          uploaderId: user.id,
          isApprovalAttachment: isApprovalAttachment === 'true',
        },
      });

      res.status(201).json({
        message: '文件上传成功',
        data: {
          id: attachment.id,
          filename: attachment.filename,
          size: attachment.size,
          mimeType: attachment.mimeType,
          url: fileUrl,
          createdAt: attachment.createdAt,
        },
      });
    } catch (error) {
      logger.error('文件上传失败', { error });
      // 清理上传的文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: '文件上传失败' });
    }
  }
);

// 获取文件列表
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.query;

    const where: Prisma.AttachmentWhereInput = {};
    if (applicationId) {
      where.applicationId = applicationId as string;
    }

    const attachments = await prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    // 添加URL
    const attachmentsWithUrl = attachments.map((att) => {
      const relativePath = path.relative(UPLOAD_CONFIG.uploadDir, att.path);
      const dateDir = path.dirname(relativePath);
      return {
        ...att,
        url: getFileUrl(att.storedName, dateDir),
      };
    });

    res.json({ data: attachmentsWithUrl });
  } catch (error) {
    logger.error('获取文件列表失败', { error });
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 获取单个文件
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    if (!attachment) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    const relativePath = path.relative(UPLOAD_CONFIG.uploadDir, attachment.path);
    const dateDir = path.dirname(relativePath);

    res.json({
      data: {
        ...attachment,
        url: getFileUrl(attachment.storedName, dateDir),
      },
    });
  } catch (error) {
    logger.error('获取文件信息失败', { error });
    res.status(500).json({ error: '获取文件信息失败' });
  }
});

// 删除文件
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    // 权限检查：只有上传者或管理员可以删除
    if (attachment.uploaderId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: '无权删除此文件' });
      return;
    }

    // 删除物理文件
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }

    // 删除数据库记录
    await prisma.attachment.delete({
      where: { id },
    });

    res.json({ message: '文件删除成功' });
  } catch (error) {
    logger.error('删除文件失败', { error });
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 下载文件
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    // 验证文件路径安全 - 防止路径遍历攻击
    const resolvedPath = path.resolve(attachment.path);
    const uploadDir = path.resolve(UPLOAD_CONFIG.uploadDir);
    if (!resolvedPath.startsWith(uploadDir)) {
      logger.warn('检测到非法文件访问尝试', { path: attachment.path, user: req.user?.id });
      res.status(403).json({ error: '无权访问此文件' });
      return;
    }

    if (!fs.existsSync(attachment.path)) {
      res.status(404).json({ error: '文件已不存在' });
      return;
    }

    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
    res.setHeader('Content-Type', attachment.mimeType);

    // 发送文件
    res.sendFile(path.resolve(attachment.path));
  } catch (error) {
    logger.error('下载文件失败', { error });
    res.status(500).json({ error: '下载文件失败' });
  }
});

export default router;
