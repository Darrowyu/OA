import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { meetingApi, type MeetingRoom, type MeetingListItem } from '@/services/meetings';

interface UseRoomsReturn {
  rooms: MeetingRoom[];
  isLoading: boolean;
  fetchRooms: () => Promise<void>;
}

/**
 * 会议室数据Hook
 */
export function useRooms(): UseRoomsReturn {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await meetingApi.getRooms({ pageSize: 100 });
      if (res.success) {
        setRooms(res.data.items);
      }
    } catch {
      toast.error('加载会议室失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, isLoading, fetchRooms };
}

interface UseMeetingsReturn {
  meetings: MeetingListItem[];
  isLoading: boolean;
  fetchMeetings: (type: 'organized' | 'attending') => Promise<void>;
}

/**
 * 会议列表数据Hook
 */
export function useMeetings(): UseMeetingsReturn {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMeetings = useCallback(async (type: 'organized' | 'attending') => {
    setIsLoading(true);
    try {
      const res = await meetingApi.getMeetings({ type, pageSize: 50 });
      if (res.success) {
        setMeetings(res.data.items);
      }
    } catch {
      toast.error('加载会议列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { meetings, isLoading, fetchMeetings };
}

interface UseMeetingActionsReturn {
  cancelMeeting: (id: string) => Promise<void>;
  completeMeeting: (id: string) => Promise<void>;
}

/**
 * 会议操作Hook
 */
export function useMeetingActions(onSuccess: () => void): UseMeetingActionsReturn {
  const cancelMeeting = useCallback(async (id: string) => {
    try {
      await meetingApi.cancelMeeting(id);
      toast.success('会议已取消');
      onSuccess();
    } catch {
      toast.error('取消会议失败');
    }
  }, [onSuccess]);

  const completeMeeting = useCallback(async (id: string) => {
    try {
      await meetingApi.completeMeeting(id);
      toast.success('会议已标记为完成');
      onSuccess();
    } catch {
      toast.error('操作失败');
    }
  }, [onSuccess]);

  return { cancelMeeting, completeMeeting };
}

export default { useRooms, useMeetings, useMeetingActions };
