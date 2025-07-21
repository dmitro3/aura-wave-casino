import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Coins, Zap } from 'lucide-react';
import { useRealtimeFeeds, LiveBetFeed } from '@/hooks/useRealtimeFeeds';
import { formatDistanceToNow } from 'date-fns';
import UserStatsModal from './UserStatsModal';

export const LiveBetFeedComponent = () => {
  const { liveBetFeed, loading } = useRealtimeFeeds();
  const [selectedGame, setSelectedGame] = useState<'all' | 'crash' | 'coinflip'>('all');
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showUserStats, setShowUserStats] = useState(false);

  const filteredFeed = liveBetFeed.filter(bet => 
    selectedGame === 'all' || bet.game_type === selectedGame
  );

  const handleUsernameClick = (username: string) => {
    setSelectedUsername(username);
    setShowUserStats(true);
  };

  const formatProfit = (profit: number) => {
    const isProfit = profit > 0;
    return (
      <span className={`flex items-center gap-1 font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
        {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isProfit ? '+' : ''}${profit.toFixed(2)}
      </span>
    );
  };

  const getGameIcon = (gameType: string) => {
    return gameType === 'crash' ? <Zap className="w-4 h-4" /> : <Coins className="w-4 h-4" />;
  };

  const getResultDisplay = (bet: LiveBetFeed) => {
    if (bet.game_type === 'crash') {
      return bet.multiplier ? `${bet.multiplier}x` : bet.result;
    }
    return bet.result;
  };

  if (loading) {
    return (
      <Card className="w-full h-96">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            Live Bet Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-glow-pulse" />
            <span>Live Bet Feed</span>
            <Badge variant="secondary" className="text-xs animate-fade-in">
              Real-time
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Badge 
              variant={selectedGame === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedGame('all')}
            >
              All
            </Badge>
            <Badge 
              variant={selectedGame === 'crash' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedGame('crash')}
            >
              Crash
            </Badge>
            <Badge 
              variant={selectedGame === 'coinflip' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedGame('coinflip')}
            >
              Coinflip
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {filteredFeed.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No recent bets
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFeed.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border hover:bg-card/80 transition-colors animate-new-item"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`} />
                    <AvatarFallback>{bet.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors underline-offset-4 hover:underline"
                        onClick={() => handleUsernameClick(bet.username)}
                      >
                        {bet.username}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        <div className="flex items-center gap-1">
                          {getGameIcon(bet.game_type)}
                          {bet.game_type}
                        </div>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>${bet.bet_amount}</span>
                      <span>•</span>
                      <span>{getResultDisplay(bet)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(bet.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {formatProfit(bet.profit)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      {/* User Stats Modal */}
      <UserStatsModal 
        isOpen={showUserStats}
        onClose={() => setShowUserStats(false)}
        username={selectedUsername}
      />
    </Card>
  );
};