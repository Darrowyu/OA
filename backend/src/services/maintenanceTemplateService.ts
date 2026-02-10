import { prisma } from '../lib/prisma'
import type {
  MaintenanceTemplateCreateInput,
  MaintenanceTemplateUpdateInput,
  MaintenanceTemplateQueryParams,
  PaginatedResponse,
  MaintenanceTemplateStatus,
} from '../types/equipment'

export class MaintenanceTemplateService {
  async create(data: MaintenanceTemplateCreateInput, userId: string): Promise<{ id: string; code: string; status: MaintenanceTemplateStatus; createdAt: Date }> {
    const template = await prisma.maintenanceTemplate.create({
      data: { ...data, items: JSON.parse(JSON.stringify(data.items)), createdBy: userId },
      select: { id: true, code: true, status: true, createdAt: true },
    })
    return { ...template, status: template.status as MaintenanceTemplateStatus, createdAt: new Date(template.createdAt) }
  }

  async update(id: string, data: MaintenanceTemplateUpdateInput): Promise<{ id: string; status: MaintenanceTemplateStatus; updatedAt: Date }> {
    const updateData: Record<string, unknown> = { ...data }
    if (data.items) updateData.items = JSON.parse(JSON.stringify(data.items))

    const template = await prisma.maintenanceTemplate.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, updatedAt: true },
    })
    return { ...template, status: template.status as MaintenanceTemplateStatus, updatedAt: new Date(template.updatedAt) }
  }

  async delete(id: string): Promise<void> {
    await prisma.maintenanceTemplate.delete({ where: { id } })
  }

  async getById(id: string): Promise<{
    id: string
    code: string
    name: string
    category: string
    items: unknown
    estimatedTime: number
    status: MaintenanceTemplateStatus
    usageCount: number
    createdBy: string
    createdAt: Date
    updatedAt: Date
  } | null> {
    const template = await prisma.maintenanceTemplate.findUnique({
      where: { id },
    })

    if (!template) return null

    return {
      ...template,
      status: template.status as MaintenanceTemplateStatus,
      items: template.items,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
    }
  }

  async findMany(params: MaintenanceTemplateQueryParams): Promise<PaginatedResponse<{
    id: string
    code: string
    name: string
    category: string
    items: unknown
    estimatedTime: number
    status: MaintenanceTemplateStatus
    usageCount: number
    createdBy: string
    createdAt: Date
  }>> {
    const { page = 1, pageSize = 10, status, category, keyword } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
        { category: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.maintenanceTemplate.count({ where }),
      prisma.maintenanceTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      items: data.map(item => ({
        ...item,
        status: item.status as MaintenanceTemplateStatus,
        items: item.items,
        createdAt: new Date(item.createdAt),
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  async incrementUsage(id: string): Promise<void> {
    await prisma.maintenanceTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    })
  }

  async getCategories(): Promise<string[]> {
    const result = await prisma.maintenanceTemplate.groupBy({
      by: ['category'],
      where: { status: 'ACTIVE' },
      orderBy: { category: 'asc' },
    })
    return result.map(item => item.category)
  }

  async getStatistics(): Promise<{ total: number; active: number; draft: number; totalUsage: number }> {
    const [total, active, draft, aggregateResult] = await Promise.all([
      prisma.maintenanceTemplate.count(),
      prisma.maintenanceTemplate.count({ where: { status: 'ACTIVE' } }),
      prisma.maintenanceTemplate.count({ where: { status: 'DRAFT' } }),
      prisma.maintenanceTemplate.aggregate({ _sum: { usageCount: true } }),
    ])

    return {
      total,
      active,
      draft,
      totalUsage: aggregateResult._sum.usageCount || 0,
    }
  }
}

export const maintenanceTemplateService = new MaintenanceTemplateService()
