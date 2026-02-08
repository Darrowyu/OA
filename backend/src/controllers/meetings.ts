import { Request, Response } from 'express';
import { MeetingStatus, UserRole } from '@prisma/client';
import { meetingService, Attendee } from '../services/meetingService';
import logger from '../lib/logger';

// 会议室控制器
export async function getRooms(req: Request, res: Response): Promise<void> {
  try {
    const { page, pageSize, minCapacity, facilities, isActive } = req.query;

    const rooms = await meetingService.findRooms({
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 10,
      minCapacity: minCapacity ? parseInt(minCapacity as string, 10) : undefined,
      facilities: facilities ? (facilities as string).split(',') : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : true,
    });

    res.json({ success: true, data: rooms });
  } catch (error) {
    logger.error('获取会议室列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取会议室列表失败' });
  }
}

export async function getAllRooms(_req: Request, res: Response): Promise<void> {
  try {
    const rooms = await meetingService.getAllActiveRooms();
    res.json({ success: true, data: rooms });
  } catch (error) {
    logger.error('获取所有会议室失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取会议室列表失败' });
  }
}

export async function getRoomById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const room = await meetingService.getRoomById(id);

    if (!room) {
      res.status(404).json({ error: '会议室不存在' });
      return;
    }

    res.json({ success: true, data: room });
  } catch (error) {
    logger.error('获取会议室详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取会议室详情失败' });
  }
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    // 只有管理员可以创建会议室
    if (user.role !== UserRole.ADMIN) {
      res.status(403).json({ error: '无权创建会议室' });
      return;
    }

    const { name, capacity, location, facilities, image, description } = req.body;

    if (!name || !capacity) {
      res.status(400).json({ error: '会议室名称和容量不能为空' });
      return;
    }

    const room = await meetingService.createRoom({
      name,
      capacity: parseInt(capacity, 10),
      location,
      facilities,
      image,
      description,
    });

    res.status(201).json({ success: true, message: '会议室创建成功', data: room });
  } catch (error) {
    logger.error('创建会议室失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '创建会议室失败' });
  }
}

export async function updateRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    // 只有管理员可以更新会议室
    if (user.role !== UserRole.ADMIN) {
      res.status(403).json({ error: '无权更新会议室' });
      return;
    }

    const { id } = req.params;
    const { name, capacity, location, facilities, image, isActive, description } = req.body;

    const room = await meetingService.updateRoom(id, {
      name,
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      location,
      facilities,
      image,
      isActive,
      description,
    });

    res.json({ success: true, message: '会议室更新成功', data: room });
  } catch (error) {
    logger.error('更新会议室失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '更新会议室失败' });
  }
}

export async function deleteRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    // 只有管理员可以删除会议室
    if (user.role !== UserRole.ADMIN) {
      res.status(403).json({ error: '无权删除会议室' });
      return;
    }

    const { id } = req.params;
    await meetingService.deleteRoom(id);

    res.json({ success: true, message: '会议室删除成功' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除会议室失败';
    logger.error('删除会议室失败', { error: message });
    res.status(400).json({ error: message });
  }
}

export async function checkRoomAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { startTime, endTime, excludeMeetingId } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({ error: '开始时间和结束时间不能为空' });
      return;
    }

    const isAvailable = await meetingService.checkRoomAvailability(
      id,
      new Date(startTime as string),
      new Date(endTime as string),
      excludeMeetingId as string | undefined
    );

    res.json({ success: true, data: { isAvailable } });
  } catch (error) {
    logger.error('检查会议室可用性失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '检查会议室可用性失败' });
  }
}

export async function getRoomBookings(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      res.status(400).json({ error: '日期不能为空' });
      return;
    }

    const bookings = await meetingService.getRoomBookings(id, new Date(date as string));
    res.json({ success: true, data: bookings });
  } catch (error) {
    logger.error('获取会议室预订情况失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取会议室预订情况失败' });
  }
}

// 会议控制器
export async function getMeetings(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { page, pageSize, startDate, endDate, status, roomId, type } = req.query;

    // 根据类型查询会议
    if (type === 'organized') {
      const meetings = await meetingService.getUserMeetings(
        user.id,
        'organized',
        {
          page: page ? parseInt(page as string, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize as string, 10) : 10,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          status: status as MeetingStatus | undefined,
        }
      );
      res.json({ success: true, data: meetings });
      return;
    }

    if (type === 'attending') {
      const meetings = await meetingService.getUserMeetings(
        user.id,
        'attending',
        {
          page: page ? parseInt(page as string, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize as string, 10) : 10,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          status: status as MeetingStatus | undefined,
        }
      );
      res.json({ success: true, data: meetings });
      return;
    }

    // 默认查询（管理员可查看全部）
    const meetings = await meetingService.findMeetings({
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 10,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as MeetingStatus | undefined,
      roomId: roomId as string | undefined,
    });

    res.json({ success: true, data: meetings });
  } catch (error) {
    logger.error('获取会议列表失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取会议列表失败' });
  }
}

