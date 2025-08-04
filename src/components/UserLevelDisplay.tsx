import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { calculateAccurateXPProgress } from "@/lib/levelRequirements";
import { formatXPProgress } from "@/lib/xpUtils";
import { ProfileBorder } from "@/components/ProfileBorder";

interface UserLevelDisplayProps {
  username: string;
  levelStats: {
    current_level: number;
    lifetime_xp: number;
    current_level_xp: number;
    xp_to_next_level: number;
  };
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showXP?: boolean;
}

export function UserLevelDisplay({ 
  username, 
  levelStats, 
  avatarUrl,
  size = 'md', 
  showXP = false 
}: UserLevelDisplayProps) {
  const sizeClasses = {
    sm: {
      container: "gap-2",
      avatar: "w-8 h-8",
      text: "text-sm",
      badge: "text-xs"
    },
    md: {
      container: "gap-3",
      avatar: "w-10 h-10",
      text: "text-base",
      badge: "text-sm"
    },
    lg: {
      container: "gap-4",
      avatar: "w-12 h-12",
      text: "text-lg",
      badge: "text-base"
    }
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg"
  };

  const classes = sizeClasses[size];
  
  // Calculate accurate progress using the level requirements
  const accurateProgress = calculateAccurateXPProgress(levelStats.current_level, levelStats.lifetime_xp);

  return (
    <div className={`flex items-center ${classes.container}`}>
      <ProfileBorder level={levelStats.current_level} size={size}>
        <Avatar className={classes.avatar}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={`${username}'s profile`} />}
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
            {username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </ProfileBorder>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${textSizes[size]}`}>{username}</span>
          <Badge variant="outline" className="text-xs px-1 py-0">
            LVL {levelStats.current_level}
          </Badge>
        </div>
        
        {showXP && (
          <div className="text-xs text-muted-foreground">
            {formatXPProgress(accurateProgress.current_level_xp, accurateProgress.total_xp_needed_for_current_level)}
          </div>
        )}
      </div>
    </div>
  );
}