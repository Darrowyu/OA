import { Announcement, AnnouncementType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// 附件类型
export interface Attachment {
  name: string;
  url: string;
  size: number;
}

// 创建公告数据类型
export interface CreateAnnouncementData {
  title: string;
  content: string;
  type: AnnouncementType;
  targetDepts?: string[];
  isTop?: boolean;
  validFrom: Date;
  validUntil?: Date | null;
  attachments?: Attachment[];
  authorId: string;
}

// 更新公告数据类型
export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  targetDepts?: string[];
  isTop?: boolean;
  validFrom?: Date;
  validUntil?: Date | null;
  attachments?: Attachment[];
}

// 查询选项类型
export interface GetAnnouncementsOptions {
  page?: number;
  pageSize?: number;
  type?: AnnouncementType;
  isTop?: boolean;
  search?: string;
  includeExpired?: boolean;
  userDeptId?: string;
}

// 分页响应类型
export interface PaginatedAnnouncements {
  items: Array<Announcement & { isRead?: boolean; authorName?: string }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 阅读统计类型
export interface ReadStats {
  totalUsers: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
  readUsers: Array<{ id: string; name: string; department: string; readAt: Date }>;
  unreadUsers: Array<{ id: string; name: string; department: string }>;
}

/**
 * 创建公告
 */
export async function createAnnouncement(
  data: CreateAnnouncementData
): Promise<Announcement> {
  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      type: data.type,
      targetDepts: data.targetDepts ? (data.targetDepts as unknown as Prisma.InputJsonValue) : undefined,
      isTop: data.isTop ?? false,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      attachments: data.attachments ? (data.attachments as unknown as Prisma.InputJsonValue) : undefined,
      authorId: data.authorId,
    },
  });

  console.log(`公告创建成功: ${announcement.id}`);
  return announcement;
}

/**
 * 获取公告列表
 */
export async function getAnnouncements(
  userId: string,
  options: GetAnnouncementsOptions = {}
): Promise<PaginatedAnnouncements> {
  const {
    page = 1,
    pageSize = 20,
    type,
    isTop,
    search,
    includeExpired = false,
    userDeptId,
  } = options;

  const now = new Date();

  // 构建查询条件
  const where: Prisma.AnnouncementWhereInput = {
    ...(type && { type }),
    ...(isTop !== undefined && { isTop }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    }),
    // 已生效的公告
    validFrom: { lte: now },
  };

  // 未过期的公告
  if (!includeExpired) {
    where.OR = [
      { validUntil: { equals: Prisma.DbNull } },
      { validUntil: { gt: now } },
    ];
  }

  // 目标部门过滤
  if (userDeptId) {
    if (!where.OR) where.OR = [];
    // 由于类型限制，我们使用另一种方式处理部门过滤
    // 在实际查询后手动过滤
  }

  // 查询总数
  const total = await prisma.announcement.count({ where });

  // 查询数据
  const items = await prisma.announcement.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      reads: {
        where: { userId },
        select: { readAt: true },
      },
    },
    orderBy: [
      { isTop: 'desc' },
      { validFrom: 'desc' },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 处理返回数据，添加已读状态
  const processedItems = items.map((item) => ({
    ...item,
    isRead: item.reads.length > 0,
    authorName: item.author.name,
  }));

  return {
    items: processedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取公告详情
 */
export async function getAnnouncementById(
  id: string,
  userId?: string
): Promise<(Announcement & { isRead?: boolean; authorName?: string }) | null> {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!announcement) {
    return null;
  }

  let isRead = false;
  if (userId) {
    // 查询用户是否已读
    const readRecord = await prisma.announcementRead.findUnique({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId,
        },
      },
    });
    isRead = !!readRecord;

    // 记录阅读
    await recordRead(id, userId);
  }

  return {
    ...announcement,
    isRead: userId ? isRead : undefined,
    authorName: announcement.author.name,
  };
}

/**
 * 记录公告阅读
 */
export async function recordRead(
  announcementId: string,
  userId: string
): Promise<void> {
  try {
    // 使用upsert避免重复记录
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId,
        },
      },
      update: {}, // 已存在则不更新
      create: {
        announcementId,
        userId,
        readAt: new Date(),
      },
    });

    // 增加浏览次数
    await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    // 忽略重复阅读记录的错误
    console.log(`记录阅读状态: ${announcementId}, 用户: ${userId}`);
  }
}

/**
 * 更新公告
 */
export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementData
): Promise<Announcement | null> {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return null;
  }

  const updateData: Prisma.AnnouncementUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.targetDepts !== undefined) {
    updateData.targetDepts = data.targetDepts as unknown as Prisma.InputJsonValue;
  }
  if (data.isTop !== undefined) updateData.isTop = data.isTop;
  if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
  if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
  if (data.attachments !== undefined) {
    updateData.attachments = data.attachments as unknown as Prisma.InputJsonValue;
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: updateData,
  });

  console.log(`公告更新成功: ${id}`);
  return updated;
}

/**
 * 删除公告
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return false;
  }

  await prisma.announcement.delete({
    where: { id },
  });

  console.log(`公告删除成功: ${id}`);
  return true;
}

/**
 * 获取阅读统计
 */
export async function getReadStats(announcementId: string): Promise<ReadStats | null> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });

  if (!announcement) {
    return null;
  }

  // 获取已读用户列表
  const readRecords = await prisma.announcementRead.findMany({
    where: { announcementId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // 获取所有用户（排除已读用户）
  const readUserIds = readRecords.map((r) => r.userId);
  const allUsers = await prisma.user.findMany({
    where: {
      id: { notIn: readUserIds },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  const totalUsers = readRecords.length + allUsers.length;
  const readCount = readRecords.length;
  const unreadCount = allUsers.length;
  const readRate = totalUsers > 0 ? Math.round((readCount / totalUsers) * 100) : 0;

  return {
    totalUsers,
    readCount,
    unreadCount,
    readRate,
    readUsers: readRecords.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      department: r.user.department?.name || '-',
      readAt: r.readAt,
    })),
    unreadUsers: allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      department: u.department?.name || '-',
    })),
  };
}

/**
 * 获取用户未读公告数量
 */
export async function getUnreadCount(
  userId: string,
  userDeptId?: string
): Promise<number> {
  const now = new Date();

  // 获取用户已读的所有公告ID
  const readIds = await prisma.announcementRead.findMany({
    where: { userId },
    select: { announcementId: true },
  });
  const readIdList = readIds.map((r) => r.announcementId);

  // 查询未读且有效的公告数量
  const count = await prisma.announcement.count({
    where: {
      id: { notIn: readIdList },
      validFrom: { lte: now },
      OR: [
        { validUntil: { equals: Prisma.DbNull } },
        { validUntil: { gt: now } },
      ],
    },
  });

  return count;
}

/**
 * 切换置顶状态
 */
export async function toggleTop(
  id: string,
  isTop: boolean
): Promise<Announcement | null> {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return null;
  }

  return prisma.announcement.update({
    where: { id },
    data: { isTop },
  });
}
