import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const LevelBadge = ({ level, size = 'sm', showIcon = true }: LevelBadgeProps) => {
  const getLevelColor = (level: number) => {
    if (level >= 15) return 'from-purple-500 to-pink-500';
    if (level >= 10) return 'from-yellow-500 to-orange-500';
    if (level >= 5) return 'from-blue-500 to-cyan-500';
    return 'from-gray-500 to-gray-600';
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Badge 
      className={`
        bg-gradient-to-r ${getLevelColor(level)} 
        text-white border-0 font-semibold
        ${sizeClasses[size]}
      `}
    >
      <div className="flex items-center gap-1">
        {showIcon && <Star className={iconSize[size]} />}
        <span>LVL {level}</span>
      </div>
    </Badge>
  );
};