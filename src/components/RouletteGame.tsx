import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, Wallet, Shield, TrendingUp, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import { RouletteReel } from './RouletteReel';

interface RouletteRound {
  id: string;
  round_number: number;
  status: 'betting' | 'spinning' | 'completed';
  result_slot?: number;
  result_color?: string;
  result_multiplier?: number;
  betting_start_time: string;
  betting_end_time: string;
  spinning_end_time: string;
  server_seed_hash: string;
  nonce: number;
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
  profit?: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface RouletteResult {
  id: string;
  round_number: number;
  result_color: string;
  result_slot: number;
  total_bets_count: number;
  total_bets_amount: number;
  created_at: string;
}

interface BetTotals {
  green: { total: number; count: number; users: RouletteBet[] };
  red: { total: number; count: number; users: RouletteBet[] };
  black: { total: number; count: number; users: RouletteBet[] };
}

interface RouletteGameProps {
  userData: UserProfile | null;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

export function RouletteGame({ userData, onUpdateUser }: RouletteGameProps) {
  const { user } = useAuth();
  const profile = userData;
  const { toast } = useToast();
  const { liveBetFeed, isConnected } = useRealtimeFeeds();

  // Game state
  const [currentRound, setCurrentRound] = useState<RouletteRound | null>(null);
  const [roundBets, setRoundBets] = useState<RouletteBet[]>([]);
  const [recentResults, setRecentResults] = useState<RouletteResult[]>([]);
  const [userBets, setUserBets] = useState<Record<string, number>>({});
  const [betTotals, setBetTotals] = useState<BetTotals>({
    green: { total: 0, count: 0, users: [] },
    red: { total: 0, count: 0, users: [] },
    black: { total: 0, count: 0, users: [] }
  });

  // UI state
  const [betAmount, setBetAmount] = useState(10);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [lastCompletedRound, setLastCompletedRound] = useState<RouletteRound | null>(null);
  
  // Use ref to track current round ID and user bets to prevent race conditions
  const currentRoundRef = useRef<string | null>(null);
  const userBetsRef = useRef<Record<string, number>>({});

  // Filter roulette bets from live feed (only current round)
  const rouletteBets = (liveBetFeed || []).filter(bet => 
    bet.game_type === 'roulette' && 
    bet.game_data?.round_id === currentRound?.id
  );
  const greenBets = rouletteBets.filter(bet => bet.game_data?.bet_color === 'green');
  const redBets = rouletteBets.filter(bet => bet.game_data?.bet_color === 'red');
  const blackBets = rouletteBets.filter(bet => bet.game_data?.bet_color === 'black');

  // Clear user bets when round changes
  useEffect(() => {
    if (currentRound?.id && currentRoundRef.current && currentRound.id !== currentRoundRef.current) {
      console.log('🔄 Round changed, clearing user bets');
      setUserBets({});
      userBetsRef.current = {};
      currentRoundRef.current = currentRound.id;
    }
  }, [currentRound?.id]);

  // Fetch current round
  const fetchCurrentRound = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_current_round' }
      });

      if (error) throw error;
      
      console.log('🎰 Current round:', data);
      
      // Check if this is a new round (different ID)
      const isNewRound = currentRound?.id !== data?.id;
      if (isNewRound) {
        console.log('🆕 New round detected, clearing user bets');
        setUserBets({});
        userBetsRef.current = {};
        currentRoundRef.current = data?.id || null;
        setBetTotals({
          green: { total: 0, count: 0, users: [] },
          red: { total: 0, count: 0, users: [] },
          black: { total: 0, count: 0, users: [] }
        });
      }
      
      setCurrentRound(data);
      
