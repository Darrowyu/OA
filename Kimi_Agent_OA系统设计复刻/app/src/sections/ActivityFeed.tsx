import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { activities } from '@/data/mockData';

export function ActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">最新动态</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      {/* Activity List */}
      <ScrollArea className="h-48">
        <div className="space-y-4 pr-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.5 + index * 0.05 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback className="text-xs">{activity.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user.name}</span>{' '}
                  <span className="text-gray-600">{activity.action}</span>{' '}
                  <span className="font-medium text-gray-900">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
