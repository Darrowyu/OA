import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { folderController, documentController } from '../controllers/documentController'
import { authenticate, requireMinRole } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

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

router.post('/folders', asyncHandler(folderController.create))
router.get('/folders/tree', asyncHandler(folderController.getTree))
router.get('/folders/:parentId/subfolders', asyncHandler(folderController.getSubFolders))
router.get('/folders/:id', asyncHandler(folderController.getById))
router.put('/folders/:id', asyncHandler(folderController.update))
router.delete('/folders/:id', asyncHandler(folderController.delete))

// ============================================
// 文档路由 - 根路径 /api/documents
// ============================================

// 上传文档
router.post(
  '/',
  upload.single('file'),
  asyncHandler(documentController.upload)
)

// 更新文档（上传新版本）
router.put(
  '/:id',
  upload.single('file'),
  asyncHandler(documentController.update)
)

// 获取文档列表
router.get('/', asyncHandler(documentController.findMany))

// 获取文档统计
router.get('/statistics', asyncHandler(documentController.getStatistics))

// 获取文档版本历史
router.get('/:id/versions', asyncHandler(documentController.getVersions))

// 下载文档
router.get('/:id/download', asyncHandler(documentController.download))

// 预览文档
router.get('/:id/preview', asyncHandler(documentController.preview))

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
