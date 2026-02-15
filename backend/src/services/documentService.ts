import { prisma } from '../lib/prisma'
import path from 'path'
import fs from 'fs'

// 文件类型
export type DocumentType = 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'PPT' | 'PPTX' | 'TXT' | 'JPG' | 'JPEG' | 'PNG' | 'GIF' | 'ZIP' | 'RAR' | 'OTHER'

// 文件夹类型
export interface FolderCreateInput {
  name: string
  parentId?: string | null
}

export interface FolderUpdateInput {
  name?: string
  parentId?: string | null
}

// 文档类型
export interface DocumentCreateInput {
  name: string
  folderId: string
  type: DocumentType
  size: number
  path: string
}

export interface DocumentQueryParams {
  page?: number
  pageSize?: number
  folderId?: string
  type?: DocumentType
  keyword?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// P0-004修复: 白名单文件扩展名
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar']

// P0-004修复: 检查文件扩展名是否在白名单
function isAllowedFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

// 获取文件类型
function getFileType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase()
  const typeMap: Record<string, DocumentType> = {
    '.pdf': 'PDF',
    '.doc': 'DOC',
    '.docx': 'DOCX',
    '.xls': 'XLS',
    '.xlsx': 'XLSX',
    '.ppt': 'PPT',
    '.pptx': 'PPTX',
    '.txt': 'TXT',
    '.jpg': 'JPG',
    '.jpeg': 'JPEG',
    '.png': 'PNG',
    '.gif': 'GIF',
    '.zip': 'ZIP',
    '.rar': 'RAR',
  }
  return typeMap[ext] || 'OTHER'
}

// P0-001修复: 验证文件路径，防止路径遍历攻击
function sanitizeFilePath(filePath: string, baseDir: string): string {
  // 解析为绝对路径
  const resolvedPath = path.resolve(filePath)
  const resolvedBaseDir = path.resolve(baseDir)

  // 确保文件路径在基础目录内
  if (!resolvedPath.startsWith(resolvedBaseDir)) {
    throw new Error('无效的文件路径: 检测到路径遍历攻击')
  }

  return resolvedPath
}

export class DocumentService {
  // ============================================
  // 文件夹操作
  // ============================================

  // 创建文件夹
  async createFolder(data: FolderCreateInput, userId: string): Promise<{
    id: string
    name: string
    parentId: string | null
    ownerId: string
    createdAt: Date
  }> {
    const folder = await prisma.documentFolder.create({
      data: {
        name: data.name,
        parentId: data.parentId || null,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        ownerId: true,
        createdAt: true,
      },
    })

    return {
      ...folder,
      createdAt: new Date(folder.createdAt),
    }
  }

  // 更新文件夹
  async updateFolder(id: string, data: FolderUpdateInput, userId: string): Promise<{
    id: string
    name: string
    updatedAt: Date
  }> {
    // P0-002修复: 验证文件夹所有权
    const folder = await prisma.documentFolder.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!folder) {
      throw new Error('文件夹不存在')
    }

    if (folder.ownerId !== userId) {
      throw new Error('无权操作: 只有文件夹所有者可以更新文件夹')
    }

