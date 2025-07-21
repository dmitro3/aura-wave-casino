
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, TrendingUp, Calendar, Star } from 'lucide-react';
import { UserProfile as UserProfileType } from '@/hooks/useUserProfile';

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
  if (!userData) return null;

  const getAvatar = (username: string) => {
    const index = username.length % avatars.length;
    return avatars[index];
  };

  const getXpForNextLevel = (level: number) => level * 100;
  const xpForNext = getXpForNextLevel(userData.level);
  const xpProgress = (userData.xp / xpForNext) * 100;

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
          {/* User Header */}
          <div className="flex items-center space-x-4 p-4 glass rounded-lg">
            <div className="text-4xl">{getAvatar(userData.username)}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{userData.username}</h3>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined {registrationDate}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                Level {userData.level}
              </div>
              <div className="text-sm text-muted-foreground">
                {userData.xp}/{xpForNext} XP
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Experience Progress</span>
              <span>{xpProgress.toFixed(1)}%</span>
            </div>
            <Progress value={xpProgress} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Target className="w-4 h-4" />
                  <span>Gaming Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Games</span>
                  <span className="font-semibold">{totalGames}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-semibold text-success">{winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Wagered</span>
                  <span className="font-semibold">${userData.total_wagered.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Profit & Loss</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-semibold">${userData.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total P&L</span>
                  <span className={`font-semibold ${userData.total_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {userData.total_profit >= 0 ? '+' : ''}${userData.total_profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROI</span>
                  <span className={`font-semibold ${userData.total_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {userData.total_wagered > 0 ? ((userData.total_profit / userData.total_wagered) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

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
