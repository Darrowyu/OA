/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Users, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { useRooms, useMeetings, useMeetingActions } from './hooks/useMeetings';
import { RoomCard } from './components/RoomCard';
import { MeetingItem } from './components/MeetingItem';
import { CreateMeetingDialog } from './components/CreateMeetingDialog';
import { MeetingDetailDialog } from './components/MeetingDetailDialog';
import { RoomBooking } from './RoomBooking';
import { MeetingMinutes } from './MeetingMinutes';
import type { MeetingRoom } from '@/services/meetings';

/**
 * 会议室标签页内容
 */
function RoomsTab({
  rooms,
  isLoading,
  searchQuery,
  setSearchQuery,
  onBook,
}: {
  rooms: MeetingRoom[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onBook: (room: MeetingRoom) => void;
}) {
  const filteredRooms = (rooms || []).filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TabsContent value="rooms" className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索会议室..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} onBook={onBook} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && filteredRooms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>暂无会议室</p>
        </div>
      )}
    </TabsContent>
  );
}

/**
 * 会议列表标签页内容
 */
function MeetingsTab({
  meetings,
  isLoading,
  emptyIcon: EmptyIcon,
  emptyText,
  onView,
  onCancel,
  onComplete,
  showActions,
}: {
  meetings: ReturnType<typeof useMeetings>['meetings'];
  isLoading: boolean;
  emptyIcon: typeof Building2;
  emptyText: string;
  onView: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  showActions?: boolean;
}) {
  // 抑制未使用变量警告（将在后续功能中使用）
  void showActions;
  return (
    <TabsContent value="meetings" className="space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {(meetings || []).map((meeting) => (
              <MeetingItem
                key={meeting.id}
                meeting={meeting}
                onView={onView}
                onCancel={onCancel}
                onComplete={onComplete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && (!meetings || meetings.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <EmptyIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>{emptyText}</p>
        </div>
      )}
    </TabsContent>
  );
}

/**
 * 会议管理主页面
 */
export function MeetingsPage() {
  const [activeTab, setActiveTab] = useState('rooms');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { rooms, isLoading: roomsLoading, fetchRooms } = useRooms();
  const { meetings, isLoading: meetingsLoading, fetchMeetings } = useMeetings();

  const handleRefresh = useCallback(() => {
    fetchRooms();
    fetchMeetings(activeTab === 'organized' ? 'organized' : 'attending');
  }, [fetchRooms, fetchMeetings, activeTab]);

  const { cancelMeeting, completeMeeting } = useMeetingActions(handleRefresh);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      if (tab === 'organized' || tab === 'attending') {
        fetchMeetings(tab as 'organized' | 'attending');
      }
    },
    [fetchMeetings]
  );

  const handleBookRoom = useCallback((room: MeetingRoom) => {
    setSelectedRoom(room);
    setCreateDialogOpen(true);
  }, []);

  const handleViewMeeting = useCallback((id: string) => {
    setSelectedMeetingId(id);
    setDetailDialogOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <>
      <Header />
      <main className="p-4 md:p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">会议管理</h1>
              <p className="text-gray-500 mt-1">会议室预订与会议管理</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建会议
            </Button>
          </div>

          {/* 标签页 */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-white border">
              <TabsTrigger value="rooms" className="data-[state=active]:bg-gray-100">
                <Building2 className="h-4 w-4 mr-2" />
                会议室
              </TabsTrigger>
              <TabsTrigger value="organized" className="data-[state=active]:bg-gray-100">
                <Calendar className="h-4 w-4 mr-2" />
                我组织的
              </TabsTrigger>
              <TabsTrigger value="attending" className="data-[state=active]:bg-gray-100">
                <Users className="h-4 w-4 mr-2" />
                我参与的
              </TabsTrigger>
            </TabsList>

            <RoomsTab
              rooms={rooms}
              isLoading={roomsLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onBook={handleBookRoom}
            />

            {activeTab === 'organized' && (
              <MeetingsTab
                meetings={meetings}
                isLoading={meetingsLoading}
                emptyIcon={Calendar}
                emptyText="暂无会议"
                onView={handleViewMeeting}
                onCancel={cancelMeeting}
                onComplete={completeMeeting}
                showActions
              />
            )}

            {activeTab === 'attending' && (
              <MeetingsTab
                meetings={meetings}
                isLoading={meetingsLoading}
                emptyIcon={Users}
                emptyText="暂无参与的会议"
                onView={handleViewMeeting}
                onCancel={() => {}}
                onComplete={() => {}}
              />
            )}
          </Tabs>
        </div>
      </main>

      <CreateMeetingDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setSelectedRoom(null);
        }}
        onSuccess={handleCreateSuccess}
        initialRoomId={selectedRoom?.id}
      />

      <MeetingDetailDialog
        meetingId={selectedMeetingId}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedMeetingId(null);
        }}
      />
    </>
  );
}

/**
 * 会议模块路由
 */
export function MeetingsModule() {
  return (
    <Routes>
      <Route path="/" element={<MeetingsPage />} />
      <Route path="/booking" element={<RoomBooking />} />
      <Route path="/minutes/:id" element={<MeetingMinutes />} />
    </Routes>
  );
}

export default MeetingsModule;
