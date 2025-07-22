import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { ProfileBorder } from './ProfileBorder';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface UserLevelDisplayProps {
  username: string;
  showXP?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserLevelDisplay({ username, showXP = false, size = 'sm', className = '' }: UserLevelDisplayProps) {
  const { stats, loading } = useUserLevelStats();

  if (loading || !stats) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <span className="font-semibold">{username}</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <ProfileBorder level={stats.current_level} size={size}>
          <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative`}>
            {/* Avatar with proper sizing */}
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              alt={`${username} avatar`}
              className="w-full h-full object-cover"
            />
            {/* Level overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
              <span className="text-white text-xs font-bold block text-center leading-none">
                {stats.current_level >= 100 ? <Crown className="w-3 h-3 mx-auto" /> : stats.current_level}
              </span>
            </div>
          </div>
        </ProfileBorder>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${textSizes[size]}`}>{username}</span>
          <Badge variant="outline" className="text-xs px-1 py-0">
            LVL {stats.current_level}
          </Badge>
        </div>
        
        {showXP && (
          <div className="text-xs text-muted-foreground">
            {stats.current_level_xp.toLocaleString()} / {(stats.current_level_xp + stats.xp_to_next_level).toLocaleString()} XP
          </div>
        )}
      </div>
    </div>
  );
}