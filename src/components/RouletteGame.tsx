import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, Wallet, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import { RouletteReel } from './RouletteReel';
import { ProvablyFairModal } from './ProvablyFairModal';
import { ProvablyFairHistoryModal } from './ProvablyFairHistoryModal';

interface RouletteRound {
  id: string;
  round_number: number;
  status: 'betting' | 'spinning' | 'completed';
  result_slot?: number;
  result_color?: string;
  result_multiplier?: number;
  reel_position?: number;
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
  const [provablyFairModalOpen, setProvablyFairModalOpen] = useState(false);
  const [provablyFairHistoryOpen, setProvablyFairHistoryOpen] = useState(false);
  const [selectedRoundData, setSelectedRoundData] = useState<RouletteRound | null>(null);
  const [betTotals, setBetTotals] = useState<BetTotals>({
    green: { total: 0, count: 0, users: [] },
    red: { total: 0, count: 0, users: [] },
    black: { total: 0, count: 0, users: [] }
  });

  // UI state
  const [betAmount, setBetAmount] = useState(10);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [winningColor, setWinningColor] = useState<string | null>(null);
  const [extendedWinAnimation, setExtendedWinAnimation] = useState(false);
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
  
  // Debug bet amounts
  useEffect(() => {
    if (rouletteBets.length > 0) {
      console.log('🎯 Live bet feed data:', rouletteBets.map(bet => ({
        username: bet.username,
        bet_amount: bet.bet_amount,
        bet_amount_type: typeof bet.bet_amount,
        game_data: bet.game_data
      })));
    }
  }, [rouletteBets]);
  
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



  // Open provably fair history modal
  const openProvablyFairModal = () => {
    console.log('🛡️ Opening provably fair history modal');
    setProvablyFairHistoryOpen(true);
  };

  // Open round details modal
  const openRoundDetails = (result: RouletteResult) => {
    // Convert RouletteResult to RouletteRound format for the modal
    const roundData: RouletteRound = {
      id: result.round_id,
      round_number: result.round_number,
      status: 'completed',
      result_slot: result.result_slot,
      result_color: result.result_color,
      result_multiplier: 0, // Not needed for display
      reel_position: 0, // Not needed for display
      betting_start_time: '',
      betting_end_time: '',
      spinning_end_time: '',
      server_seed_hash: '',
      nonce: 0,
      created_at: result.created_at
    };
    setSelectedRoundData(roundData);
    setProvablyFairModalOpen(true);
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
          
          // Save completed round for fairness checking and handle payouts
          if (oldRound?.status === 'spinning' && round.status === 'completed') {
            console.log('✅ Round completed, saving for fairness check');
            setLastCompletedRound(round);
            
            // Set winning color for button highlighting
            if (round.result_color) {
              setWinningColor(round.result_color);
              // Clear winning color after 5 seconds
              setTimeout(() => setWinningColor(null), 5000);
            }
            
            // Start extended win animation for winning tile (2 seconds)
            setExtendedWinAnimation(true);
            setTimeout(() => setExtendedWinAnimation(false), 2000);
            
            // Handle payouts for this user (TowerGame pattern)
            handleRoundPayout(round);
          }
          
          setCurrentRound(round);
          
          // Handle different scenarios
          if (isNewRound) {
            console.log('🆕 New round detected, clearing user bets and fetching fresh data');
            setUserBets({});
            userBetsRef.current = {};
            currentRoundRef.current = round.id;
            setWinningColor(null); // Clear winning color for new round
            setExtendedWinAnimation(false); // Clear extended win animation for new round
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

  // Handle round payout (Fetch updated balance from backend)
  const handleRoundPayout = async (completedRound: RouletteRound) => {
    if (!user || !profile || !completedRound.result_color) {
      return;
    }

    try {
      console.log('💰 Round completed, fetching updated user balance:', completedRound.id);
      
      // Check if user had any bets in this round
      const userBetsInRound = Object.entries(userBets).filter(([_, amount]) => amount > 0);
      
      if (userBetsInRound.length === 0) {
        console.log('ℹ️ No bets placed by user in this round');
        return;
      }

      // Small delay to let backend finish processing payouts
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the updated profile from backend with retry logic
      let updatedProfile = null;
      let error = null;
      
      // Try up to 3 times to get the updated balance
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`💰 Fetching updated balance (attempt ${attempt}/3)`);
        
        const result = await supabase
          .from('profiles')
          .select('balance, total_profit')
          .eq('id', user.id)
          .single();
          
        if (result.error) {
          error = result.error;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
        } else {
          updatedProfile = result.data;
          error = null;
          break;
        }
      }

      if (error) {
        console.error('❌ Error fetching updated profile:', error);
        return;
      }

      if (updatedProfile) {
        const oldBalance = profile.balance;
        const newBalance = updatedProfile.balance;
        const balanceDifference = newBalance - oldBalance;

        console.log(`💰 Balance update: ${oldBalance} → ${newBalance} (difference: ${balanceDifference})`);

        // Update frontend with the actual backend values
        await onUpdateUser({
          balance: newBalance,
          total_profit: updatedProfile.total_profit
        });

        // Show appropriate notification
        if (balanceDifference > 0) {
          // Check which color won to show in message
          const winningBets = userBetsInRound.filter(([betColor]) => betColor === completedRound.result_color);
          
          toast({
            title: "🎉 You Won!",
            description: `Won $${balanceDifference.toFixed(2)} on ${completedRound.result_color}!`,
          });
          
          console.log(`🎯 User won $${balanceDifference} on ${completedRound.result_color}`);
        } else {
          console.log(`😢 User lost (no balance increase)`);
        }
      }

    } catch (error: any) {
      console.error('❌ Error handling round payout:', error);
    }
  };

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
    const isWinning = winningColor === color;
    
