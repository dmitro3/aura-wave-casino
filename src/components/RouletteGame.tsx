import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RouletteWheel } from './RouletteWheel';
import { RouletteResultHistory } from './RouletteResultHistory';

interface RouletteRound {
  id: string;
  round_number: number;
  status: 'betting' | 'spinning' | 'completed';
  result_slot?: number;
  result_color?: string;
  result_multiplier?: number;
  betting_end_time?: string;
  spin_end_time?: string;
  created_at: string;
}

interface RouletteBet {
  id: string;
  round_id: string;
  user_id: string;
  bet_color: string;
  bet_amount: number;
  potential_payout: number;
  actual_payout?: number;
  is_winner?: boolean;
  created_at: string;
  profiles?: {
    username: string;
  };
}

export const RouletteGame = () => {
  const { user } = useAuth();
  const { userData: profile } = useUserProfile();
  const [currentRound, setCurrentRound] = useState<RouletteRound | null>(null);
  const [roundBets, setRoundBets] = useState<RouletteBet[]>([]);
  const [userBets, setUserBets] = useState<{ [key: string]: number }>({});
  const [betAmount, setBetAmount] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSlot, setWinningSlot] = useState<number | null>(null);
  const [showWinAnimation, setShowWinAnimation] = useState(false);

  // Auto-start new rounds every 20 seconds
  useEffect(() => {
    const fetchCurrentRound = async () => {
      try {
        // First check round status and handle transitions
        const { data: statusData, error: statusError } = await supabase.functions.invoke('roulette-engine', {
          body: { action: 'check_round_status' }
        });
        
        if (statusError) throw statusError;
        
        if (statusData?.currentRound) {
          console.log('🎰 Current round from status check:', statusData.currentRound);
          setCurrentRound(statusData.currentRound);
          return;
        }

        // If no active round from status check, try to get the latest round from database
        const { data: activeRound } = await supabase
          .from('roulette_rounds')
          .select('*')
          .in('status', ['betting', 'spinning'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeRound) {
          console.log('🎰 Found active round:', activeRound);
          setCurrentRound(activeRound);
          return;
        }

        // If no active round, check if there's a recent completed round
        const { data: recentRound } = await supabase
          .from('roulette_rounds')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If the most recent round is more than 30 seconds old, or no round exists, start a new one
        const shouldStartNewRound = !recentRound || 
          (new Date().getTime() - new Date(recentRound.created_at).getTime()) > 30000;

        if (shouldStartNewRound) {
          await startNewRound();
        } else {
          // Show the completed round temporarily
          setCurrentRound(recentRound);
          // Start a new round after a short delay
          setTimeout(startNewRound, 5000);
        }
      } catch (error) {
        console.error('❌ Failed to fetch current round:', error);
        // Try to start a new round as fallback
        await startNewRound();
      }
    };

    const startNewRound = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('roulette-engine', {
          body: { action: 'start_round' }
        });
        
        if (error) throw error;
        console.log('🎰 New round started:', data);
        setCurrentRound(data);
      } catch (error) {
        console.error('❌ Failed to start round:', error);
      }
    };

    // Fetch current round on component mount
    fetchCurrentRound();

    // Set up interval for checking round status more frequently
    const statusInterval = setInterval(fetchCurrentRound, 5000); // Check every 5 seconds
    
    // Set up interval for starting new rounds less frequently  
    const roundInterval = setInterval(fetchCurrentRound, 25000); // Check every 25 seconds
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(roundInterval);
    };
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to round updates
    const roundsChannel = supabase
      .channel('roulette-rounds')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roulette_rounds' },
        (payload) => {
          console.log('🎰 Round update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setCurrentRound(payload.new as RouletteRound);
          }
        }
      )
      .subscribe();

    // Subscribe to bet updates
    const betsChannel = supabase
      .channel('roulette-bets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roulette_bets' },
        (payload) => {
          console.log('💰 Bet update:', payload);
          if (payload.eventType === 'INSERT') {
            fetchRoundBets();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(betsChannel);
    };
  }, []);

  // Fetch current round and bets
  const fetchRoundBets = async () => {
    if (!currentRound) return;

    const { data: bets } = await supabase
      .from('roulette_bets')
      .select('*')
      .eq('round_id', currentRound.id)
      .order('created_at', { ascending: false });

    if (bets) {
      // Fetch usernames separately to avoid type issues
      const betsWithUsernames = await Promise.all(
        bets.map(async (bet) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', bet.user_id)
            .single();
          
          return {
            ...bet,
            profiles: profile
          };
        })
      );
      setRoundBets(betsWithUsernames as RouletteBet[]);
    }
  };

  useEffect(() => {
    fetchRoundBets();
  }, [currentRound]);

  // Timer countdown
  useEffect(() => {
    if (!currentRound?.betting_end_time) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const bettingEnd = new Date(currentRound.betting_end_time!).getTime();
      const spinEnd = currentRound.spin_end_time ? new Date(currentRound.spin_end_time).getTime() : 0;

      if (currentRound.status === 'betting') {
        const timeRemaining = Math.max(0, Math.floor((bettingEnd - now) / 1000));
        setTimeLeft(timeRemaining);

        if (timeRemaining === 0) {
          setIsSpinning(true);
        }
      } else if (currentRound.status === 'spinning' || isSpinning) {
        const timeRemaining = Math.max(0, Math.floor((spinEnd - now) / 1000));
        setTimeLeft(timeRemaining);
      } else {
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound, isSpinning]);

  // Handle round completion
  useEffect(() => {
    if (currentRound?.status === 'completed' && currentRound.result_slot !== undefined) {
      setWinningSlot(currentRound.result_slot);
      setIsSpinning(false);
      
      // Check if user won
      const userWon = userBets[currentRound.result_color!] > 0;
      if (userWon) {
        setShowWinAnimation(true);
        const winAmount = userBets[currentRound.result_color!] * currentRound.result_multiplier!;
        toast.success(`🎉 You hit ${currentRound.result_color}! +$${winAmount.toFixed(2)}`);
        setTimeout(() => setShowWinAnimation(false), 3000);
      }
      
      // Reset user bets for next round
      setTimeout(() => {
        setUserBets({});
        setWinningSlot(null);
      }, 5000);
    }
  }, [currentRound, userBets]);

  const placeBet = async (color: string) => {
    if (!user || !currentRound || currentRound.status !== 'betting' || timeLeft <= 0) {
      toast.error('Betting is closed');
      return;
    }

    if (betAmount <= 0 || betAmount > (profile?.balance || 0)) {
      toast.error('Invalid bet amount');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'place_bet',
          userId: user.id,
          betColor: color,
          betAmount: betAmount,
          roundId: currentRound.id
        }
      });

      if (error) throw error;

      setUserBets(prev => ({
        ...prev,
        [color]: (prev[color] || 0) + betAmount
      }));

      toast.success(`Bet placed: $${betAmount} on ${color}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place bet');
    }
  };

  const getMultiplierText = (color: string) => {
    return color === 'green' ? '14x' : '2x';
  };

  const getBetColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-600 hover:bg-green-700 text-white';
      case 'red': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'black': return 'bg-gray-900 hover:bg-gray-800 text-white';
      default: return '';
    }
  };

  if (!currentRound) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Starting new round...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎰 Roulette
              <Badge variant="outline">Round #{currentRound.round_number}</Badge>
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-lg font-mono">
                  {timeLeft > 0 ? `${timeLeft}s` : '0s'}
                </span>
              </div>
              <Badge variant={currentRound.status === 'betting' ? 'default' : 'secondary'}>
                {currentRound.status === 'betting' ? 'Betting Open' : 
                 isSpinning ? 'Spinning...' : 'Round Complete'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Roulette Wheel */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <RouletteWheel 
                isSpinning={isSpinning}
                winningSlot={winningSlot}
                showWinAnimation={showWinAnimation}
              />
            </CardContent>
          </Card>

          {/* Betting Interface */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Place Your Bets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Bet Amount:</label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min="1"
                  max={profile?.balance || 0}
                  className="w-32"
                  disabled={currentRound.status !== 'betting' || timeLeft <= 0}
                />
                <span className="text-sm text-muted-foreground">
                  Balance: ${profile?.balance?.toFixed(2) || '0.00'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['green', 'red', 'black'].map((color) => (
                  <Button
                    key={color}
                    onClick={() => placeBet(color)}
                    disabled={currentRound.status !== 'betting' || timeLeft <= 0}
                    className={`h-20 flex flex-col gap-2 ${getBetColorClass(color)}`}
                  >
                    <span className="text-lg font-bold capitalize">{color}</span>
                    <span className="text-sm">{getMultiplierText(color)}</span>
                    {userBets[color] && (
                      <span className="text-xs opacity-80">
                        Bet: ${userBets[color].toFixed(2)}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Result History */}
          <RouletteResultHistory />
        </div>

        {/* Live Bets Feed */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Live Bets
                <Badge variant="outline">{roundBets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {roundBets.map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {bet.profiles?.username?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {bet.profiles?.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${bet.bet_amount.toFixed(2)} on{' '}
                            <span className={`font-medium ${
                              bet.bet_color === 'green' ? 'text-green-400' :
                              bet.bet_color === 'red' ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {bet.bet_color}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <p className="text-xs text-muted-foreground">
                          {getMultiplierText(bet.bet_color)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {roundBets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No bets yet this round</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};