    const updated = await prisma.documentFolder.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    })

    return {
      ...updated,
      updatedAt: new Date(updated.updatedAt),
    }
  }

  // 删除文件夹
  async deleteFolder(id: string, userId: string): Promise<void> {
    // P0-002修复: 验证文件夹所有权
    const folder = await prisma.documentFolder.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!folder) {
      throw new Error('文件夹不存在')
    }

    if (folder.ownerId !== userId) {
      throw new Error('无权操作: 只有文件夹所有者可以删除文件夹')
    }

    // 检查文件夹是否为空
    const documentCount = await prisma.document.count({
      where: { folderId: id, isActive: true },
    })

    if (documentCount > 0) {
      throw new Error('文件夹不为空，无法删除')
    }

    await prisma.documentFolder.delete({
      where: { id },
    })
  }

  // 获取文件夹详情
  async getFolderById(id: string): Promise<{
    id: string
    name: string
    parentId: string | null
    ownerId: string
    createdAt: Date
    updatedAt: Date
    parent: {
      id: string
      name: string
    } | null
  } | null> {
    const folder = await prisma.documentFolder.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!folder) return null

    return {
      ...folder,
      createdAt: new Date(folder.createdAt),
      updatedAt: new Date(folder.updatedAt),
    }
  }

  // 获取文件夹树
  async getFolderTree(): Promise<{
    id: string
    name: string
    parentId: string | null
    children: unknown[]
  }[]> {
    const folders = await prisma.documentFolder.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    })

    // 构建树形结构
    const buildTree = (parentId: string | null): unknown[] => {
      return folders
        .filter(f => f.parentId === parentId)
        .map(f => ({
          ...f,
          children: buildTree(f.id),
        }))
    }

    return buildTree(null) as {
      id: string
      name: string
      parentId: string | null
      children: unknown[]
    }[]
  }

  // 获取子文件夹
  async getSubFolders(parentId: string | null): Promise<{
    id: string
    name: string
    createdAt: Date
  }[]> {
    const folders = await prisma.documentFolder.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    })

    return folders.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
    }))
  }

  // ============================================
  // 文档操作
  // ============================================

  // 上传文档
  async uploadDocument(
    file: Express.Multer.File,
    folderId: string,
    userId: string
  ): Promise<{
    id: string
    name: string
    type: DocumentType
    size: number
    version: number
    folderId: string
    ownerId: string
    createdAt: Date
  }> {
    // P0-004修复: 验证文件类型白名单
    if (!isAllowedFileType(file.originalname)) {
      // 删除已上传的文件
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
      throw new Error('不支持的文件类型')
    }

    // P0-001修复: 验证文件路径安全
    const uploadDir = process.env.UPLOAD_DIR || 'uploads'
    sanitizeFilePath(file.path, uploadDir)

    const type = getFileType(file.originalname)

    const document = await prisma.document.create({
      data: {
        name: file.originalname,
        folderId,
        type,
        size: file.size,
        path: file.path,
        version: 1,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        version: true,
        folderId: true,
        ownerId: true,
        createdAt: true,
      },
    })

    // 创建初始版本记录
    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        path: file.path,
        size: file.size,
        createdBy: userId,
      },
    })

    return {
      ...document,
      type: document.type as DocumentType,
      createdAt: new Date(document.createdAt),
    }
  }

  // 更新文档（上传新版本）
  async updateDocument(
    id: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<{
    id: string
    name: string
    version: number
    updatedAt: Date
  }> {
    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      throw new Error('文档不存在')
    }

    const newVersion = document.version + 1

    // 更新文档
    const updated = await prisma.document.update({
      where: { id },
      data: {
        path: file.path,
        size: file.size,
        version: newVersion,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        version: true,
        updatedAt: true,
      },
    })

    // 创建版本记录
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        version: newVersion,
        path: file.path,
        size: file.size,
        createdBy: userId,
      },
    })

    return {
      ...updated,
      updatedAt: new Date(updated.updatedAt),
    }
  }

  // 重命名文档
  async renameDocument(id: string, newName: string): Promise<void> {
    await prisma.document.update({
      where: { id },
      data: { name: newName, updatedAt: new Date() },
    })
  }

  // 移动文档
  async moveDocument(id: string, targetFolderId: string): Promise<void> {
    await prisma.document.update({
      where: { id },
      data: { folderId: targetFolderId, updatedAt: new Date() },
    })
  }

  // 删除文档（软删除）
  async deleteDocument(id: string): Promise<void> {
    await prisma.document.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    })
  }

  // 彻底删除文档
  async permanentlyDeleteDocument(id: string, userId: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id },
      include: { versions: true },
    })

    if (!document) return

    // P0-003修复: 验证文档所有权
    if (document.ownerId !== userId) {
      throw new Error('无权操作: 只有文档所有者可以彻底删除文档')
    }

    const uploadDir = process.env.UPLOAD_DIR || 'uploads'

    // 删除所有版本文件
    for (const version of document.versions) {
      try {
        // P0-001修复: 验证文件路径安全
        const safePath = sanitizeFilePath(version.path, uploadDir)
        if (fs.existsSync(safePath)) {
          fs.unlinkSync(safePath)
        }
      } catch (error) {
        console.error(`删除文件失败: ${version.path}`, error)
      }
    }

    // 删除数据库记录
    await prisma.documentVersion.deleteMany({
      where: { documentId: id },
    })

    await prisma.document.delete({
      where: { id },
    })
  }

  // 获取文档详情
  async getDocumentById(id: string): Promise<{
    id: string
    name: string
    type: DocumentType
    size: number
    path: string
    version: number
    folderId: string
    ownerId: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    folder: {
      id: string
      name: string
    }
    owner: {
      id: string
      name: string
    }
  } | null> {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!document) return null

    return {
      ...document,
      type: document.type as DocumentType,
      createdAt: new Date(document.createdAt),
      updatedAt: new Date(document.updatedAt),
    }
  }

  // 分页查询文档
  async findDocuments(params: DocumentQueryParams): Promise<PaginatedResponse<{
    id: string
    name: string
    type: DocumentType
    size: number
    version: number
    folderId: string
    ownerId: string
    createdAt: Date
    updatedAt: Date
    folder: {
      id: string
      name: string
    }
    owner: {
      id: string
      name: string
    }
  }>> {
    const { page = 1, pageSize = 20, folderId, type, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { isActive: true }

    if (folderId) where.folderId = folderId
    if (type) where.type = type
    if (keyword) {
      where.name = { contains: keyword, mode: 'insensitive' }
    }

    const [total, data] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])

    return {
      data: data.map(item => ({
        ...item,
        type: item.type as DocumentType,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // 获取文档版本历史
  async getDocumentVersions(documentId: string): Promise<{
    id: string
    version: number
    size: number
    createdBy: string
    createdAt: Date
  }[]> {
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        size: true,
        createdBy: true,
        createdAt: true,
      },
    })

    return versions.map(v => ({
      ...v,
      createdAt: new Date(v.createdAt),
    }))
  }

  // 获取特定版本文档
  async getDocumentVersion(documentId: string, version: number): Promise<{
    id: string
    path: string
    size: number
    createdBy: string
    createdAt: Date
  } | null> {
    const v = await prisma.documentVersion.findFirst({
      where: { documentId, version },
      select: {
        id: true,
        path: true,
        size: true,
        createdBy: true,
        createdAt: true,
      },
    })

    if (!v) return null

    return {
      ...v,
      createdAt: new Date(v.createdAt),
    }
  }

  // 下载文档
  async downloadDocument(id: string): Promise<{
    path: string
    name: string
    type: DocumentType
    size: number
  } | null> {
    const document = await prisma.document.findUnique({
      where: { id, isActive: true },
    })

    if (!document) return null

    // P0-001修复: 验证文件路径安全
    try {
      const uploadDir = process.env.UPLOAD_DIR || 'uploads'
      sanitizeFilePath(document.path, uploadDir)
    } catch (error) {
      console.error('文件路径验证失败:', error)
      return null
    }

    return {
      path: document.path,
      name: document.name,
      type: document.type as DocumentType,
      size: document.size,
    }
  }

  // 获取文件统计
  async getStatistics(): Promise<{
    totalDocuments: number
    totalSize: number
    byType: Record<string, number>
  }> {
    const documents = await prisma.document.findMany({
      where: { isActive: true },
      select: {
        type: true,
        size: true,
      },
    })

    const byType: Record<string, number> = {}
    let totalSize = 0

    for (const doc of documents) {
      byType[doc.type] = (byType[doc.type] || 0) + 1
      totalSize += doc.size
    }

    return {
      totalDocuments: documents.length,
      totalSize,
      byType,
    }
  }
}

export const documentService = new DocumentService()
