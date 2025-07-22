
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, DollarSign, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGameHistory } from '@/hooks/useGameHistory';
import { UserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import CoinFlipAnimation from './CoinflipStreak/CoinFlipAnimation';
import StreakTracker from './CoinflipStreak/StreakTracker';
import PayoutDisplay from './CoinflipStreak/PayoutDisplay';
import LiveCoinflipFeed from './CoinflipStreak/LiveCoinflipFeed';

interface CoinflipGameProps {
  userData: UserProfile;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

interface StreakResult {
  result: 'heads' | 'tails';
  multiplier: number;
}

interface GameState {
  gamePhase: 'setup' | 'betting' | 'flipping' | 'result' | 'choice';
  betAmount: number;
  selectedSide: 'heads' | 'tails' | null;
  streak: StreakResult[];
  currentMultiplier: number;
  currentPayout: number;
  isFlipping: boolean;
  lastResult: 'heads' | 'tails' | null;
  hasActiveBet: boolean;
}

// Calculate multiplier with 1% house edge (1.98^n)
const calculateMultiplier = (streakLength: number): number => {
  return Math.pow(1.98, streakLength + 1);
};

// Generate client seed for provably fair
const generateClientSeed = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export default function CoinflipGame({ userData, onUpdateUser }: CoinflipGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    gamePhase: 'setup',
    betAmount: 0,
    selectedSide: null,
    streak: [],
    currentMultiplier: 1.98,
    currentPayout: 0,
    isFlipping: false,
    lastResult: null,
    hasActiveBet: false
  });
  
  const [betInput, setBetInput] = useState('');
  const { addGameRecord } = useGameHistory('coinflip', 10);
  const { toast } = useToast();

  const handlePlaceBet = async () => {
    const bet = parseFloat(betInput);
    if (isNaN(bet) || bet <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (bet > userData.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this bet",
        variant: "destructive",
      });
      return;
    }

    // Update balance immediately and set game to betting phase
    await onUpdateUser({ balance: userData.balance - bet });
    
    setGameState(prev => ({
      ...prev,
      betAmount: bet,
      gamePhase: 'betting',
      hasActiveBet: true,
      currentPayout: bet * 1.98
    }));

    setBetInput('');
  };

  const handleSideSelection = (side: 'heads' | 'tails') => {
    setGameState(prev => ({
      ...prev,
      selectedSide: side,
      gamePhase: 'flipping'
    }));

    handleFlip();
  };

  const handleFlip = async () => {
    if (!gameState.selectedSide) return;
    
    setGameState(prev => ({
      ...prev,
      isFlipping: true
    }));
      
    try {
      const clientSeed = generateClientSeed();
      
      console.log('Calling coinflip engine with:', {
        bet_amount: gameState.betAmount,
        selected_side: gameState.selectedSide,
        client_seed: clientSeed,
        streak: gameState.streak.length,
        current_multiplier: gameState.currentMultiplier
      });
      
      // Call server-side coinflip engine
      const { data, error } = await supabase.functions.invoke('coinflip-streak-engine', {
        body: {
          bet_amount: gameState.betAmount,
          selected_side: gameState.selectedSide,
          client_seed: clientSeed,
          streak: gameState.streak.length,
          current_multiplier: gameState.currentMultiplier
        }
      });

      console.log('Coinflip engine response:', { data, error });

      if (error) throw error;

      const result = data.result;
      const won = data.won;
      
      // Wait for animation to complete
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          lastResult: result,
          isFlipping: false,
          gamePhase: won ? 'choice' : 'result'
        }));

        if (won) {
          // Add to streak
          const newStreak = [...gameState.streak, { result, multiplier: data.multiplier }];
          const nextMultiplier = calculateMultiplier(newStreak.length);
          
          setGameState(prev => ({
            ...prev,
            streak: newStreak,
            currentMultiplier: data.multiplier,
            currentPayout: gameState.betAmount * data.multiplier
          }));

          toast({
            title: "You Won!",
            description: `The coin landed on ${result}! Current streak: ${newStreak.length}`,
            variant: "default",
          });
        } else {
          // Reset game
          handleGameEnd('lost', data.profit || -gameState.betAmount);
          
          toast({
            title: "You Lost!",
            description: `The coin landed on ${result}. Streak reset!`,
            variant: "destructive",
          });
        }

        // Update balance from server response if available
        if (data.new_balance !== undefined) {
          onUpdateUser({ balance: data.new_balance });
        }
        
      }, 2500); // Wait for coin animation

    } catch (error) {
      console.error('Coinflip error:', error);
      setGameState(prev => ({
        ...prev,
        isFlipping: false,
        gamePhase: 'setup',
        hasActiveBet: false
      }));
      
      toast({
        title: "Error",
        description: "Failed to process coinflip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCashOut = async () => {
    try {
      const profit = gameState.currentPayout - gameState.betAmount;
      
      // Record the cash out
      await addGameRecord({
        game_type: 'coinflip',
        bet_amount: gameState.betAmount,
        result: 'win',
        profit,
        streak_length: gameState.streak.length,
        final_multiplier: gameState.currentMultiplier,
        action: 'cash_out',
        game_data: {
          action: 'cash_out',
          streak_length: gameState.streak.length,
          multiplier: gameState.currentMultiplier,
          final_payout: gameState.currentPayout
        }
      });

      handleGameEnd('cashed_out', profit);
      
      toast({
        title: "Cashed Out!",
        description: `You won $${profit.toFixed(2)} with a ${gameState.streak.length}-win streak!`,
        variant: "default",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cash out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    const nextMultiplier = calculateMultiplier(gameState.streak.length);
    
    setGameState(prev => ({
      ...prev,
      currentMultiplier: nextMultiplier,
      currentPayout: gameState.betAmount * nextMultiplier,
      gamePhase: 'betting'
    }));
  };

  const handleGameEnd = (reason: 'lost' | 'cashed_out', profit: number) => {
    setGameState({
      gamePhase: 'setup',
      betAmount: 0,
      selectedSide: null,
      streak: [],
      currentMultiplier: 1.98,
      currentPayout: 0,
      isFlipping: false,
      lastResult: null,
      hasActiveBet: false
    });
    setBetInput('');
  };

  const nextMultiplier = calculateMultiplier(gameState.streak.length);
  const nextPayout = gameState.betAmount * nextMultiplier;

  return (
    <div className="space-y-6">
      {/* Main Game Card */}
      <Card className="glass border-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Coins className="w-5 h-5 text-primary" />
            <span>Coinflip Streak</span>
            {gameState.hasActiveBet && (
              <div className="ml-auto flex items-center space-x-2">
                <Zap className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Active Bet: ${gameState.betAmount}</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {/* Coin Animation */}
          <CoinFlipAnimation
            isFlipping={gameState.isFlipping}
            result={gameState.lastResult}
            size="large"
          />

          {/* Streak Tracker */}
          {gameState.hasActiveBet && (
            <StreakTracker
              streak={gameState.streak}
              maxStreak={9}
              isAnimating={gameState.isFlipping}
              betAmount={gameState.betAmount}
            />
          )}

          {/* Game Phase: Setup */}
          {gameState.gamePhase === 'setup' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bet Amount</label>
                <Input
                  type="number"
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                  placeholder="Enter bet amount"
                  className="glass border-0"
                  max={userData?.balance}
                  min="0"
                  step="0.01"
                />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetInput('10')}
                    className="glass border-0"
                  >
                    $10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetInput('50')}
                    className="glass border-0"
                  >
                    $50
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetInput(userData?.balance?.toString() || '0')}
                    className="glass border-0"
                  >
                    Max
                  </Button>
                </div>
              </div>

              <Button
                onClick={handlePlaceBet}
                disabled={!betInput || parseFloat(betInput) <= 0}
                className="w-full gradient-primary hover:glow-primary transition-smooth"
              >
                Place Bet ${betInput || '0'}
              </Button>
            </div>
          )}

          {/* Game Phase: Betting (Choose Side) */}
          {gameState.gamePhase === 'betting' && (
            <div className="space-y-4">
              <div className="text-center glass rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Choose Your Side</h3>
                <p className="text-muted-foreground">
                  Bet placed: ${gameState.betAmount} • Potential win: ${gameState.currentPayout.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleSideSelection('heads')}
                  className="glass border-0 hover:gradient-primary transition-all duration-300 h-16"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">👑</div>
                    <div>Heads</div>
                  </div>
                </Button>
                <Button
                  onClick={() => handleSideSelection('tails')}
                  className="glass border-0 hover:gradient-primary transition-all duration-300 h-16"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">⚡</div>
                    <div>Tails</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Game Phase: Flipping */}
          {gameState.gamePhase === 'flipping' && (
            <div className="text-center space-y-4">
              <div className="glass rounded-lg p-4">
                <h3 className="text-lg font-semibold">Flipping...</h3>
                <p className="text-muted-foreground">
                  You chose {gameState.selectedSide} for ${gameState.betAmount}
                </p>
              </div>
            </div>
          )}

          {/* Game Phase: Choice (Win - Continue or Cash Out) */}
          {gameState.gamePhase === 'choice' && (
            <div className="space-y-4">
              <div className="text-center glass rounded-lg p-4 border border-success/20">
                <h3 className="text-lg font-semibold text-success mb-2">You Won!</h3>
                <p className="text-muted-foreground">
                  Current payout: <span className="text-success font-bold">${gameState.currentPayout.toFixed(2)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Streak: {gameState.streak.length} wins • {gameState.currentMultiplier.toFixed(2)}x multiplier
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCashOut}
                  variant="default"
                  className="gradient-success"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cash Out ${gameState.currentPayout.toFixed(2)}
                </Button>
                <Button
                  onClick={handleContinue}
                  variant="outline"
                  className="glass border-0 hover:bg-primary/10"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Continue for {nextMultiplier.toFixed(2)}x
                </Button>
              </div>

              {gameState.streak.length < 9 && (
                <div className="text-center text-xs text-muted-foreground">
                  Next win: ${nextPayout.toFixed(2)} (Risk: ${gameState.betAmount} • 50% chance)
                </div>
              )}
            </div>
          )}

          {/* Game Phase: Result (Loss) */}
          {gameState.gamePhase === 'result' && (
            <div className="space-y-4">
              <div className="text-center glass rounded-lg p-4 border border-destructive/20">
                <h3 className="text-lg font-semibold text-destructive mb-2">Game Over</h3>
                <p className="text-muted-foreground">
                  Lost ${gameState.betAmount} • Streak reset
                </p>
              </div>

              <Button
                onClick={() => setGameState(prev => ({ ...prev, gamePhase: 'setup' }))}
                className="w-full gradient-primary"
              >
                Play Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Display - Only show during active bet */}
      {gameState.hasActiveBet && (
        <PayoutDisplay
          currentMultiplier={gameState.currentMultiplier}
          nextMultiplier={nextMultiplier}
          betAmount={gameState.betAmount}
          currentPayout={gameState.currentPayout}
          nextPayout={nextPayout}
          streak={gameState.streak.length}
          gamePhase={gameState.gamePhase}
        />
      )}

      {/* Live Coinflip Feed */}
      <LiveCoinflipFeed />
    </div>
  );
}
