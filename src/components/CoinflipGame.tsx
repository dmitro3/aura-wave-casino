
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGameHistory } from '@/hooks/useGameHistory';
import { UserProfile } from '@/hooks/useUserProfile';

interface CoinflipGameProps {
  userData: UserProfile;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

export default function CoinflipGame({ userData, onUpdateUser }: CoinflipGameProps) {
  const [betAmount, setBetAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const { history, addGameRecord } = useGameHistory('coinflip', 10);
  const { toast } = useToast();

  const handleFlip = async () => {
    if (!userData || isFlipping) return;

    const bet = parseFloat(betAmount);
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

    setIsFlipping(true);
    
    // Simulate coin flip delay
    setTimeout(async () => {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = result === selectedSide;
      const profit = won ? bet : -bet;
      
      setCoinResult(result);

      try {
        // Add game record to history
        await addGameRecord({
          game_type: 'coinflip',
          bet_amount: bet,
          result: won ? 'win' : 'lose',
          profit,
          game_data: {
            choice: selectedSide,
            coinResult: result,
            won
          }
        });

        // Update user profile
        const updatedGameStats = {
          ...userData.gameStats,
          coinflip: {
            wins: userData.gameStats.coinflip.wins + (won ? 1 : 0),
            losses: userData.gameStats.coinflip.losses + (won ? 0 : 1),
            profit: userData.gameStats.coinflip.profit + profit
          }
        };

        await onUpdateUser({
          balance: userData.balance + profit,
          total_wagered: userData.total_wagered + bet,
          total_profit: userData.total_profit + profit,
          xp: userData.xp + Math.floor(bet / 10), // XP based on bet size
          gameStats: updatedGameStats
        });

        toast({
          title: won ? "You Won!" : "You Lost!",
          description: `The coin landed on ${result}. ${won ? `+$${bet}` : `-$${bet}`}`,
          variant: won ? "default" : "destructive",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process game result",
          variant: "destructive",
        });
      }

      setIsFlipping(false);
      setBetAmount('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-primary" />
            <span>Coinflip</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coin Display */}
          <div className="flex justify-center">
            <div className={`w-32 h-32 rounded-full gradient-primary flex items-center justify-center text-4xl font-bold text-white shadow-2xl ${
              isFlipping ? 'animate-coin-flip' : coinResult ? 'animate-bounce' : ''
            }`}>
              {isFlipping ? '🪙' : coinResult ? (coinResult === 'heads' ? '👑' : '⚡') : '🪙'}
            </div>
          </div>

          {/* Game Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedSide === 'heads' ? 'default' : 'outline'}
                onClick={() => setSelectedSide('heads')}
                disabled={isFlipping}
                className={selectedSide === 'heads' ? 'gradient-primary' : 'glass border-0'}
              >
                👑 Heads
              </Button>
              <Button
                variant={selectedSide === 'tails' ? 'default' : 'outline'}
                onClick={() => setSelectedSide('tails')}
                disabled={isFlipping}
                className={selectedSide === 'tails' ? 'gradient-primary' : 'glass border-0'}
              >
                ⚡ Tails
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bet Amount</label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter bet amount"
                disabled={isFlipping}
                className="glass border-0"
                max={userData?.balance}
                min="0"
                step="0.01"
              />
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount('10')}
                  disabled={isFlipping}
                  className="glass border-0"
                >
                  $10
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount('50')}
                  disabled={isFlipping}
                  className="glass border-0"
                >
                  $50
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(userData?.balance?.toString() || '0')}
                  disabled={isFlipping}
                  className="glass border-0"
                >
                  Max
                </Button>
              </div>
            </div>

            <Button
              onClick={handleFlip}
              disabled={isFlipping || !betAmount || parseFloat(betAmount) <= 0}
              className="w-full gradient-primary hover:glow-primary transition-smooth"
            >
              {isFlipping ? 'Flipping...' : 'Flip Coin'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Game History */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-lg">Recent Flips</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No games played yet. Make your first flip!
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-2 glass rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {game.game_data?.coinResult === 'heads' ? '👑' : '⚡'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Chose {game.game_data?.choice}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={game.result === 'win' ? 'default' : 'destructive'} className="glass">
                      ${game.bet_amount.toFixed(2)}
                    </Badge>
                    <div className={`flex items-center space-x-1 ${game.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {game.profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span className="text-sm font-medium">
                        {game.profit >= 0 ? '+' : ''}${game.profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
