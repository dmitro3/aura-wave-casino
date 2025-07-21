import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, TrendingUp, Calendar, Star, Gamepad2, Coins, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface UserStats {
  id: string;
  username: string;
  registration_date: string;
  current_level: number;
  lifetime_xp: number;
  current_xp: number;
  xp_to_next_level: number;
  badges: string[];
  total_wagered: number;
  total_profit: number;
  gameStats: {
    crash?: {
      wins: number;
      losses: number;
      total_profit: number;
    };
    coinflip?: {
      wins: number;
      losses: number;
      total_profit: number;
    };
  };
  recentGames: {
    game_type: string;
    bet_amount: number;
    result: string;
    profit: number;
    multiplier?: number;
    created_at: string;
  }[];
}

interface UserStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
}

export default function UserStatsModal({ isOpen, onClose, username }: UserStatsModalProps) {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && username) {
      fetchUserStats(username);
    }
  }, [isOpen, username]);

  const fetchUserStats = async (targetUsername: string) => {
    setLoading(true);
    try {
      // Fetch user profile by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', targetUsername)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      // Fetch game stats
      const { data: gameStats, error: gameStatsError } = await supabase
        .from('game_stats')
        .select('*')
        .eq('user_id', profile.id);

      // Fetch recent games
      const { data: recentGames, error: recentGamesError } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const stats: UserStats = {
        ...profile,
        gameStats: {},
        recentGames: recentGames || []
      };

      // Process game stats
      gameStats?.forEach(stat => {
        stats.gameStats[stat.game_type as keyof typeof stats.gameStats] = {
          wins: stat.wins,
          losses: stat.losses,
          total_profit: stat.total_profit
        };
      });

      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (gameType: keyof typeof userStats.gameStats) => {
    if (!userStats?.gameStats[gameType]) return 0;
    const { wins, losses } = userStats.gameStats[gameType]!;
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  const getGameIcon = (gameType: string) => {
    return gameType === 'crash' ? <Zap className="w-4 h-4" /> : <Coins className="w-4 h-4" />;
  };

  if (!username) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
              <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold">{username}</h2>
              {userStats && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDistanceToNow(new Date(userStats.registration_date), { addSuffix: true })}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : userStats ? (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6">
              {/* Level & XP */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Level & Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">Level {userStats.current_level}</span>
                      <Badge variant="secondary">
                        {userStats.current_xp} / {userStats.current_xp + userStats.xp_to_next_level} XP
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(userStats.current_xp / (userStats.current_xp + userStats.xp_to_next_level)) * 100}%` 
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {userStats.badges.map((badge, index) => (
                        <Badge key={index} variant="outline">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Overall Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">${userStats.total_wagered.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Wagered</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${userStats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {userStats.total_profit >= 0 ? '+' : ''}${userStats.total_profit.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Profit</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Game Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {Object.entries(userStats.gameStats).map(([gameType, stats]) => (
                      <div key={gameType} className="p-4 rounded-lg bg-card/50 border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getGameIcon(gameType)}
                            <span className="font-semibold capitalize">{gameType}</span>
                          </div>
                          <Badge variant="secondary">
                            {getWinRate(gameType as keyof typeof userStats.gameStats)}% Win Rate
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-400">{stats.wins}</div>
                            <div className="text-xs text-muted-foreground">Wins</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-400">{stats.losses}</div>
                            <div className="text-xs text-muted-foreground">Losses</div>
                          </div>
                          <div>
                            <div className={`text-lg font-bold ${stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stats.total_profit >= 0 ? '+' : ''}${stats.total_profit.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Profit</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Games */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Recent Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userStats.recentGames.map((game, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border">
                        <div className="flex items-center gap-3">
                          {getGameIcon(game.game_type)}
                          <div>
                            <div className="font-medium capitalize">{game.game_type}</div>
                            <div className="text-sm text-muted-foreground">
                              ${game.bet_amount} • {game.multiplier ? `${game.multiplier}x` : game.result} • {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {game.profit >= 0 ? '+' : ''}${game.profit.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {userStats.recentGames.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No recent games found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            User not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}