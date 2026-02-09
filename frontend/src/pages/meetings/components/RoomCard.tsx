import { Users, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { facilityIcons, facilityNames, type MeetingRoom } from '@/services/meetings';

interface RoomCardProps {
  room: MeetingRoom;
  onBook: (room: MeetingRoom) => void;
}

/**
 * 会议室卡片组件
 */
export function RoomCard({ room, onBook }: RoomCardProps) {
  return (
    <Card
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onBook(room)}
    >
      <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
        {room.image ? (
          <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-white/90">
            <Users className="h-3 w-3 mr-1" />
            {room.capacity}人
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{room.name}</h3>
        {room.location && (
          <p className="text-sm text-gray-500 flex items-center mb-2">
            <MapPin className="h-3 w-3 mr-1" />
            {room.location}
          </p>
        )}
        {room.facilities && room.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {room.facilities.slice(0, 4).map((facility) => (
              <span key={facility} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                {facilityIcons[facility] || '•'} {facilityNames[facility] || facility}
              </span>
            ))}
            {room.facilities.length > 4 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                +{room.facilities.length - 4}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RoomCard;
