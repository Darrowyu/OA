import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Clock,
  Users,
  MapPin,
  Calendar,
  Save,
  Edit2,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Header } from '@/components/Header';
import { meetingApi, Meeting, getMeetingStatusText, getMeetingStatusColor, getAttendeeStatusText, formatMeetingTime } from '@/services/meetings';
import { toast } from 'sonner';

export function MeetingMinutes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const loadMeeting = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const res = await meetingApi.getMeetingById(id);
      if (res.data.success) {
        setMeeting(res.data.data);
        setMinutes(res.data.data.minutes || '');

        // 检查当前用户是否是组织者
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsOrganizer(res.data.data.organizerId === user.id || user.role === 'ADMIN');
        }
      }
    } catch {
      toast.error('加载会议详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await meetingApi.updateMinutes(id, minutes);
      toast.success('会议纪要保存成功');
      setIsEditing(false);
      loadMeeting();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;

    try {
      await meetingApi.completeMeeting(id);
      toast.success('会议已标记为完成');
      loadMeeting();
    } catch {
      toast.error('操作失败');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">加载中...</div>
        </main>
      </>
    );
  }

  if (!meeting) {
    return (
      <>
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">会议不存在</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/meetings')}>
              返回会议列表
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-6 min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-5xl mx-auto">
          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/meetings')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">会议纪要</h1>
                <p className="text-gray-500 mt-1">{meeting.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getMeetingStatusColor(meeting.status)}>
                {getMeetingStatusText(meeting.status)}
              </Badge>
              {isOrganizer && meeting.status === 'SCHEDULED' && (
                <Button size="sm" onClick={handleComplete}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  标记完成
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：会议信息 */}
            <div className="space-y-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    会议信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">会议标题</label>
                    <p className="font-medium">{meeting.title}</p>
                  </div>
                  {meeting.description && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">会议描述</label>
                      <p className="text-sm text-gray-700">{meeting.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">时间</label>
                    <p className="text-sm flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {formatMeetingTime(meeting.startTime, meeting.endTime)}
                    </p>
                  </div>
                  {meeting.room && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">会议室</label>
                      <p className="text-sm flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {meeting.room.name}（容纳{meeting.room.capacity}人）
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">组织者</label>
                    <p className="text-sm flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      {meeting.organizer.name}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 参会人员 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    参会人员
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {meeting.attendees && meeting.attendees.length > 0 ? (
                    <div className="space-y-2">
                      {meeting.attendees.map((attendee, index) => (
                        <motion.div
                          key={attendee.userId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{attendee.name}</p>
                            <p className="text-xs text-gray-500">{attendee.email}</p>
                          </div>
                          <Badge
                            variant={attendee.status === 'ACCEPTED' ? 'default' : 'secondary'}
                            className={
                              attendee.status === 'ACCEPTED'
                                ? 'bg-green-100 text-green-700'
                                : attendee.status === 'DECLINED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {getAttendeeStatusText(attendee.status)}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">暂无参会人员</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 右侧：会议纪要编辑 */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      会议纪要
                    </CardTitle>
                    {isOrganizer && (
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditing(false);
                                setMinutes(meeting.minutes || '');
                              }}
                            >
                              取消
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                              <Save className="h-4 w-4 mr-1" />
                              {saving ? '保存中...' : '保存'}
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <textarea
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="在此输入会议纪要..."
                      className="w-full h-[500px] p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 font-mono text-sm leading-relaxed"
                    />
                  ) : (
                    <div className="min-h-[500px] p-4 bg-gray-50 rounded-lg">
                      {meeting.minutes ? (
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                          {meeting.minutes}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <FileText className="h-12 w-12 mb-4" />
                          <p>暂无会议纪要</p>
                          {isOrganizer && (
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => setIsEditing(true)}
                            >
                              添加纪要
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default MeetingMinutes;
