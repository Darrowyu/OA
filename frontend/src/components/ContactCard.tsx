import { cn } from '@/lib/utils';
import { Mail, Phone, Briefcase, Building2 } from 'lucide-react';

export interface ContactCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    position?: string;
    department?: string;
    email?: string;
    phone?: string;
    employeeId?: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ContactCard({
  user,
  isSelected = false,
  onClick,
  className,
}: ContactCardProps) {
  // 生成头像占位符
  const getAvatarPlaceholder = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // 生成随机颜色（基于用户名）
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600',
      'bg-teal-100 text-teal-600',
      'bg-red-100 text-red-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
        'hover:bg-gray-50 border border-transparent',
        isSelected
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-50'
          : 'hover:border-gray-200',
        className
      )}
    >
      {/* 头像 */}
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg flex-shrink-0',
          getAvatarColor(user.name)
        )}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getAvatarPlaceholder(user.name)
        )}
      </div>

      {/* 用户信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
          {user.employeeId && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              ({user.employeeId})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
          {user.position && (
            <span className="flex items-center gap-1 truncate">
              <Briefcase className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{user.position}</span>
            </span>
          )}
          {user.department && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{user.department}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {user.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 flex-shrink-0" />
              {user.phone}
            </span>
          )}
          {user.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
