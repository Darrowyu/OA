import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { folderController, documentController } from '../controllers/documentController'
import { authenticate, requireMinRole } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { auditMiddleware, manualAudit } from '../middleware/auditMiddleware'
import logger from '../lib/logger'
import { documentPermissionMiddleware } from '../middleware/documentPermission'

const router = Router()

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 文档上传目录
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'documents')

// 确保目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 存储配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // 按日期创建子目录
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const fullDir = path.join(UPLOAD_DIR, yearMonth)

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true })
    }

    cb(null, fullDir)
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.originalname)
    cb(null, `${timestamp}-${random}${ext}`)
  },
})

// 文件过滤器
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedTypes = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.txt', '.jpg', '.jpeg',
    '.png', '.gif', '.zip', '.rar'
  ]
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedTypes.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件类型: ${ext}`))
  }
}

// Multer 实例
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
})

// 所有路由需要认证
router.use(authenticate)

// ============================================
// 文件夹路由 - 路径 /api/documents/folders
// ============================================

router.post('/folders', auditMiddleware({
  action: 'CREATE_FOLDER',
  entityType: 'Folder',
  captureNewValues: true
}), asyncHandler(folderController.create))
router.get('/folders/tree', asyncHandler(folderController.getTree))
router.get('/folders/:parentId/subfolders', asyncHandler(folderController.getSubFolders))
router.get('/folders/:id', asyncHandler(folderController.getById))
router.put('/folders/:id', auditMiddleware({
  action: 'UPDATE_FOLDER',
  entityType: 'Folder',
  entityIdExtractor: (req) => req.params.id,
  captureOldValues: true,
  captureNewValues: true
}), asyncHandler(folderController.update))
router.delete('/folders/:id', auditMiddleware({
  action: 'DELETE_FOLDER',
  entityType: 'Folder',
  entityIdExtractor: (req) => req.params.id,
  captureOldValues: true
}), asyncHandler(folderController.delete))

// ============================================
// 文档路由 - 根路径 /api/documents
// ============================================

// 上传文档 - 带审计日志
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file
    const userId = (req as unknown as { user: { id: string } }).user?.id

    // 记录上传开始日志
    logger.info('文件上传开始', {
      userId,
      originalName: file?.originalname,
      mimeType: file?.mimetype,
      size: file?.size,
      folderId: req.body.folderId,
    })

    try {
      // 执行实际的上传处理
      await documentController.upload(req, res)

      // 记录上传成功审计日志
      if (file) {
        await manualAudit(req, {
          userId: userId || 'unknown',
          action: 'DOCUMENT_UPLOAD',
          entityType: 'Document',
          description: `上传文件: ${file.originalname} (${formatFileSize(file.size)})`,
          newValues: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folderId: req.body.folderId,
          },
        })

        // 记录安全日志
        logger.info('文件上传成功', {
          userId,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          // 预留病毒扫描接口
          virusScanStatus: 'PENDING', // 待集成病毒扫描服务
        })
      }
    } catch (error) {
      // 记录上传失败日志
      logger.error('文件上传失败', {
        userId,
        originalName: file?.originalname,
        error: error instanceof Error ? error.message : '未知错误',
      })
      throw error
    }
  })
)

// 更新文档（上传新版本）- 带审计日志
router.put(
  '/:id',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const file = req.file
    const userId = (req as unknown as { user: { id: string } }).user?.id

    logger.info('文档版本更新开始', {
      userId,
      documentId: id,
      originalName: file?.originalname,
      size: file?.size,
    })

    try {
      await documentController.update(req, res)

      if (file) {
        await manualAudit(req, {
          userId: userId || 'unknown',
          action: 'DOCUMENT_UPDATE_VERSION',
          entityType: 'Document',
          entityId: id,
          description: `更新文档版本: ${file.originalname}`,
          newValues: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          },
        })

        logger.info('文档版本更新成功', {
          userId,
          documentId: id,
          originalName: file.originalname,
          virusScanStatus: 'PENDING',
        })
      }
    } catch (error) {
      logger.error('文档版本更新失败', {
        userId,
        documentId: id,
        error: error instanceof Error ? error.message : '未知错误',
      })
      throw error
    }
  })
)

// 获取文档列表
router.get('/', asyncHandler(documentController.findMany))

// 获取文档统计 - 必须在 /:id 之前定义
router.get('/statistics', asyncHandler(documentController.getStatistics))

// 获取文档版本历史
router.get('/:id/versions', asyncHandler(documentController.getVersions))

// 下载文档 - 需要文档访问权限
router.get(
  '/:id/download',
  documentPermissionMiddleware('download'),
  asyncHandler(documentController.download)
)

// 预览文档 - 需要文档访问权限
router.get(
  '/:id/preview',
  documentPermissionMiddleware('preview'),
  asyncHandler(documentController.preview)
)

// 重命名文档
router.put('/:id/rename', asyncHandler(documentController.rename))

// 移动文档
router.put('/:id/move', asyncHandler(documentController.move))

// 删除文档（软删除）
router.delete('/:id', asyncHandler(documentController.delete))

// 彻底删除文档（管理员）
router.delete(
  '/:id/permanent',
  requireMinRole('MANAGER' as const),
  asyncHandler(documentController.permanentlyDelete)
)

// 获取文档详情 - 必须放在通配符路由最后
router.get('/:id', asyncHandler(documentController.getById))

export default router