      // Fetch bets for this round
      if (data?.id) {
        fetchRoundBets(data.id);
      }
    } catch (error: any) {
      console.error('Failed to fetch current round:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the game server",
        variant: "destructive",
      });
    }
  };

  // Fetch bets for current round
  const fetchRoundBets = async (roundId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_round_bets', roundId }
      });

      if (error) throw error;
      
      console.log('🔍 Fetched round bets:', data);
      setRoundBets(data || []);
      calculateBetTotals(data || []);
      
      // Calculate user's bets for this round from database
      if (user) {
        const userRoundBets = (data || []).filter((bet: RouletteBet) => bet.user_id === user.id);
        const dbUserBets: Record<string, number> = {};
        userRoundBets.forEach((bet: RouletteBet) => {
          dbUserBets[bet.bet_color] = (dbUserBets[bet.bet_color] || 0) + bet.bet_amount;
        });
        console.log('👤 Database user bets:', dbUserBets);
        
        // Smart user bet handling - merge database with current local state
        const currentLocalBets = userBetsRef.current;
        const mergedBets = { ...dbUserBets };
        
        // If this is the same round and we have local bets, prefer local values
        if (currentRoundRef.current === roundId && currentLocalBets) {
          Object.keys(currentLocalBets).forEach(color => {
            if (currentLocalBets[color] > (dbUserBets[color] || 0)) {
              mergedBets[color] = currentLocalBets[color];
              console.log(`🔒 Keeping local bet for ${color}: ${currentLocalBets[color]} (DB: ${dbUserBets[color] || 0})`);
            }
          });
        }
        
        console.log('🔄 Final user bets:', mergedBets);
        setUserBets(mergedBets);
        userBetsRef.current = mergedBets;
      }
    } catch (error: any) {
      console.error('Failed to fetch round bets:', error);
    }
  };

  // Fetch recent results
  const fetchRecentResults = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_recent_results' }
      });

      if (error) throw error;
      setRecentResults(data || []);
    } catch (error: any) {
      console.error('Failed to fetch recent results:', error);
    }
  };



  // Verify round fairness
  const verifyRoundFairness = async (roundId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'verify_round', roundId }
      });

      if (error) throw error;
      
      // Show verification in a toast or modal
      toast({
        title: "🔍 Fairness Verification",
        description: `Round ${data.round_number}: Server seed verified. Result: ${data.result_color} (slot ${data.result_slot})`,
      });
      
      console.log('🔍 Fairness verification:', data);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || 'Failed to verify round',
        variant: "destructive",
      });
    }
  };

  // Calculate bet totals by color
  const calculateBetTotals = (bets: RouletteBet[]) => {
    const totals: BetTotals = {
      green: { total: 0, count: 0, users: [] },
      red: { total: 0, count: 0, users: [] },
      black: { total: 0, count: 0, users: [] }
    };

    bets.forEach(bet => {
      const color = bet.bet_color as keyof BetTotals;
      totals[color].total += bet.bet_amount;
      totals[color].count += 1;
      totals[color].users.push(bet);
    });

    console.log('📊 Calculated bet totals:', totals);
    setBetTotals(totals);
  };

  // Timer for countdown
  useEffect(() => {
    if (!currentRound) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      let targetTime: number;
      
      if (currentRound.status === 'betting') {
        targetTime = new Date(currentRound.betting_end_time).getTime();
      } else if (currentRound.status === 'spinning') {
        targetTime = new Date(currentRound.spinning_end_time).getTime();
      } else {
        setTimeLeft(0);
        return;
      }

      const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [currentRound]);

  // Real-time subscriptions
  useEffect(() => {
    console.log('🔔 Setting up real-time subscriptions');

    // Subscribe to round updates
    const roundSubscription = supabase
      .channel('roulette_rounds')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'roulette_rounds'
      }, (payload) => {
        console.log('🎰 Round update:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const round = payload.new as RouletteRound;
          const oldRound = payload.old as RouletteRound;
          
          // Check if this is a new round (different ID)
          const isNewRound = currentRound?.id !== round.id;
          
          // Save completed round for fairness checking
          if (oldRound?.status === 'spinning' && round.status === 'completed') {
            console.log('✅ Round completed, saving for fairness check');
            setLastCompletedRound(round);
          }
          
          setCurrentRound(round);
          
          // Handle different scenarios
          if (isNewRound) {
            console.log('🆕 New round detected, clearing user bets and fetching fresh data');
            setUserBets({});
            userBetsRef.current = {};
            currentRoundRef.current = round.id;
            fetchRoundBets(round.id);
          } else if (round.status === 'betting' && oldRound?.status !== 'betting') {
            console.log('🎲 Betting phase started');
            fetchRoundBets(round.id);
          } else if (round.status === 'spinning' && oldRound?.status === 'betting') {
            console.log('🌀 Spinning started, fetching final bets');
            fetchRoundBets(round.id);
          } else if (round.status === 'completed') {
            console.log('🏁 Round completed, fetching final results');
            fetchRoundBets(round.id);
          } else {
            console.log('⏭️ Round update but keeping current state');
          }
        }
      })
      .subscribe();

    // Subscribe to bet updates for live feed
    const betSubscription = supabase
      .channel('roulette_bets')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_bets'
      }, (payload) => {
        console.log('💰 New bet placed:', payload);
        
        // Always refresh bets to show live updates for all users
        if (currentRound?.id) {
          console.log('🔄 Refreshing bets for live updates');
          fetchRoundBets(currentRound.id);
        }
      })
      .subscribe();

    // Subscribe to results updates
    const resultsSubscription = supabase
      .channel('roulette_results')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_results'
      }, (payload) => {
        console.log('🎯 New result:', payload);
        fetchRecentResults();
      })
      .subscribe();

    return () => {
      roundSubscription.unsubscribe();
      betSubscription.unsubscribe();
      resultsSubscription.unsubscribe();
    };
  }, [user, currentRound?.id]);

  // Initial data fetch
  useEffect(() => {
    const initializeGame = async () => {
      setLoading(true);
      await Promise.all([
        fetchCurrentRound(),
        fetchRecentResults()
      ]);
      setLoading(false);
    };

    initializeGame();

    // Refresh current round every 2 seconds
    const refreshInterval = setInterval(fetchCurrentRound, 2000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Place bet
  const placeBet = async (color: string) => {
    if (!user || !profile || !currentRound) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to place bets",
        variant: "destructive",
      });
      return;
    }

    if (currentRound.status !== 'betting') {
      toast({
        title: "Betting Closed",
        description: "Betting is closed for this round",
        variant: "destructive",
      });
      return;
    }

    if (betAmount < 1 || betAmount > profile.balance) {
      toast({
        title: "Invalid Bet",
        description: betAmount > profile.balance ? "Insufficient balance" : "Invalid bet amount",
        variant: "destructive",
      });
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

      toast({
        title: "Bet Placed!",
        description: `$${betAmount} on ${color}`,
      });

      // Update user balance immediately (same as TowerGame)
      await onUpdateUser({
        balance: profile.balance - betAmount,
        total_wagered: profile.total_wagered + betAmount
      });

      // Update local user bets immediately and keep them persistent
      setUserBets(prev => {
        const newBets = {
          ...prev,
          [color]: (prev[color] || 0) + betAmount
        };
        console.log('🎯 Setting user bets locally:', newBets);
        // Also update the ref for persistence
        userBetsRef.current = newBets;
        return newBets;
      });

      // Store the current round ID with user bets to clear when round changes
      currentRoundRef.current = currentRound.id;

    } catch (error: any) {
      toast({
        title: "Bet Failed",
        description: error.message || 'Failed to place bet',
        variant: "destructive",
      });
    }
  };

  const getMultiplierText = (color: string) => {
    return color === 'green' ? '14x' : '2x';
  };

  const getBetColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white border-green-400';
      case 'red': return 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-red-400';
      case 'black': return 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white border-gray-500';
      default: return '';
    }
  };

  const getStatusText = () => {
    if (!currentRound) return 'Loading...';
    
    switch (currentRound.status) {
      case 'betting': return 'Betting Open';
      case 'spinning': return 'Spinning...';
      case 'completed': return 'Round Complete';
      default: return currentRound.status;
    }
  };

  const getResultColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading roulette game...</p>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No active round found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎰 Roulette
              <Badge variant="outline">Round #{currentRound.round_number}</Badge>
            </span>
            <div className="flex items-center gap-4">

              {lastCompletedRound && (
                <Button 
                  onClick={() => verifyRoundFairness(lastCompletedRound.id)} 
                  variant="outline" 
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100"
                >
                  🔍 Verify Fairness
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-lg font-mono">
                  {timeLeft}s
                </span>
              </div>
              <Badge variant={currentRound.status === 'betting' ? 'default' : 'secondary'}>
                {getStatusText()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Roulette Reel */}
          <Card className="glass border-0">
            <CardContent className="p-6">
              <RouletteReel 
                isSpinning={currentRound.status === 'spinning'}
                winningSlot={currentRound.result_slot || null}
                showWinAnimation={currentRound.status === 'completed'}
              />
            </CardContent>
          </Card>

          {/* Betting Interface */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Place Your Bets</span>
                {user && profile && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="w-4 h-4" />
                    <span>Balance: ${profile.balance.toFixed(2)}</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bet Amount Controls */}
              {user && profile ? (
                <div className="flex items-center gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(Math.max(1, betAmount - 5))}
                    disabled={currentRound.status !== 'betting'}
                  >
                    -$5
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Bet:</span>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      min="1"
                      max={profile.balance}
                      className="w-24 text-center"
                      disabled={currentRound.status !== 'betting'}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(betAmount + 5)}
                    disabled={currentRound.status !== 'betting' || betAmount + 5 > profile.balance}
                  >
                    +$5
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(10)}
                      disabled={currentRound.status !== 'betting'}
                    >
                      $10
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(50)}
                      disabled={currentRound.status !== 'betting'}
                    >
                      $50
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(Math.min(100, profile.balance))}
                      disabled={currentRound.status !== 'betting'}
                    >
                      $100
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Sign in to place bets</p>
                </div>
              )}

              {/* Betting Options with Live Feeds */}
              <div className="grid grid-cols-3 gap-4">
                {(['green', 'red', 'black'] as const).map((color) => (
                  <div key={color} className="space-y-2">
                    <Button
                      onClick={() => placeBet(color)}
                      disabled={!user || !profile || currentRound.status !== 'betting'}
                      className={`w-full h-20 flex flex-col gap-2 border-2 ${getBetColorClass(color)}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold capitalize">{color}</span>
                        <span className="text-sm">{getMultiplierText(color)}</span>
                      </div>
                      {(userBets[color] || userBetsRef.current[color]) && (
                        <span className="text-xs opacity-90 bg-white/20 px-2 py-1 rounded">
                          Your bet: ${(userBets[color] || userBetsRef.current[color] || 0).toFixed(2)}
                        </span>
                      )}
                    </Button>
                    
                    {/* Live totals calculated from live feed */}
                    <div className="text-center text-xs space-y-1">
                      <div className="font-medium">
                        ${(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).reduce((sum, bet) => sum + bet.bet_amount, 0).toFixed(0)} total
                      </div>
                      <div className="text-muted-foreground">
                        {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).length} bets
                      </div>
                    </div>

                    {/* Live Bet Feed (TowerGame pattern) */}
                    <Card className="glass border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <span className="capitalize">{color} Bets</span>
                          <Badge variant="outline" className="text-xs">
                            {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).length} live
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <ScrollArea className="h-32">
                          {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <div className="w-6 h-6 mx-auto mb-2 opacity-50 text-lg">🎰</div>
                              <p className="text-xs">No bets yet</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).slice(0, 8).map((bet, index) => (
                                <div
                                  key={index}
                                  className="p-2 rounded-lg border bg-card/20 hover:bg-card/30 transition-colors animate-fade-in"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/50 flex items-center justify-center text-xs font-bold border border-primary/50">
                                        {bet.username[0].toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-xs text-primary truncate">
                                          {bet.username}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          ${bet.bet_amount.toFixed(0)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className={`font-bold text-xs ${bet.result === 'win' ? 'text-emerald-400' : bet.result === 'loss' ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {bet.result === 'win' ? '+' : bet.result === 'loss' ? '-' : '~'}${Math.abs(bet.profit || 0).toFixed(0)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Results */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {recentResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getResultColorClass(result.result_color)}`}></div>
                        <span className="text-sm font-medium">{result.result_slot}</span>
                        <span className="text-xs text-muted-foreground">#{result.round_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.total_bets_count} bets
                      </div>
                    </div>
                  ))}
                  {recentResults.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No results yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Round Info & Provably Fair */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Round Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hash:</span>
                  <span className="font-mono text-xs">{currentRound.server_seed_hash.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nonce:</span>
                  <span className="font-mono">{currentRound.nonce}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Bets:</span>
                  <span>{roundBets.length}</span>
                </div>
              </div>
              
              {currentRound.status === 'completed' && (
                <Button variant="outline" size="sm" className="w-full">
                  <Shield className="w-3 h-3 mr-1" />
                  Verify Fairness
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}