    switch (color) {
      case 'green': 
        return isWinning 
          ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-white border-green-300 ring-4 ring-green-300 shadow-xl shadow-green-400/50 animate-pulse'
          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white border-green-400';
      case 'red': 
        return isWinning 
          ? 'bg-gradient-to-r from-red-400 to-red-500 hover:from-red-300 hover:to-red-400 text-white border-red-300 ring-4 ring-red-300 shadow-xl shadow-red-400/50 animate-pulse'
          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-red-400';
      case 'black': 
        return isWinning 
          ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white border-gray-400 ring-4 ring-gray-400 shadow-xl shadow-gray-400/50 animate-pulse'
          : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white border-gray-500';
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

  const getResultBubbleClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/50';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/50';
      case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-900 shadow-gray-500/50';
      default: return 'bg-gradient-to-br from-gray-500 to-gray-700 shadow-gray-500/50';
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
              <Button 
                onClick={openProvablyFairModal}
                variant="outline" 
                size="sm"
                className="glass border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all duration-200"
                title="Provably Fair Verification"
              >
                <Shield className="w-4 h-4 mr-1" />
                Provably Fair
              </Button>
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

      <div className="w-full">
        {/* Main Game Area */}
        <div className="space-y-6">
          {/* Recent Results Bubbles */}
          <div className="flex justify-end mb-4">
            <div className="glass border-0 rounded-lg p-3 flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">Recent Results:</span>
              <div className="flex items-center gap-2">
                {recentResults.slice(0, 8).map((result, index) => (
                  <div
                    key={result.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-current/50 ${getResultBubbleClass(result.result_color)} animate-in slide-in-from-right-5`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                    onClick={() => openRoundDetails(result)}
                    title={`Round #${result.round_number} - Click for details`}
                  >
                    {result.result_slot}
                  </div>
                ))}
                {recentResults.length === 0 && (
                  <span className="text-sm text-muted-foreground">No results yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Roulette Reel */}
          <Card className="glass border-0">
            <CardContent className="p-6">
              <RouletteReel 
                isSpinning={currentRound.status === 'spinning'}
                winningSlot={currentRound.result_slot || null}
                showWinAnimation={currentRound.status === 'completed'}
                synchronizedPosition={currentRound.reel_position || null}
                extendedWinAnimation={extendedWinAnimation}
              />
            </CardContent>
          </Card>

          {/* Betting Interface */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Place Your Bets</span>
                <div className="flex items-center gap-2">
                  {user && profile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="w-4 h-4" />
                      <span>Balance: ${profile.balance.toFixed(2)}</span>
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {timeLeft > 0 ? `${timeLeft}s remaining` : 'Bets closed'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bet Amount Controls */}
              {user && profile ? (
                <div className="flex items-center gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
                    disabled={currentRound.status !== 'betting'}
                  >
                    ÷2
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Bet:</span>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => {
                        const newAmount = Number(e.target.value);
                        const maxBalance = profile?.balance || 0;
                        setBetAmount(newAmount > maxBalance ? maxBalance : Math.max(1, newAmount));
                      }}
                      min="1"
                      max={profile?.balance || 0}
                      className="w-24 text-center"
                      disabled={currentRound.status !== 'betting'}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(Math.min(profile?.balance || 0, betAmount * 2))}
                    disabled={currentRound.status !== 'betting'}
                  >
                    ×2
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
                      className={`w-full h-12 flex flex-col gap-1 border-2 ${getBetColorClass(color)}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold capitalize">{color}</span>
                        <span className="text-xs">{getMultiplierText(color)}</span>
                      </div>
                      {(userBets[color] || userBetsRef.current[color]) && (
                        <span className="text-xs opacity-90 bg-white/20 px-1 py-0.5 rounded">
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
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={provablyFairModalOpen}
        onClose={() => setProvablyFairModalOpen(false)}
        roundData={selectedRoundData}
        showCurrentRound={selectedRoundData?.id === currentRound?.id}
      />

      {/* Provably Fair History Modal */}
      <ProvablyFairHistoryModal
        isOpen={provablyFairHistoryOpen}
        onClose={() => setProvablyFairHistoryOpen(false)}
      />
    </div>
  );
}