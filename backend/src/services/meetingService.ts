import { prisma } from '../lib/prisma'
import { MeetingStatus, Prisma } from '@prisma/client'

// 参会者类型
export interface Attendee {
  userId: string
  name: string
  email: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' // 待确认/已接受/已拒绝
}

// 会议室创建输入
export interface CreateMeetingRoomInput {
  name: string
  capacity: number
  location?: string
  facilities?: string[]
  image?: string
  description?: string
}

// 会议室更新输入
export interface UpdateMeetingRoomInput {
  name?: string
  capacity?: number
  location?: string
  facilities?: string[]
  image?: string
  isActive?: boolean
  description?: string
}

// 会议创建输入
export interface CreateMeetingInput {
  title: string
  description?: string
  roomId?: string
  startTime: Date
  endTime: Date
  attendees?: Attendee[]
}

// 会议更新输入
export interface UpdateMeetingInput {
  title?: string
  description?: string
  roomId?: string | null
  startTime?: Date
  endTime?: Date
  attendees?: Attendee[]
  status?: MeetingStatus
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// 会议室查询参数
export interface MeetingRoomQueryParams {
  page?: number
  pageSize?: number
  minCapacity?: number
  facilities?: string[]
  isActive?: boolean
}

// 会议查询参数
export interface MeetingQueryParams {
  page?: number
  pageSize?: number
  startDate?: Date
  endDate?: Date
  status?: MeetingStatus
  roomId?: string
  organizerId?: string
  userId?: string // 查询用户参与的会议
}

export class MeetingService {
  // ========== 会议室管理 ==========

