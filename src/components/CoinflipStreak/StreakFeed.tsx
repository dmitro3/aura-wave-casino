import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Coins, TrendingUp } from 'lucide-react';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import UserProfile from '../UserProfile';

export default function StreakFeed() {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showUserStats, setShowUserStats] = useState(false);
  const { liveBetFeed, isConnected } = useRealtimeFeeds();

  const handleUsernameClick = (username: string) => {
    setSelectedUsername(username);
    setShowUserStats(true);
  };

  // Filter and sort coinflip streak games by highest multipliers/payouts
  const streakResults = liveBetFeed
    .filter(bet => 
      bet.game_type === 'coinflip' && 
      bet.profit > 0 && 
      bet.multiplier && 
      bet.multiplier >= 3.92 // Only show streaks of 2+ wins
    )
    .sort((a, b) => (b.multiplier || 0) - (a.multiplier || 0))
    .slice(0, 8);

  return (
    <Card className="glass border-0">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-glow-pulse' : 'bg-red-500 animate-pulse'}`} />
          <Trophy className="w-5 h-5 text-primary" />
          <span>High Streak Feed</span>
          <Badge variant="secondary" className="text-xs animate-fade-in">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {streakResults.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No high streaks yet. Be the first to reach 2+ wins!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {streakResults.map((bet) => {
              const streakLength = bet.game_data?.streak_length || Math.floor(Math.log(bet.multiplier || 1) / Math.log(1.98));
              const action = bet.game_data?.action || 'cashed_out';
              
              return (
                <div 
                  key={bet.id} 
                  className="flex items-center justify-between p-3 glass rounded-lg hover:bg-card/80 transition-colors animate-new-item border border-primary/10"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`} />
                      <AvatarFallback className="bg-primary/20">
                        {bet.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors underline-offset-4 hover:underline"
                          onClick={() => handleUsernameClick(bet.username)}
                        >
                          {bet.username}
                        </span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {streakLength} wins
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center space-x-1">
                        <span>reached {(bet.multiplier || 1).toFixed(2)}x and {action.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-success mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-bold text-sm">
                        ${bet.profit.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-primary font-medium">
                      {(bet.multiplier || 1).toFixed(2)}x
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <UserProfile 
        isOpen={showUserStats}
        onClose={() => setShowUserStats(false)}
        username={selectedUsername}
      />
    </Card>
  );
}