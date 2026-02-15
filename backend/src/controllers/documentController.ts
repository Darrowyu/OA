import type { Request, Response } from 'express'
import { z } from 'zod'
import { documentService } from '../services/documentService'
import type { DocumentType } from '../services/documentService'
import fs from 'fs'

type AuthRequest = Request & {
  user?: {
    id: string
    role: string
    isActive: boolean
  }
}

// 验证模式
const createFolderSchema = z.object({
  name: z.string().min(1, '文件夹名称不能为空'),
  parentId: z.string().optional().nullable(),
})

const updateFolderSchema = z.object({
  name: z.string().min(1, '文件夹名称不能为空').optional(),
  parentId: z.string().optional().nullable(),
})

const renameDocumentSchema = z.object({
  name: z.string().min(1, '文档名称不能为空'),
})

const moveDocumentSchema = z.object({
  targetFolderId: z.string().min(1, '目标文件夹ID不能为空'),
})

const paginationSchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  folderId: z.string().optional(),
  type: z.enum(['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'JPG', 'JPEG', 'PNG', 'GIF', 'ZIP', 'RAR', 'OTHER']).optional(),
  keyword: z.string().optional(),
})

export const folderController = {
  // 创建文件夹
  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = createFolderSchema.parse(req.body)
    const userId = req.user!.id

    const folder = await documentService.createFolder(data, userId)

    res.status(201).json({
      success: true,
      data: folder,
      message: '文件夹创建成功',
    })
  },

  // 更新文件夹
  async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params
    const data = updateFolderSchema.parse(req.body)
    const userId = req.user!.id

    const folder = await documentService.updateFolder(id, data, userId)

    res.json({
      success: true,
      data: folder,
      message: '文件夹更新成功',
    })
  },

  // 删除文件夹
  async delete(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params
    const userId = req.user!.id
    await documentService.deleteFolder(id, userId)

    res.json({
      success: true,
      message: '文件夹删除成功',
    })
  },

  // 获取文件夹详情
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const folder = await documentService.getFolderById(id)

    if (!folder) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '文件夹不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: folder,
    })
  },

  // 获取文件夹树
  async getTree(_req: Request, res: Response): Promise<void> {
    const tree = await documentService.getFolderTree()

    res.json({
      success: true,
      data: tree,
    })
  },

  // 获取子文件夹
  async getSubFolders(req: Request, res: Response): Promise<void> {
    const { parentId } = req.params
    const folders = await documentService.getSubFolders(parentId || null)

    res.json({
      success: true,
      data: folders,
    })
  },
}

export const documentController = {
  // 上传文档
  async upload(req: AuthRequest, res: Response): Promise<void> {
    const { folderId } = req.body
    const userId = req.user!.id
    const file = req.file

    if (!file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: '请选择要上传的文件' },
      })
      return
    }

    if (!folderId) {
      // 删除已上传的文件
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
      res.status(400).json({
        success: false,
        error: { code: 'NO_FOLDER', message: '请选择目标文件夹' },
      })
      return
    }

    const document = await documentService.uploadDocument(file as Express.Multer.File, folderId, userId)

    res.status(201).json({
      success: true,
      data: document,
      message: '文档上传成功',
    })
  },

  // 更新文档（上传新版本）
  async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params
    const userId = req.user!.id
    const file = req.file

    if (!file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: '请选择要上传的文件' },
      })
      return
    }

    const document = await documentService.updateDocument(id, file as Express.Multer.File, userId)

    res.json({
      success: true,
      data: document,
      message: '文档更新成功',
    })
  },

  // 重命名文档
  async rename(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { name } = renameDocumentSchema.parse(req.body)

    await documentService.renameDocument(id, name)

    res.json({
      success: true,
      message: '文档重命名成功',
    })
  },

  // 移动文档
  async move(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { targetFolderId } = moveDocumentSchema.parse(req.body)

    await documentService.moveDocument(id, targetFolderId)

    res.json({
      success: true,
      message: '文档移动成功',
    })
  },

  // 删除文档（软删除）
  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    await documentService.deleteDocument(id)

    res.json({
      success: true,
      message: '文档已移至回收站',
    })
  },

  // 彻底删除文档
  async permanentlyDelete(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params
    const userId = req.user!.id
    await documentService.permanentlyDeleteDocument(id, userId)

    res.json({
      success: true,
      message: '文档已彻底删除',
    })
  },

  // 获取文档详情
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const document = await documentService.getDocumentById(id)

    if (!document) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '文档不存在' },
      })
      return
    }

    res.json({
      success: true,
      data: document,
    })
  },

  // 分页查询文档
  async findMany(req: Request, res: Response): Promise<void> {
    const query = paginationSchema.parse(req.query)
    const params = {
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
      folderId: query.folderId,
      type: query.type as DocumentType | undefined,
      keyword: query.keyword,
    }

    const result = await documentService.findDocuments(params)

    res.json({
      success: true,
      data: result,
    })
  },

  // 获取文档版本历史
  async getVersions(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const versions = await documentService.getDocumentVersions(id)

    res.json({
      success: true,
      data: versions,
    })
  },

  // 下载文档
  async download(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const document = await documentService.downloadDocument(id)

    if (!document) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '文档不存在' },
      })
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(document.path)) {
      res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: '文件不存在或已被删除' },
      })
      return
    }

    // 设置下载头
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.name)}"`)
    res.setHeader('Content-Length', document.size)

    // 发送文件
    const fileStream = fs.createReadStream(document.path)
    fileStream.pipe(res)
  },

  // 预览文档
  async preview(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const document = await documentService.downloadDocument(id)

    if (!document) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '文档不存在' },
      })
      return
    }

    // 检查文件是否存在
    if (!fs.existsSync(document.path)) {
      res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: '文件不存在或已被删除' },
      })
      return
    }

    // 根据文件类型设置 Content-Type
    const mimeTypes: Record<string, string> = {
      'PDF': 'application/pdf',
      'JPG': 'image/jpeg',
      'JPEG': 'image/jpeg',
      'PNG': 'image/png',
      'GIF': 'image/gif',
      'TXT': 'text/plain',
    }

    const contentType = mimeTypes[document.type] || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)

    // 发送文件
    const fileStream = fs.createReadStream(document.path)
    fileStream.pipe(res)
  },

  // 获取文件统计
  async getStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await documentService.getStatistics()

    res.json({
      success: true,
      data: stats,
    })
  },
}
