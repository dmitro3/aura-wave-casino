import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Zap, AlertTriangle, Coins, Cpu, Shield, Crown, TrendingUp, Target, Gamepad2, User, Bot, CheckCircle, X, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import { useGameHistory } from '@/hooks/useGameHistory';
import { UserProfile } from '@/hooks/useUserProfile';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { useXPSync } from '@/contexts/XPSyncContext';
import ClickableUsername from './ClickableUsername';

interface TowerGameProps {
  userData: UserProfile | null;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

interface TowerGameState {
  id: string;
  difficulty: string;
  bet_amount: number;
  current_level: number;
  max_level: number;
  status: 'active' | 'cashed_out' | 'lost';
  current_multiplier: number;
  final_payout?: number;
  mine_positions: number[][];
  selected_tiles?: number[]; // Track which tile was selected at each level
}

interface DifficultyConfig {
  tilesPerRow: number;
  maxLevel: number;
}

const DIFFICULTY_INFO = {
  easy: { 
    name: 'NEURAL ROOKIE', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    glowColor: 'emerald',
    icon: <Shield className="w-4 h-4" />,
    description: '4 DATA NODES | 3 SAFE | 75% SUCCESS RATE',
    maxMultiplier: '13.04x',
    tilesPerRow: 4,
    safeCount: 3,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Secure data networks with basic firewalls'
  },
  medium: { 
    name: 'CYBER OPERATOR', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glowColor: 'amber',
    icon: <Cpu className="w-4 h-4" />,
    description: '3 DATA NODES | 2 SAFE | 66.6% SUCCESS RATE',
    maxMultiplier: '38.28x',
    tilesPerRow: 3,
    safeCount: 2,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Advanced systems with quantum encryption'
  },
  hard: { 
    name: 'ELITE HACKER', 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    glowColor: 'rose',
    icon: <Zap className="w-4 h-4" />,
    description: '2 DATA NODES | 1 SAFE | 50% SUCCESS RATE',
    maxMultiplier: '469.81x',
    tilesPerRow: 2,
    safeCount: 1,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Military-grade systems with lethal countermeasures'
  },
  extreme: { 
    name: 'MATRIX LEGEND', 
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    glowColor: 'violet',
    icon: <Target className="w-4 h-4" />,
    description: '3 DATA NODES | 1 SAFE | 33.3% SUCCESS RATE',
    maxMultiplier: '688.84x',
    tilesPerRow: 3,
    safeCount: 1,
    mineCount: 2,
    maxLevel: 6,
    theme: 'AI-controlled networks with autonomous defense protocols'
  }
};

const PAYOUT_MULTIPLIERS = {
  easy: [1.32, 1.76, 2.34, 3.11, 4.14, 5.51, 7.34, 9.78, 13.04],
  medium: [1.49, 2.24, 3.36, 5.04, 7.56, 11.34, 17.01, 25.52, 38.28],
  hard: [1.98, 3.92, 7.76, 15.37, 30.46, 60.22, 119.64, 237.09, 469.81],
  extreme: [2.97, 8.82, 26.21, 77.88, 231.58, 688.84]
};

const SAFE_TILES = ['✓', '💎', '🔒', '🛡️', '⭐'];
const TRAP_TILES = ['💥', '⚡', '🔥', '💀', '⚠️'];

export default function TowerGame({ userData, onUpdateUser }: TowerGameProps) {
  const [game, setGame] = useState<TowerGameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState('10');
  const [difficulty, setDifficulty] = useState('easy');
  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]); // Track selected tile at each level
  const [loadingActiveGame, setLoadingActiveGame] = useState(true); // Loading state for checking active games
  const [countdown, setCountdown] = useState<number | null>(null); // Countdown for auto-reset
  const [selectedGameReplay, setSelectedGameReplay] = useState<any | null>(null); // For game replay modal
  const { toast } = useToast();
  const { isMaintenanceMode } = useMaintenance();
  const { forceRefresh } = useLevelSync();
  const { forceFullRefresh } = useXPSync();
  
  const { history: gameHistory, refetch: refreshHistory } = useGameHistory('tower');
  const { liveBetFeed } = useRealtimeFeeds();

  // Real-time balance state for instant UI updates
  const [realtimeBalance, setRealtimeBalance] = useState<number>(userData?.balance || 0);

  // Sync realtime balance when userData changes
  useEffect(() => {
    if (userData?.balance !== undefined) {
      setRealtimeBalance(userData.balance);
    }
  }, [userData?.balance]);

  // Direct real-time balance subscription for instant updates
  useEffect(() => {
    if (!userData?.id) return;

    const balanceChannel = supabase
      .channel(`tower_balance_${userData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userData.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new?.balance !== undefined) {
            const newBalance = parseFloat(payload.new.balance);
            console.log('🎯 Tower real-time balance update:', realtimeBalance, '→', newBalance);
            setRealtimeBalance(newBalance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
    };
  }, [userData?.id, realtimeBalance]);

  // Function to render replay tower with all mines revealed - matching actual game design
  const renderReplayTower = (gameData: any) => {
    if (!gameData) return null;
    
    const difficulty = gameData.difficulty || 'easy';
    const minePositions = gameData.mine_positions || [];
    const selectedTiles = gameData.selected_tiles || [];
    const levelReached = gameData.level_reached || 0;
    const maxLevel = gameData.max_level || 8;
    

    
    const difficultyConfig = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO] || DIFFICULTY_INFO.easy;
    const tilesPerRow = difficultyConfig.tilesPerRow;
    const payoutMultipliers = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS] || [];
    
         // Render individual tile matching actual game progression
     const renderReplayTile = (levelIndex: number, tileIndex: number) => {
       const levelMines = minePositions[levelIndex] || [];
       const isMine = levelMines.includes(tileIndex);
       const isSelected = selectedTiles[levelIndex] === tileIndex;
       const wasCleared = levelIndex < levelReached; // Only cleared levels show green checkmarks
       
                // Determine what should be revealed based on progression
         let revealed = null;
         if (isSelected && !isMine) {
           // All selected safe tiles show green checkmarks (user's actual choices)
           revealed = { safe: true };
         } else if (isMine) {
           // All mines are always revealed for transparency
           revealed = { safe: false };
         }
         // Everything else stays hidden (like unselected tiles in actual game)
       
       // Use optimized styling for replay (smaller tiles to fit entire tower)
       let tileClass = "relative w-full h-8 rounded-lg transition-all duration-200 ";
       
       // Apply styling based on revelation state
       if (revealed?.safe) {
         tileClass += "bg-emerald-500/20 border-2 border-emerald-500/40 ";
       } else if (revealed && !revealed.safe) {
         tileClass += "bg-red-500/20 border-2 border-red-500/40 ";
       } else {
         // Hidden tiles (unselected safe tiles, future levels)
         tileClass += "bg-slate-700/30 border-2 border-slate-600/30 opacity-50 ";
       }
       
       // Add STRONG highlighting for selected tiles (player's path)
       if (isSelected) {
         if (revealed?.safe) {
           // Enhance selected safe tiles (cleared levels)
           tileClass = tileClass.replace("bg-emerald-500/20", "bg-emerald-500/50");
           tileClass = tileClass.replace("border-emerald-500/40", "border-emerald-300");
           tileClass += "shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 ";
         } else if (revealed && !revealed.safe) {
           // Enhance selected mine tiles  
           tileClass = tileClass.replace("bg-red-500/20", "bg-red-500/50");
           tileClass = tileClass.replace("border-red-500/40", "border-red-300");
           tileClass += "shadow-xl shadow-red-500/50 ring-2 ring-red-400/60 ";
         } else {
           // Selected but hidden tile (should stand out but not reveal content)
           tileClass = tileClass.replace("bg-slate-700/30", "bg-blue-500/30");
           tileClass = tileClass.replace("border-slate-600/30", "border-blue-400/50");
           tileClass += "shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/40 ";
         }
       }
       
       return (
         <button key={tileIndex} className={tileClass} disabled>
           <div className="flex items-center justify-center h-full">
             {/* Show icons based on revelation state */}
             {revealed ? (
               revealed.safe ? (
                 <CheckCircle className="w-5 h-5 text-emerald-400" />
               ) : (
                 <X className="w-5 h-5 text-red-400" />
               )
             ) : (
               <div className="w-1.5 h-1.5 bg-slate-500 rounded-full opacity-30"></div>
             )}
           </div>
           
           {/* Enhanced selection indicators for user's path */}
           {isSelected && (
             <>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-pulse"></div>
               <div className="absolute inset-0 border-2 border-yellow-400/60 rounded-lg animate-pulse"></div>
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-300 animate-pulse shadow-lg"></div>
               <div className="absolute top-1 left-1 text-xs font-bold text-yellow-300 drop-shadow-lg">●</div>
             </>
           )}
         </button>
       );
     };
    
    // Render level matching actual game design
    const renderReplayLevel = (levelIndex: number) => {
      const multiplier = payoutMultipliers[levelIndex];
      const wasPlayed = levelIndex <= levelReached;
      const isCurrentLevel = levelIndex === levelReached;
      
      return (
        <div 
          key={levelIndex} 
          className={`p-1.5 rounded-lg transition-all duration-300 ${
            wasPlayed && levelIndex < levelReached
              ? 'bg-emerald-500/10 border border-emerald-500/30' 
              : isCurrentLevel 
                ? 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10' 
                : 'bg-slate-800/50 border border-slate-700/50'
          }`}
        >
          {/* Multiplier display - centered */}
          <div className="text-center mb-0.5">
            <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
              wasPlayed && levelIndex < levelReached
                ? 'bg-emerald-500/20 text-emerald-300' 
                : isCurrentLevel 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-slate-700/50 text-slate-400'
            }`}>
              {multiplier ? multiplier.toFixed(2) : '1.00'}x
            </div>
          </div>
          
          {/* Tiles - Modern grid */}
          <div className={`grid gap-1 ${
            tilesPerRow === 2 ? 'grid-cols-2' :
            tilesPerRow === 3 ? 'grid-cols-3' :
            tilesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-3'
          }`}>
            {Array.from({ length: tilesPerRow }, (_, i) => renderReplayTile(levelIndex, i))}
          </div>
        </div>
      );
    };
    
         return (
       <div className="space-y-1">
         {/* Render levels from top to bottom (reverse order) */}
         {payoutMultipliers
           .slice()
           .reverse()
           .map((_, index) => {
             const actualLevel = payoutMultipliers.length - 1 - index;
             return renderReplayLevel(actualLevel);
           })}
       </div>
     );
  };

  // Real-time balance sync: Update bet amount if it exceeds new balance
  useEffect(() => {
    if (realtimeBalance !== undefined) {
      const currentBet = parseFloat(betAmount) || 0;
      
      // If current bet amount exceeds new balance, adjust it
      if (currentBet > realtimeBalance) {
        const adjustedBet = Math.min(currentBet, realtimeBalance);
        if (adjustedBet >= 0.01) {
          setBetAmount(adjustedBet.toFixed(2));
          console.log('🎯 Tower bet amount adjusted for new balance:', currentBet, '→', adjustedBet);
        } else {
          setBetAmount('0.01');
          console.log('🎯 Tower bet amount reset to minimum due to insufficient balance');
        }
      }
    }
  }, [realtimeBalance, betAmount]);

  // Check for active game on component mount
  useEffect(() => {
    const checkForActiveGame = async () => {
      if (!userData?.id) {
        console.log('🔍 TOWER: No user ID, skipping active game check');
        setLoadingActiveGame(false);
        return;
      }

      // Starting active game check
      setLoadingActiveGame(true);

      try {
        // Querying for active games
        
        const { data: activeGames, error } = await supabase
          .from('tower_games')
          .select('*')
          .eq('user_id', userData.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ TOWER: Error checking for active game:', error);
          setLoadingActiveGame(false);
          return;
        }

        // Active games query completed

        if (activeGames && activeGames.length > 0) {
          const activeGame = activeGames[0];
          console.log('🎮 TOWER: Found active game:', {
            id: activeGame.id,
            difficulty: activeGame.difficulty,
            current_level: activeGame.current_level,
            status: activeGame.status,
            bet_amount: activeGame.bet_amount,
            created_at: activeGame.created_at
          });
          
          // Also get the selected tiles from tower_levels
          console.log('🔍 TOWER: Querying for tower levels...');
          const { data: levels, error: levelsError } = await supabase
            .from('tower_levels')
            .select('level_number, tile_selected, was_safe')
            .eq('game_id', activeGame.id)
            .order('level_number', { ascending: true });

          console.log('🔍 TOWER: Tower levels query result:', {
            found: levels?.length || 0,
            data: levels
          });

          if (levelsError) {
            console.error('❌ TOWER: Error fetching tower levels:', levelsError);
          }

          const selectedTilesArray = levels?.map(level => level.tile_selected) || [];
          console.log('🎯 TOWER: Restored selected tiles:', selectedTilesArray);
          setSelectedTiles(selectedTilesArray);

          // Convert the database game to our state format
          const gameState: TowerGameState = {
            id: activeGame.id,
            difficulty: activeGame.difficulty,
            bet_amount: parseFloat(activeGame.bet_amount),
            current_level: activeGame.current_level,
            max_level: activeGame.max_level,
            status: activeGame.status as 'active' | 'cashed_out' | 'lost',
            current_multiplier: parseFloat(activeGame.current_multiplier),
            final_payout: activeGame.final_payout ? parseFloat(activeGame.final_payout) : undefined,
            mine_positions: activeGame.mine_positions,
            selected_tiles: selectedTilesArray
          };

          console.log('🎮 TOWER: Setting game state:', gameState);
          setGame(gameState);
          setDifficulty(activeGame.difficulty);
          
          toast({
            title: "🎮 Active Game Restored",
            description: `Resumed your ${DIFFICULTY_INFO[activeGame.difficulty as keyof typeof DIFFICULTY_INFO]?.name || activeGame.difficulty} tower game from level ${activeGame.current_level + 1}`,
            duration: 5000,
          });
        } else {
          // No active game found
        }
      } catch (error) {
        console.error('❌ TOWER: Error checking for active game:', error);
      } finally {
        setLoadingActiveGame(false);
        // Active game check completed
      }
    };

    // Run the check whenever userData.id is available
    if (userData?.id) {
      checkForActiveGame();
    } else {
      setLoadingActiveGame(false);
    }
  }, [userData?.id]);

  // Auto-reset game when it ends (cash out or mine hit)
  useEffect(() => {
    if (game?.status && game.status !== 'active') {
      console.log('🔄 TOWER: Game ended with status:', game.status, '- Auto-resetting in 3 seconds...');
      
      // Start countdown
      setCountdown(3);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            console.log('🔄 TOWER: Auto-resetting game...');
            resetGame();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Cleanup timer if component unmounts or game changes
      return () => {
        clearInterval(countdownInterval);
        setCountdown(null);
      };
    } else {
      setCountdown(null);
    }
  }, [game?.status]);

  // Reset game state
  const resetGame = () => {
    console.log('🔄 TOWER: Resetting game state...');
    setGame(null);
    setAnimatingTiles(new Set());
    setSelectedTiles([]);
    setLoadingActiveGame(false);
    setCountdown(null);
  };

  // Start new game
  const startGame = async () => {
    if (!userData?.id || loading || isMaintenanceMode || loadingActiveGame) return;
    
    // Prevent starting a new game if there's already an active one (local state check)
    if (game?.status === 'active') {
      toast({
        title: "Game Already Active",
        description: "Complete your current tower climb before starting a new one",
        variant: "destructive"
      });
      return;
    }

    // Double-check for active games in database to prevent race conditions
    setLoading(true);
    try {
      console.log('🔍 TOWER: Double-checking for active games before starting new game...');
      const { data: activeGames, error: checkError } = await supabase
        .from('tower_games')
        .select('id, status, created_at')
        .eq('user_id', userData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('❌ TOWER: Error checking for active games:', checkError);
        setLoading(false);
        return;
      }

      if (activeGames && activeGames.length > 0) {
        console.log('⚠️ TOWER: Found active game in database, preventing double bet:', activeGames[0]);
        setLoading(false);
        
        // Restore the active game state to sync with server
        const activeGame = activeGames[0];
        
        // Fetch the full game data and restore state
        const { data: fullGameData, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', activeGame.id)
          .single();
          
        if (!gameError && fullGameData) {
          console.log('🔄 TOWER: Restoring active game state from server:', fullGameData);
          
          // Also get the selected tiles
          const { data: levels } = await supabase
            .from('tower_levels')
            .select('level_number, tile_selected')
            .eq('game_id', fullGameData.id)
            .order('level_number', { ascending: true });
            
          const selectedTilesArray = levels?.map(level => level.tile_selected) || [];
          setSelectedTiles(selectedTilesArray);
          
          // Convert to game state format
          const gameState: TowerGameState = {
            id: fullGameData.id,
            difficulty: fullGameData.difficulty,
            bet_amount: parseFloat(fullGameData.bet_amount),
            current_level: fullGameData.current_level,
            max_level: fullGameData.max_level,
            status: fullGameData.status as 'active' | 'cashed_out' | 'lost',
            current_multiplier: parseFloat(fullGameData.current_multiplier),
            final_payout: fullGameData.final_payout ? parseFloat(fullGameData.final_payout) : undefined,
            mine_positions: fullGameData.mine_positions,
            selected_tiles: selectedTilesArray
          };
          
          setGame(gameState);
          setDifficulty(fullGameData.difficulty);
        }
        
        toast({
          title: "Active Game Restored",
          description: "Your active tower game has been restored. Continue playing from where you left off.",
          variant: "default"
        });
        return;
      }

      console.log('✅ TOWER: No active games found, proceeding with new game...');
    } catch (error) {
      console.error('❌ TOWER: Error in active game check:', error);
      setLoading(false);
      return;
    }
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 0.01) {
      setLoading(false);
      toast({
        title: "Invalid bet amount",
        description: "Minimum bet amount is $0.01",
        variant: "destructive"
      });
      return;
    }

    if (amount > userData.balance) {
      setLoading(false);
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance for this bet",
        variant: "destructive"
      });
      return;
    }

    // Continue with game creation (loading is already set from database check)
    try {
      const requestBody = { 
        action: 'start',
        bet_amount: amount,
        difficulty: difficulty,
        user_id: userData.id
      };
      
      console.log('🎯 TOWER: Sending request:', requestBody);
      console.log('🎯 TOWER: User data:', userData);
      console.log('🎯 TOWER: Amount:', amount, 'Type:', typeof amount);
      console.log('🎯 TOWER: Difficulty:', difficulty, 'Type:', typeof difficulty);
      
      const response = await supabase.functions.invoke('tower-engine', {
        body: requestBody
      });

      if (response.error) throw response.error;
      
      const newGame = response.data;
      console.log('🎯 TOWER: Game started, received data:', newGame);
      setGame(newGame);
      
      // Balance will be updated automatically via real-time subscription when backend processes the bet
      console.log('⚡ Balance will be updated via real-time subscription after backend deducts bet amount');
      
      toast({
        title: "Game Started",
        description: `Tower climb initiated! Navigate ${DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name} level systems.`,
      });
      
    } catch (error: any) {
      console.error('Error starting game:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        status: error.status,
        code: error.code,
        context: error.context
      });
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Select tile
  const selectTile = async (tileIndex: number) => {
    if (!game || loading || game.status !== 'active') {
      console.log('🚫 TOWER: Tile selection blocked - loading:', loading, 'game status:', game?.status);
      return;
    }
    
    const tileKey = `${game.current_level}-${tileIndex}`;
    setAnimatingTiles(prev => new Set([...prev, tileKey]));
    setLoading(true);
    
    try {
      const response = await supabase.functions.invoke('tower-engine', {
        body: { 
          action: 'select_tile',
          game_id: game.id,
          tile_index: tileIndex,
          user_id: userData?.id
        }
      });

      if (response.error) throw response.error;
      
      const updatedGame = response.data;
      
      // Update game state only after server confirms the change
      setGame(updatedGame);
      
      // Track the selected tile for this level after server confirmation
      setSelectedTiles(prev => {
        const newSelected = [...prev];
        newSelected[game.current_level] = tileIndex;
        return newSelected;
      });
      
      // Handle game end
      if (updatedGame.status === 'lost') {
        // Trigger user data refresh to update XP/level stats
        await onUpdateUser({});
        
        toast({
          title: "SYSTEM BREACH DETECTED",
          description: `Security protocol activated on floor ${updatedGame.current_level + 1}. Access denied.`,
          variant: "destructive"
        });
      } else if (updatedGame.status === 'cashed_out') {
        // Balance will be updated automatically via real-time subscription when backend processes the payout
        console.log('⚡ Balance will be updated via real-time subscription after backend adds payout');
        
        toast({
          title: "DATA EXTRACTION SUCCESSFUL",
          description: `Secured ${(updatedGame.final_payout || 0).toFixed(2)} credits from floor ${updatedGame.current_level}!`,
        });
      }
      
      refreshHistory();
      
    } catch (error: any) {
      console.error('Error selecting tile:', error);
      toast({
        title: "System Error",
        description: error.message || "Connection lost",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      // Remove animation immediately for instant response
      setAnimatingTiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(tileKey);
        return newSet;
      });
    }
  };

  // Cash out
  const cashOut = async () => {
    if (!game || loading || game.status !== 'active') {
      console.log('🚫 TOWER: Cash out blocked - loading:', loading, 'game status:', game?.status);
      return;
    }
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('tower-engine', {
        body: { 
          action: 'cash_out',
          game_id: game.id,
          user_id: userData?.id
        }
      });

      if (response.error) throw response.error;
      
      const updatedGame = response.data;
      
      // Update game state only after server confirms the change
      setGame(updatedGame);
      
      // Balance will be updated automatically via real-time subscription when backend processes the payout
      console.log('⚡ Balance will be updated via real-time subscription after backend adds auto cash-out payout');
      
      toast({
        title: "SECURE EXTRACTION",
        description: `Successfully extracted ${(updatedGame.final_payout || 0).toFixed(2)} credits!`,
      });
      
      refreshHistory();
      
    } catch (error: any) {
      console.error('Error cashing out:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to cash out",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Render individual tile with modern design
  const renderTile = (levelIndex: number, tileIndex: number) => {
    const tileKey = `${levelIndex}-${tileIndex}`;
    const isAnimating = animatingTiles.has(tileKey);
    const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO]?.tilesPerRow || 3;
    const isCurrentLevel = game?.current_level === levelIndex;
    const isPastLevel = game && game.current_level > levelIndex;
    const isFutureLevel = game && game.current_level < levelIndex;
    const isGameEnded = game && (game.status === 'lost' || game.status === 'cashed_out');
    
    // The mine_positions array contains arrays of mine indices per level
    const levelMines = game?.mine_positions?.[levelIndex] || [];
    const isMine = levelMines.includes(tileIndex);
    const wasSelected = selectedTiles[levelIndex] === tileIndex;
    
    // Show revealed tiles for:
    // 1. Completed levels (past levels) - only the selected tile
    // 2. All tiles when game has ended (to show what would've happened)
    let revealed = null;
    if (isPastLevel && wasSelected) {
      revealed = { safe: !isMine };
    } else if (isGameEnded) {
      revealed = { safe: !isMine };
    }

    // Modern tile styling
    let tileClass = "relative w-full h-10 rounded-lg transition-all duration-200 ";
    
    // State-based styling
    if (revealed?.safe) {
      tileClass += "bg-emerald-500/20 border-2 border-emerald-500/40 ";
    } else if (revealed && !revealed.safe) {
      tileClass += "bg-red-500/20 border-2 border-red-500/40 ";
    } else if (isCurrentLevel && game?.status === 'active') {
      tileClass += "bg-slate-700/50 border-2 border-slate-600/50 hover:border-primary/50 hover:bg-slate-600/50 cursor-pointer ";
    } else if (isFutureLevel || !game) {
      tileClass += "bg-slate-800/30 border-2 border-slate-700/30 opacity-30 cursor-not-allowed ";
    } else {
      tileClass += "bg-slate-700/30 border-2 border-slate-600/30 opacity-50 cursor-not-allowed ";
    }

    if (isAnimating) {
      tileClass += "animate-pulse ";
    }

    return (
      <button
        key={tileIndex}
        className={tileClass}
        onClick={() => isCurrentLevel && game?.status === 'active' ? selectTile(tileIndex) : null}
        disabled={!isCurrentLevel || game?.status !== 'active' || loading}
      >
        <div className="flex items-center justify-center h-full">
          {revealed ? (
            revealed.safe ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <X className="w-5 h-5 text-red-400" />
            )
          ) : isCurrentLevel && game?.status === 'active' ? (
            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full opacity-50"></div>
          ) : (
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full opacity-30"></div>
          )}
        </div>

        {/* Scanning effect for active tiles */}
        {isCurrentLevel && game?.status === 'active' && !revealed && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse"></div>
          </>
        )}
      </button>
    );
  };

  // Render tower level with modern design
  const renderLevel = (levelIndex: number) => {
    const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO]?.tilesPerRow || 3;
    const multiplier = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS]?.[levelIndex];
    const isCurrentLevel = game?.current_level === levelIndex;
    const isPastLevel = game && game.current_level > levelIndex;

    return (
      <div 
        key={levelIndex} 
        className={`p-2 rounded-lg transition-all duration-300 ${
          isPastLevel 
            ? 'bg-emerald-500/10 border border-emerald-500/30' 
            : isCurrentLevel 
              ? 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10' 
              : 'bg-slate-800/50 border border-slate-700/50'
        }`}
      >
        {/* Multiplier display - centered */}
        <div className="text-center mb-1">
          <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
            isPastLevel 
              ? 'bg-emerald-500/20 text-emerald-300' 
              : isCurrentLevel 
                ? 'bg-primary/20 text-primary' 
                : 'bg-slate-700/50 text-slate-400'
          }`}>
            {multiplier ? multiplier.toFixed(2) : '1.00'}x
          </div>
        </div>
        
        {/* Tiles - Modern grid */}
        <div className={`grid gap-1.5 ${
          tilesPerRow === 2 ? 'grid-cols-2' :
          tilesPerRow === 3 ? 'grid-cols-3' :
          tilesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-3'
        }`}>
          {Array.from({ length: tilesPerRow }, (_, i) => renderTile(levelIndex, i))}
        </div>


      </div>
    );
  };

  // Show loading state while checking for active games
  if (loadingActiveGame) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin">
              <Building2 className="w-12 h-12 text-primary mx-auto" />
            </div>
            <p className="text-slate-300">Looking for active games...</p>
            <p className="text-slate-400 text-sm">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Game Controls - Modern Style */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Tower</h2>
                  <p className="text-sm text-slate-400 font-normal">Climb to win</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!game ? (
                <>
                  {/* Bet Amount */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300">Bet Amount</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={betAmount}
                          onChange={(e) => {
                            let inputValue = e.target.value;
                            
                            // Prevent more than 2 decimal places
                            if (inputValue.includes('.')) {
                              const parts = inputValue.split('.');
                              if (parts[1] && parts[1].length > 2) {
                                inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                              }
                            }
                            
                            const value = parseFloat(inputValue);
                            const maxBalance = realtimeBalance;
                            
                            if (isNaN(value) || inputValue === '' || inputValue === '.') {
                              setBetAmount(inputValue);
                            } else if (value > maxBalance) {
                              setBetAmount(maxBalance.toFixed(2));
                            } else if (value < 0.01 && inputValue !== '0' && inputValue !== '0.') {
                              setBetAmount("0.01");
                            } else {
                              setBetAmount(inputValue);
                            }
                          }}
                          className="pl-10 pr-24 h-12 bg-slate-800/80 border-slate-600/50 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-lg [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          min="0.01"
                          max={realtimeBalance}
                          step="0.01"
                          placeholder="0.00"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Coins className="w-4 h-4 text-primary" />
                        </div>
                        <div className="absolute right-16 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">
                          ${realtimeBalance.toFixed(2)}
                        </div>
                        
                        {/* Custom arrow buttons */}
                        <div className="absolute right-1 top-1 bottom-1 flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseFloat(betAmount) || 0;
                              const newValue = current + 0.01;
                              const maxBalance = realtimeBalance;
                              setBetAmount(Math.min(newValue, maxBalance).toFixed(2));
                            }}
                            className="flex-1 flex items-center justify-center w-8 rounded-tr-lg bg-slate-700/50 hover:bg-slate-600/50 border-l border-slate-600/50 text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseFloat(betAmount) || 0;
                              const newValue = current - 0.01;
                              setBetAmount(Math.max(newValue, 0.01).toFixed(2));
                            }}
                            className="flex-1 flex items-center justify-center w-8 rounded-br-lg bg-slate-700/50 hover:bg-slate-600/50 border-l border-t border-slate-600/50 text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Bet Amount Shortcut Buttons */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseFloat(betAmount) || 0;
                            const halved = current / 2;
                            setBetAmount(Math.max(halved, 0.01).toFixed(2));
                          }}
                          className="flex-1 h-8 bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white text-xs"
                        >
                          ÷2
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = parseFloat(betAmount) || 0;
                            const doubled = current * 2;
                            const maxAmount = realtimeBalance;
                            setBetAmount(Math.min(doubled, maxAmount).toFixed(2));
                          }}
                          className="flex-1 h-8 bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white text-xs"
                        >
                          ×2
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBetAmount(realtimeBalance.toFixed(2));
                          }}
                          className="flex-1 h-8 bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white text-xs font-semibold"
                        >
                          MAX
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="h-12 bg-slate-800/80 border-slate-600/50 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-lg">
                        <div className="text-center w-full">
                          <div className="font-medium">{DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO]?.name}</div>
                          <div className="text-xs text-slate-400">Max: {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO]?.maxMultiplier}</div>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-600 shadow-xl">
                        {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                          <SelectItem 
                            key={key} 
                            value={key} 
                            className={`text-white hover:bg-primary/10 focus:bg-primary/10 data-[highlighted]:bg-primary/10 cursor-pointer py-3 border-b border-slate-700/50 last:border-b-0 transition-colors duration-200 flex justify-center ${
                              difficulty === key ? 'bg-primary/20 border-primary/30' : ''
                            }`}
                          >
                            <div className="text-center">
                              <div className={`font-medium ${difficulty === key ? 'text-primary' : 'text-white'}`}>
                                {info.name}
                              </div>
                              <div className={`text-xs ${difficulty === key ? 'text-primary/70' : 'text-slate-400'}`}>
                                Max: {info.maxMultiplier}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Game Button */}
                  <Button 
                    onClick={startGame} 
                    disabled={loading || isMaintenanceMode}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Starting Game...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4" />
                        Start Game
                      </div>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Game Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">FLOOR</span>
                      <span className="text-lg font-mono font-bold text-primary">{game.current_level + 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">MULTIPLIER</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">{(game.current_multiplier || 1).toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">POTENTIAL</span>
                      <span className="text-lg font-mono font-bold text-amber-400">
                        ${(parseFloat(betAmount) * (game.current_multiplier || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {game.status === 'active' && (
                    <div className="space-y-2">
                      <Button 
                        onClick={cashOut} 
                        disabled={loading || game.current_level === 0}
                        className={`w-full h-12 font-semibold rounded-lg transition-all duration-200 ${
                          loading || game.current_level === 0
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white'
                        }`}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Cashing Out...
                          </div>
                        ) : game.current_level === 0 ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Select a tile first
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Cash Out ${(parseFloat(betAmount) * (game.current_multiplier || 1)).toFixed(2)}
                          </div>
                        )}
                      </Button>
                    </div>
                  )}


                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Tower Display */}
        <div className="xl:col-span-2">
          <Card className="border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-sm relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Tower Climb</h3>
                  <p className="text-sm text-slate-400">Choose your path to reach the top</p>
                </div>
                
                {game && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      ${(parseFloat(betAmount) * (game.current_multiplier || 1)).toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-400">
                      Level {game.current_level + 1} • {difficulty}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            
            {/* Game End Overlay */}
            {game?.status !== 'active' && game?.status && (
              <div className="absolute inset-0 flex items-center justify-center z-50 rounded-lg">
                <div className={`bg-slate-900/95 rounded-lg p-6 max-w-sm mx-4 text-center shadow-2xl border-2 ${
                  game.status === 'lost' 
                    ? 'border-red-500/60 shadow-red-500/20' 
                    : 'border-emerald-500/60 shadow-emerald-500/20'
                }`}>
                  {game.status === 'lost' ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="text-3xl text-red-400">
                        <AlertTriangle className="w-12 h-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-bold text-red-400">SECURITY BREACH</h3>
                      <p className="text-slate-300 text-sm">
                        Access denied on floor {game.current_level + 1}
                      </p>
                      <div className="text-red-400 text-xs">
                        Protocol terminated by {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
                      </div>
                      <div className="text-slate-400 text-xs animate-pulse">
                        Resetting in {countdown || 3}s...
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-fade-in">
                      <div className="text-3xl text-emerald-400">
                        <Crown className="w-12 h-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-bold text-emerald-400">EXTRACTION SUCCESSFUL</h3>
                      <p className="text-slate-300 text-sm">
                        Extracted ${(game.final_payout || 0).toFixed(2)}
                      </p>
                      <div className="text-emerald-400 text-xs">
                        {(game.current_multiplier || 1).toFixed(2)}x multiplier achieved
                      </div>
                      <div className="text-slate-400 text-xs animate-pulse">
                        Resetting in {countdown || 3}s...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <CardContent className="space-y-4">
              <div className="space-y-0">
                {/* Tower levels - always visible, updates based on difficulty */}
                <div className="space-y-0.5">
                  {(PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS] || [])
                    .slice()
                    .reverse()
                    .map((_, index) => {
                      const multipliers = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS] || [];
                      const actualLevel = multipliers.length - 1 - index;
                      return renderLevel(actualLevel);
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Bet History */}
        <div className="xl:col-span-1">
          <Card className="border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Live Bets</h3>
                  <p className="text-sm text-slate-400 font-normal">Recent tower climbs</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {liveBetFeed
                    .filter(bet => bet.game_type === 'tower')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 20)
                    .map((bet) => {
                      const gameData = bet.game_data || {};
                      const levelReached = gameData.level_reached || 0;
                      const maxLevel = gameData.max_level || 8;
                      const difficulty = gameData.difficulty || 'easy';
                      const isWin = bet.result === 'win' || bet.profit > 0;
                      
                      const difficultyInfo = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO] || DIFFICULTY_INFO.easy;
                      
                      return (
                        <div
                          key={bet.id}
                          className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-1.5 hover:bg-slate-700/50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedGameReplay(bet)}
                        >
                          {/* User Info & Primary Stats Row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={bet.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`} />
                                <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                                  {bet.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <ClickableUsername 
                                  username={bet.username}
                                  className="font-medium text-xs text-slate-200 truncate hover:text-primary transition-colors"
                                >
                                  {bet.username}
                                </ClickableUsername>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge 
                                className={`text-xs px-1 py-0 ${difficultyInfo.color} transition-all duration-300 cursor-help relative overflow-visible group-hover:z-10
                                  ${difficulty === 'easy' ? 'group-hover:bg-emerald-500/30 group-hover:border-emerald-400/50' : 
                                    difficulty === 'medium' ? 'group-hover:bg-yellow-500/30 group-hover:border-yellow-400/50' : 
                                    difficulty === 'hard' ? 'group-hover:bg-orange-500/30 group-hover:border-orange-400/50' : 'group-hover:bg-red-500/30 group-hover:border-red-400/50'}`}
                                title={difficultyInfo.name}
                              >
                                <span className="group-hover:opacity-0 transition-opacity duration-300">{difficultyInfo.name.charAt(0)}</span>
                                <span className={`absolute top-0 right-0 px-1 py-0 rounded whitespace-nowrap
                                  opacity-0 group-hover:opacity-100 
                                  scale-75 group-hover:scale-100 
                                  translate-x-2 group-hover:translate-x-0
                                  transition-all duration-300 ease-out
                                  ${difficultyInfo.color} 
                                  ${difficulty === 'easy' ? 'bg-emerald-500/30 border-emerald-400/50' : 
                                    difficulty === 'medium' ? 'bg-yellow-500/30 border-yellow-400/50' : 
                                    difficulty === 'hard' ? 'bg-orange-500/30 border-orange-400/50' : 'bg-red-500/30 border-red-400/50'}
                                  backdrop-blur-sm`}>
                                  {difficultyInfo.name}
                                </span>
                              </Badge>
                              <div className={`flex items-center gap-0.5 text-xs font-medium ${
                                isWin ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {isWin ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>WIN</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3 h-3" />
                                    <span>LOSE</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bet Amount, Progress & Profit Row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <Coins className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs font-medium text-slate-200">
                                ${bet.bet_amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">
                                {levelReached}/{maxLevel}
                              </span>
                              <span className={`text-xs font-medium ${
                                bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                              </span>
                              {bet.multiplier && bet.multiplier > 1 && (
                                <span className="text-xs text-primary font-medium">
                                  {bet.multiplier.toFixed(2)}x
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ultra-Compact Progress Bar */}
                          <div className="w-full bg-slate-700 rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full transition-all duration-300 ${
                                isWin ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              style={{ 
                                width: `${Math.max((levelReached / maxLevel) * 100, 5)}%` 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  
                  {liveBetFeed.filter(bet => bet.game_type === 'tower').length === 0 && (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                      <p className="text-slate-400">No recent tower games</p>
                      <p className="text-slate-500 text-sm">Bets will appear here as players climb</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game Replay Modal */}
      <Dialog open={!!selectedGameReplay} onOpenChange={() => setSelectedGameReplay(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <span className="text-xl font-bold text-white">Tower Game Replay</span>
                {selectedGameReplay && (
                  <p className="text-sm text-slate-400 font-normal">
                    {selectedGameReplay.username}'s climb on {selectedGameReplay.game_data?.difficulty || 'easy'} difficulty
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedGameReplay && (
            <div className="space-y-6">
              {/* Game Summary */}
              <div className="bg-slate-800/30 border border-slate-600/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Player:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={selectedGameReplay.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedGameReplay.username}`} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                          {selectedGameReplay.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <ClickableUsername 
                        username={selectedGameReplay.username}
                        className="font-medium text-slate-200 hover:text-primary transition-colors"
                      >
                        {selectedGameReplay.username}
                      </ClickableUsername>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Difficulty:</span>
                    <div className="mt-1">
                      {(() => {
                        const diffInfo = DIFFICULTY_INFO[selectedGameReplay.game_data?.difficulty as keyof typeof DIFFICULTY_INFO] || DIFFICULTY_INFO.easy;
                        return (
                          <Badge className={`text-xs px-2 py-1 ${diffInfo.color}`}>
                            {diffInfo.name}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Bet Amount:</span>
                    <p className="text-slate-200 font-medium mt-1">${selectedGameReplay.bet_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Result:</span>
                    <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${
                      selectedGameReplay.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {selectedGameReplay.profit >= 0 ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>WIN (+${selectedGameReplay.profit.toFixed(2)})</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span>LOSE (${selectedGameReplay.profit.toFixed(2)})</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Levels Cleared:</span>
                    <p className="text-slate-200 font-medium mt-1">
                      {selectedGameReplay.game_data?.level_reached || 0}/{selectedGameReplay.game_data?.max_level || 8}
                    </p>
                  </div>
                  {selectedGameReplay.multiplier && selectedGameReplay.multiplier > 1 && (
                    <div>
                      <span className="text-slate-400">Multiplier:</span>
                      <p className="text-primary font-medium mt-1">{selectedGameReplay.multiplier.toFixed(2)}x</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tower Layout */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Tower Layout</h3>
                
                <div className="bg-slate-900/50 border border-slate-600/30 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                  {renderReplayTower(selectedGameReplay.game_data)}
                </div>
                

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}