  // 创建会议室
  async createRoom(data: CreateMeetingRoomInput): Promise<{
    id: string
    name: string
    capacity: number
    location: string | null
    facilities: string[] | null
    image: string | null
    isActive: boolean
    description: string | null
    createdAt: Date
  }> {
    const room = await prisma.meetingRoom.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        location: data.location,
        facilities: data.facilities || undefined,
        image: data.image,
        description: data.description,
      },
    })

    return {
      ...room,
      facilities: room.facilities as string[] | null,
      location: room.location,
      image: room.image,
      description: room.description,
      createdAt: new Date(room.createdAt),
    }
  }

  // 更新会议室
  async updateRoom(id: string, data: UpdateMeetingRoomInput): Promise<{
    id: string
    name: string
    capacity: number
    isActive: boolean
    updatedAt: Date
  }> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.capacity !== undefined) updateData.capacity = data.capacity
    if (data.location !== undefined) updateData.location = data.location
    if (data.facilities !== undefined) updateData.facilities = data.facilities || undefined
    if (data.image !== undefined) updateData.image = data.image
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.description !== undefined) updateData.description = data.description

    const room = await prisma.meetingRoom.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        capacity: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return {
      ...room,
      updatedAt: new Date(room.updatedAt),
    }
  }

  // 删除会议室
  async deleteRoom(id: string): Promise<void> {
    // 检查是否有未来会议使用该会议室
    const futureMeetings = await prisma.meeting.count({
      where: {
        roomId: id,
        endTime: { gt: new Date() },
        status: { not: MeetingStatus.CANCELLED },
      },
    })

    if (futureMeetings > 0) {
      throw new Error('该会议室有未来会议安排，无法删除')
    }

    await prisma.meetingRoom.delete({ where: { id } })
  }

  // 获取会议室详情
  async getRoomById(id: string): Promise<{
    id: string
    name: string
    capacity: number
    location: string | null
    facilities: string[] | null
    image: string | null
    isActive: boolean
    description: string | null
    createdAt: Date
    updatedAt: Date
  } | null> {
    const room = await prisma.meetingRoom.findUnique({
      where: { id },
    })

    if (!room) return null

    return {
      ...room,
      facilities: room.facilities as string[] | null,
      location: room.location,
      image: room.image,
      description: room.description,
      createdAt: new Date(room.createdAt),
      updatedAt: new Date(room.updatedAt),
    }
  }

  // 获取会议室列表
  async findRooms(params: MeetingRoomQueryParams): Promise<PaginatedResponse<{
    id: string
    name: string
    capacity: number
    location: string | null
    facilities: string[] | null
    image: string | null
    isActive: boolean
    description: string | null
    _count: { meetings: number }
  }>> {
    const { page = 1, pageSize = 10, minCapacity, facilities, isActive = true } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (isActive !== undefined) where.isActive = isActive
    if (minCapacity !== undefined) where.capacity = { gte: minCapacity }
    if (facilities && facilities.length > 0) {
      // 使用JSON数组包含查询
      where.AND = facilities.map(f => ({
        facilities: { contains: f, mode: 'insensitive' },
      })) as never
    }

    const [total, data] = await Promise.all([
      prisma.meetingRoom.count({ where }),
      prisma.meetingRoom.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { meetings: true },
          },
        },
      }),
    ])

    return {
      items: data.map(room => ({
        ...room,
        facilities: room.facilities as string[] | null,
        location: room.location,
        image: room.image,
        description: room.description,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  // 获取所有可用会议室（不分页）
  async getAllActiveRooms(): Promise<{
    id: string
    name: string
    capacity: number
    location: string | null
    facilities: string[] | null
    image: string | null
  }[]> {
    const rooms = await prisma.meetingRoom.findMany({
      where: { isActive: true },
      orderBy: { capacity: 'asc' },
      select: {
        id: true,
        name: true,
        capacity: true,
        location: true,
        facilities: true,
        image: true,
      },
    })

    return rooms.map(room => ({
      ...room,
      facilities: room.facilities as string[] | null,
      location: room.location,
      image: room.image,
    }))
  }

  // ========== 会议室可用性检查 ==========

  // 检查会议室在指定时间段是否可用
  async checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string
  ): Promise<boolean> {
    const where: Prisma.MeetingWhereInput = {
      roomId,
      status: { not: MeetingStatus.CANCELLED },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    }

    if (excludeMeetingId) {
      where.id = { not: excludeMeetingId }
    }

    const conflictingMeetings = await prisma.meeting.count({ where })
    return conflictingMeetings === 0
  }

  // 获取会议室某天的预订情况
  async getRoomBookings(roomId: string, date: Date): Promise<{
    id: string
    title: string
    startTime: Date
    endTime: Date
    organizer: { name: string }
  }[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const meetings = await prisma.meeting.findMany({
      where: {
        roomId,
        status: { not: MeetingStatus.CANCELLED },
        AND: [
          { startTime: { lt: endOfDay } },
          { endTime: { gt: startOfDay } },
        ],
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        organizer: {
          select: { name: true },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    return meetings.map(m => ({
      ...m,
      startTime: new Date(m.startTime),
      endTime: new Date(m.endTime),
    }))
  }

  // ========== 会议管理 ==========

  // 创建会议
  async createMeeting(
    data: CreateMeetingInput,
    organizerId: string
  ): Promise<{
    id: string
    title: string
    description: string | null
    roomId: string | null
    startTime: Date
    endTime: Date
    organizerId: string
    attendees: Attendee[] | null
    status: MeetingStatus
    createdAt: Date
  }> {
    // 检查时间冲突
    if (data.roomId) {
      const isAvailable = await this.checkRoomAvailability(
        data.roomId,
        data.startTime,
        data.endTime
      )
      if (!isAvailable) {
        throw new Error('该时间段会议室已被预订')
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        description: data.description,
        roomId: data.roomId,
        startTime: data.startTime,
        endTime: data.endTime,
        organizerId,
        attendees: data.attendees as unknown as Prisma.InputJsonValue || undefined,
        status: MeetingStatus.SCHEDULED,
      },
    })

    return {
      ...meeting,
      description: meeting.description,
      roomId: meeting.roomId,
      attendees: meeting.attendees as unknown as Attendee[] | null,
      startTime: new Date(meeting.startTime),
      endTime: new Date(meeting.endTime),
      createdAt: new Date(meeting.createdAt),
    }
  }

  // 更新会议
  async updateMeeting(
    id: string,
    data: UpdateMeetingInput
  ): Promise<{
    id: string
    title: string
    description: string | null
    roomId: string | null
    startTime: Date
    endTime: Date
    attendees: Attendee[] | null
    status: MeetingStatus
    updatedAt: Date
  }> {
    const existingMeeting = await prisma.meeting.findUnique({ where: { id } })
    if (!existingMeeting) {
      throw new Error('会议不存在')
    }

    // 检查时间冲突（如果修改了时间或会议室）
    if ((data.roomId !== undefined || data.startTime || data.endTime) && data.status !== MeetingStatus.CANCELLED) {
      const roomId = data.roomId !== undefined ? data.roomId : existingMeeting.roomId
      if (roomId) {
        const startTime = data.startTime || existingMeeting.startTime
        const endTime = data.endTime || existingMeeting.endTime

        const isAvailable = await this.checkRoomAvailability(
          roomId,
          startTime,
          endTime,
          id
        )
        if (!isAvailable) {
          throw new Error('该时间段会议室已被预订')
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.roomId !== undefined) updateData.roomId = data.roomId
    if (data.startTime !== undefined) updateData.startTime = data.startTime
    if (data.endTime !== undefined) updateData.endTime = data.endTime
    if (data.attendees !== undefined) updateData.attendees = data.attendees as unknown as Prisma.InputJsonValue || undefined
    if (data.status !== undefined) updateData.status = data.status

    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
    })

    return {
      ...meeting,
      description: meeting.description,
      roomId: meeting.roomId,
      attendees: meeting.attendees as unknown as Attendee[] | null,
      startTime: new Date(meeting.startTime),
      endTime: new Date(meeting.endTime),
      updatedAt: new Date(meeting.updatedAt),
    }
  }

  // 取消会议
  async cancelMeeting(id: string): Promise<void> {
    await prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.CANCELLED },
    })
  }

  // 完成会议
  async completeMeeting(id: string): Promise<void> {
    await prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.COMPLETED },
    })
  }

  // 更新会议纪要
  async updateMinutes(id: string, minutes: string): Promise<void> {
    await prisma.meeting.update({
      where: { id },
      data: { minutes },
    })
  }

  // 获取会议详情
  async getMeetingById(id: string): Promise<{
    id: string
    title: string
    description: string | null
    roomId: string | null
    room: {
      id: string
      name: string
      capacity: number
      location: string | null
    } | null
    startTime: Date
    endTime: Date
    organizerId: string
    organizer: { id: string; name: string; email: string }
    attendees: Attendee[] | null
    status: MeetingStatus
    minutes: string | null
    attachments: unknown[] | null
    createdAt: Date
    updatedAt: Date
  } | null> {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        room: {
          select: { id: true, name: true, capacity: true, location: true },
        },
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!meeting) return null

    return {
      ...meeting,
      description: meeting.description,
      roomId: meeting.roomId,
      room: meeting.room,
      attendees: meeting.attendees as unknown as Attendee[] | null,
      minutes: meeting.minutes,
      attachments: meeting.attachments as unknown as unknown[] | null,
      startTime: new Date(meeting.startTime),
      endTime: new Date(meeting.endTime),
      createdAt: new Date(meeting.createdAt),
      updatedAt: new Date(meeting.updatedAt),
    }
  }

  // 获取会议列表
  async findMeetings(params: MeetingQueryParams): Promise<PaginatedResponse<{
    id: string
    title: string
    description: string | null
    roomId: string | null
    room: { name: string } | null
    startTime: Date
    endTime: Date
    organizerId: string
    organizer: { name: string }
    attendees: Attendee[] | null
    status: MeetingStatus
    createdAt: Date
  }>> {
    const { page = 1, pageSize = 10, startDate, endDate, status, roomId, organizerId, userId } = params
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (roomId) where.roomId = roomId
    if (organizerId) where.organizerId = organizerId

    // 时间范围查询
    if (startDate || endDate) {
      (where.AND as Record<string, unknown>[]) = []
      if (startDate) (where.AND as Record<string, unknown>[]).push({ endTime: { gte: startDate } })
      if (endDate) (where.AND as Record<string, unknown>[]).push({ startTime: { lte: endDate } })
    }

    // 查询数据（注意：JSON字段attendees不能在where中过滤，需要在内存中过滤）
    const [total, data] = await Promise.all([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: {
          room: { select: { name: true } },
          organizer: { select: { name: true } },
        },
      }),
    ])

    // 在内存中过滤 attendees（如果是查询用户参与的会议）
    let filteredData = data
    if (userId) {
      filteredData = data.filter(meeting => {
        const attendees = meeting.attendees as unknown as Attendee[] | null
        return attendees?.some(attendee => attendee.userId === userId)
      })
    }

    return {
      items: filteredData.map(meeting => ({
        ...meeting,
        description: meeting.description,
        roomId: meeting.roomId,
        attendees: meeting.attendees as unknown as Attendee[] | null,
        startTime: new Date(meeting.startTime),
        endTime: new Date(meeting.endTime),
        createdAt: new Date(meeting.createdAt),
      })),
      pagination: {
        total: userId ? filteredData.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((userId ? filteredData.length : total) / pageSize),
      },
    }
  }

  // 获取用户的会议（我组织的/我参与的）
  async getUserMeetings(
    userId: string,
    type: 'organized' | 'attending',
    params: Omit<MeetingQueryParams, 'organizerId' | 'userId'>
  ): Promise<PaginatedResponse<{
    id: string
    title: string
    description: string | null
    roomId: string | null
    room: { name: string } | null
    startTime: Date
    endTime: Date
    organizerId: string
    organizer: { name: string }
    attendees: Attendee[] | null
    status: MeetingStatus
    createdAt: Date
  }>> {
    if (type === 'organized') {
      return this.findMeetings({ ...params, organizerId: userId })
    } else {
      return this.findMeetings({ ...params, userId })
    }
  }

  // 更新参会者状态
  async updateAttendeeStatus(
    meetingId: string,
    userId: string,
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  ): Promise<void> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { attendees: true },
    })

    if (!meeting || !meeting.attendees) {
      throw new Error('会议不存在或无参会者')
    }

    const attendees = meeting.attendees as unknown as Attendee[]
    const attendee = attendees.find(a => a.userId === userId)

    if (!attendee) {
      throw new Error('用户不在参会者列表中')
    }

    attendee.status = status

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { attendees: attendees as unknown as Prisma.JsonArray },
    })
  }

  // 获取即将开始的会议（用于提醒）
  async getUpcomingMeetings(minutes: number = 15): Promise<{
    id: string
    title: string
    startTime: Date
    room: { name: string } | null
    attendees: Attendee[] | null
  }[]> {
    const now = new Date()
    const reminderTime = new Date(now.getTime() + minutes * 60 * 1000)

    const meetings = await prisma.meeting.findMany({
      where: {
        status: MeetingStatus.SCHEDULED,
        startTime: {
          gte: now,
          lte: reminderTime,
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        room: { select: { name: true } },
        attendees: true,
      },
      orderBy: { startTime: 'asc' },
    })

    return meetings.map(m => ({
      ...m,
      startTime: new Date(m.startTime),
      attendees: m.attendees as unknown as Attendee[] | null,
    }))
  }
}

export const meetingService = new MeetingService()