export async function getMeetingById(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const meeting = await meetingService.getMeetingById(id);

    if (!meeting) {
      res.status(404).json({ error: '会议不存在' });
      return;
    }

    // 权限检查：组织者、参与者或管理员可以查看
    const isOrganizer = meeting.organizerId === user.id;
    const isAttendee = meeting.attendees?.some((a: Attendee) => a.userId === user.id);
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOrganizer && !isAttendee && !isAdmin) {
      res.status(403).json({ error: '无权查看此会议' });
      return;
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    logger.error('获取会议详情失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '获取会议详情失败' });
  }
}

export async function createMeeting(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { title, description, roomId, startTime, endTime, attendees } = req.body;

    if (!title || !startTime || !endTime) {
      res.status(400).json({ error: '标题、开始时间和结束时间不能为空' });
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      res.status(400).json({ error: '结束时间必须晚于开始时间' });
      return;
    }

    const meeting = await meetingService.createMeeting(
      {
        title,
        description,
        roomId,
        startTime: startDate,
        endTime: endDate,
        attendees,
      },
      user.id
    );

    res.status(201).json({ success: true, message: '会议创建成功', data: meeting });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建会议失败';
    logger.error('创建会议失败', { error: message });
    res.status(400).json({ error: message });
  }
}

export async function updateMeeting(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { title, description, roomId, startTime, endTime, attendees } = req.body;

    // 检查权限
    const existingMeeting = await meetingService.getMeetingById(id);
    if (!existingMeeting) {
      res.status(404).json({ error: '会议不存在' });
      return;
    }

    const isOrganizer = existingMeeting.organizerId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: '无权更新此会议' });
      return;
    }

    const updateData: Parameters<typeof meetingService.updateMeeting>[1] = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (roomId !== undefined) updateData.roomId = roomId;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (attendees !== undefined) updateData.attendees = attendees;

    const meeting = await meetingService.updateMeeting(id, updateData);

    res.json({ success: true, message: '会议更新成功', data: meeting });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新会议失败';
    logger.error('更新会议失败', { error: message });
    res.status(400).json({ error: message });
  }
}

export async function cancelMeeting(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    // 检查权限
    const existingMeeting = await meetingService.getMeetingById(id);
    if (!existingMeeting) {
      res.status(404).json({ error: '会议不存在' });
      return;
    }

    const isOrganizer = existingMeeting.organizerId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: '无权取消此会议' });
      return;
    }

    // 只能取消已预定或进行中的会议
    if (existingMeeting.status === MeetingStatus.CANCELLED) {
      res.status(400).json({ error: '会议已取消' });
      return;
    }

    if (existingMeeting.status === MeetingStatus.COMPLETED) {
      res.status(400).json({ error: '会议已完成，无法取消' });
      return;
    }

    await meetingService.cancelMeeting(id);

    res.json({ success: true, message: '会议已取消' });
  } catch (error) {
    logger.error('取消会议失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '取消会议失败' });
  }
}

export async function completeMeeting(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;

    // 检查权限
    const existingMeeting = await meetingService.getMeetingById(id);
    if (!existingMeeting) {
      res.status(404).json({ error: '会议不存在' });
      return;
    }

    const isOrganizer = existingMeeting.organizerId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: '无权完成此会议' });
      return;
    }

    // 只能完成已预定或进行中的会议
    if (existingMeeting.status === MeetingStatus.CANCELLED) {
      res.status(400).json({ error: '会议已取消' });
      return;
    }

    if (existingMeeting.status === MeetingStatus.COMPLETED) {
      res.status(400).json({ error: '会议已完成' });
      return;
    }

    await meetingService.completeMeeting(id);

    res.json({ success: true, message: '会议已标记为完成' });
  } catch (error) {
    logger.error('完成会议失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '完成会议失败' });
  }
}

export async function updateMinutes(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { minutes } = req.body;

    if (minutes === undefined) {
      res.status(400).json({ error: '会议纪要不能为空' });
      return;
    }

    // 检查权限
    const existingMeeting = await meetingService.getMeetingById(id);
    if (!existingMeeting) {
      res.status(404).json({ error: '会议不存在' });
      return;
    }

    const isOrganizer = existingMeeting.organizerId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: '无权更新会议纪要' });
      return;
    }

    await meetingService.updateMinutes(id, minutes);

    res.json({ success: true, message: '会议纪要更新成功' });
  } catch (error) {
    logger.error('更新会议纪要失败', { error: error instanceof Error ? error.message : '未知错误' });
    res.status(500).json({ error: '更新会议纪要失败' });
  }
}

export async function updateAttendeeStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: '未登录' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['PENDING', 'ACCEPTED', 'DECLINED'].includes(status)) {
      res.status(400).json({ error: '无效的状态' });
      return;
    }

    await meetingService.updateAttendeeStatus(id, user.id, status);

    res.json({ success: true, message: '参会状态更新成功' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新参会状态失败';
    logger.error('更新参会状态失败', { error: message });
    res.status(400).json({ error: message });
  }
}
