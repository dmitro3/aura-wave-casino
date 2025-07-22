
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, TrendingUp, Calendar, Star, DollarSign } from 'lucide-react';
import { UserProfile as UserProfileType } from '@/hooks/useUserProfile';
import { UserProgressSection } from './UserProgressSection';
import { ProfileBorder } from './ProfileBorder';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserProfileType | null;
}

const avatars = [
  "🚀", "🎯", "💎", "⚡", "🔥", "🌟", "🎮", "👑", "🦄", "🐉"
];

const badgeIcons: Record<string, { icon: string; name: string; description: string }> = {
  welcome: { icon: "🎉", name: "Welcome", description: "Joined the platform" },
  firstWin: { icon: "🥇", name: "First Win", description: "Won your first game" },
  bigSpender: { icon: "💰", name: "Big Spender", description: "Wagered over $1,000" },
  lucky: { icon: "🍀", name: "Lucky Streak", description: "Won 5 games in a row" },
  veteran: { icon: "⭐", name: "Veteran", description: "Reached level 10" }
};

export default function UserProfile({ isOpen, onClose, userData }: UserProfileProps) {
  const { stats } = useUserLevelStats();
  
  if (!userData) return null;

  const getAvatar = (username: string) => {
    const index = username.length % avatars.length;
    return avatars[index];
  };

  const xpProgress = userData.xp_to_next_level > 0 
    ? ((userData.current_xp / (userData.current_xp + userData.xp_to_next_level)) * 100)
    : 100;

  const registrationDate = new Date(userData.registration_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalGames = userData.gameStats.coinflip.wins + userData.gameStats.coinflip.losses + 
                    userData.gameStats.crash.wins + userData.gameStats.crash.losses;
  
  const totalWins = userData.gameStats.coinflip.wins + userData.gameStats.crash.wins;
  const winRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(1) : '0';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Player Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Header with Enhanced Border */}
          <div className="flex items-center space-x-4 p-4 glass rounded-lg">
            <ProfileBorder level={stats?.current_level || 1} size="lg">
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl">
                {getAvatar(userData.username)}
              </div>
            </ProfileBorder>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{userData.username}</h3>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined {registrationDate}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                Level {stats?.current_level || userData.current_level}
              </div>
              <div className="text-sm text-muted-foreground">
                {stats?.current_level_xp || userData.current_xp}/{(stats?.current_level_xp || userData.current_xp) + (stats?.xp_to_next_level || userData.xp_to_next_level)} XP
              </div>
            </div>
          </div>

          {/* Enhanced Progress Section */}
          <UserProgressSection />

          {/* Quick Balance Display */}
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">${userData.balance?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game-specific Stats */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Game Performance</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Coinflip</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wins</span>
                    <span className="text-success font-semibold">{userData.gameStats.coinflip.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Losses</span>
                    <span className="text-destructive font-semibold">{userData.gameStats.coinflip.losses}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit</span>
                    <span className={`font-semibold ${userData.gameStats.coinflip.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${userData.gameStats.coinflip.profit.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Crash</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wins</span>
                    <span className="text-success font-semibold">{userData.gameStats.crash.wins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Losses</span>
                    <span className="text-destructive font-semibold">{userData.gameStats.crash.losses}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit</span>
                    <span className={`font-semibold ${userData.gameStats.crash.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${userData.gameStats.crash.profit.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Achievements</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {userData.badges.map((badge) => {
                const badgeInfo = badgeIcons[badge];
                return badgeInfo ? (
                  <Badge key={badge} variant="secondary" className="glass p-2 space-x-2">
                    <span>{badgeInfo.icon}</span>
                    <span>{badgeInfo.name}</span>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
