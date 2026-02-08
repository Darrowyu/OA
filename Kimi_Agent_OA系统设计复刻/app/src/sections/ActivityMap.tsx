import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { activityMapData } from '@/data/mockData';

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const viewOptions = ['日视图', '周视图', '月视图'];

export function ActivityMap() {
  const [activeView, setActiveView] = useState('日视图');

  // Calculate position based on time
  const getPosition = (startTime: string, duration: number) => {
    const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const startSlot = 9 * 60; // 09:00
    const endSlot = 16 * 60 + 60; // 16:00 + 1 hour
    const totalMinutes = endSlot - startSlot;
    
    const left = ((start - startSlot) / totalMinutes) * 100;
    const width = (duration / totalMinutes) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">今日日程安排</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {viewOptions.map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeView === view
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Time slots header */}
        <div className="flex justify-between text-xs text-gray-400 mb-4 px-[80px]">
          {timeSlots.map((time) => (
            <span key={time}>{time}</span>
          ))}
        </div>

        {/* Activity rows */}
        <div className="space-y-4">
          {activityMapData.map((activity) => (
            <div key={activity.id} className="flex items-center">
              {/* Activity name */}
              <div className="w-[80px] flex-shrink-0">
                <p className="text-xs text-gray-500">{activity.name}</p>
              </div>

              {/* Timeline track */}
              <div className="flex-1 relative h-8 bg-gray-50 rounded-full">
                {/* Progress bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={getPosition(activity.startTime, activity.duration)}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute h-6 top-1 rounded-full ${activity.color} flex items-center gap-2 px-2`}
                  style={getPosition(activity.startTime, activity.duration)}
                >
                  {/* Avatars */}
                  <div className="flex -space-x-1">
                    {activity.assignees.map((user, idx) => (
                      <Avatar key={idx} className="w-4 h-4 border border-white">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-[8px]">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  
                  {/* Task name */}
                  <span className="text-[10px] text-white font-medium truncate">
                    {activity.task}
                  </span>
                  
                  {/* Progress */}
                  <span className="text-[10px] text-white/80 ml-auto">
                    {activity.progress}%
                  </span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        {/* Current time indicator */}
        <div 
          className="absolute top-6 bottom-0 w-px bg-gray-900"
          style={{ left: 'calc(80px + 33.33%)' }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-900 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}
