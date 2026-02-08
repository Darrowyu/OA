import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/sections/Sidebar';
import { Header } from '@/sections/Header';
import { QuickActions } from '@/sections/QuickActions';
import { StatsCards } from '@/sections/StatsCards';
import { ActivityMap } from '@/sections/ActivityMap';
import { TeamList } from '@/sections/TeamList';
import { UpcomingMeetings } from '@/sections/UpcomingMeetings';
import { TodayProjects } from '@/sections/TodayProjects';
import { MilestoneTracker } from '@/sections/MilestoneTracker';
import { ActivityFeed } from '@/sections/ActivityFeed';
import { TaskDetailModal } from '@/components/TaskDetailModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

function App() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[260px]">
        {/* Header */}
        <Header />

        {/* Dashboard Content */}
        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-6"
        >
          {/* Page Title */}
          <motion.div variants={itemVariants} className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="mb-6">
            <QuickActions />
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants} className="mb-6">
            <StatsCards />
          </motion.div>

          {/* Activity Map + Team + Meetings */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 mb-6">
            <div className="col-span-2">
              <ActivityMap />
            </div>
            <div className="space-y-6">
              <TeamList />
              <UpcomingMeetings />
            </div>
          </motion.div>

          {/* Today Projects */}
          <motion.div variants={itemVariants} className="mb-6">
            <TodayProjects onOpenTask={() => setIsTaskModalOpen(true)} />
          </motion.div>

          {/* Milestone Tracker + Activity Feed */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
            <MilestoneTracker />
            <ActivityFeed />
          </motion.div>
        </motion.main>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
    </div>
  );
}

export default App;
