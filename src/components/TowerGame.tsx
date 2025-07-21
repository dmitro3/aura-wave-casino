import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, Trophy, Zap, AlertTriangle, Coins } from 'lucide-react';

interface TowerGame {
  id: string;
  difficulty: string;
  bet_amount: number;
  current_level: number;
  max_level: number;
  status: 'active' | 'cashed_out' | 'lost';
  current_multiplier: number;
  final_payout?: number;
}

interface DifficultyConfig {
  tilesPerRow: number;
  maxLevel: number;
}

const DIFFICULTY_INFO = {
  easy: { 
    name: 'Easy', 
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: '🟢',
    description: '4 tiles, 3 safe, 75% chance',
    maxMultiplier: '11.95x'
  },
  medium: { 
    name: 'Medium', 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: '🟡',
    description: '3 tiles, 2 safe, 66.6% chance',
    maxMultiplier: '33.99x'
  },
  hard: { 
    name: 'Hard', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: '🔴',
    description: '2 tiles, 1 safe, 50% chance',
    maxMultiplier: '475.40x'
  },
  extreme: { 
    name: 'Extreme', 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: '🔥',
    description: '3 tiles, 1 safe, 33.3% chance',
    maxMultiplier: '643.10x'
  }
};

const PAYOUT_MULTIPLIERS = {
  easy: [1.32, 1.74, 2.28, 3.00, 3.94, 5.19, 6.83, 9.01, 11.95],
  medium: [1.48, 2.20, 3.26, 4.82, 7.12, 10.52, 15.56, 23.00, 33.99],
  hard: [1.98, 3.92, 7.78, 15.44, 30.64, 60.80, 120.80, 239.66, 475.40],
  extreme: [2.94, 8.64, 25.37, 74.51, 218.82, 643.10]
};

export const TowerGame = () => {
  const [game, setGame] = useState<TowerGame | null>(null);
  const [config, setConfig] = useState<DifficultyConfig | null>(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [betAmount, setBetAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [revealedTiles, setRevealedTiles] = useState<{ [key: string]: { safe: boolean; selected: boolean } }>({});
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [animatingLevel, setAnimatingLevel] = useState<number | null>(null);
  const { toast } = useToast();

  const startGame = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('tower-engine', {
        body: {
          action: 'start',
          difficulty,
          betAmount: parseFloat(betAmount)
        }
      });

      if (error) throw error;

      if (data.success) {
        setGame(data.game);
        setConfig(data.config);
        setRevealedTiles({});
        setSelectedTile(null);
        toast({
          title: "Game Started!",
          description: `Tower game on ${DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name} difficulty`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTile = async (tileIndex: number) => {
    if (!game || selectedTile !== null || loading) return;

    try {
      setLoading(true);
      setSelectedTile(tileIndex);
      setAnimatingLevel(game.current_level + 1);

      const { data, error } = await supabase.functions.invoke('tower-engine', {
        body: {
          action: 'selectTile',
          gameId: game.id,
          tileSelected: tileIndex
        }
      });

      if (error) throw error;

      // Update revealed tiles
      const levelKey = game.current_level;
      setRevealedTiles(prev => ({
        ...prev,
        [`${levelKey}-${tileIndex}`]: { safe: !data.isMine, selected: true }
      }));

      // Reveal all mines if hit one
      if (data.isMine && data.minePositions) {
        const newRevealed = { ...revealedTiles };
        data.minePositions.forEach((minePos: number) => {
          if (minePos !== tileIndex) {
            newRevealed[`${levelKey}-${minePos}`] = { safe: false, selected: false };
          }
        });
        setRevealedTiles(newRevealed);
      }

      // Update game state
      setGame(prev => prev ? {
        ...prev,
        current_level: data.newLevel,
        current_multiplier: data.multiplier,
        status: data.gameStatus,
        final_payout: data.payout
      } : null);

      // Show result
      setTimeout(() => {
        if (data.isMine) {
          toast({
            title: "💥 Mine Hit!",
            description: "Game over! Better luck next time.",
            variant: "destructive",
          });
        } else if (data.gameStatus === 'cashed_out') {
          toast({
            title: "🏆 Tower Completed!",
            description: `Amazing! You won $${data.payout.toFixed(2)}!`,
          });
        } else {
          toast({
            title: "✅ Safe!",
            description: `Level ${data.newLevel} - ${data.multiplier.toFixed(2)}x multiplier`,
          });
        }
        setAnimatingLevel(null);
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select tile",
        variant: "destructive",
      });
      setAnimatingLevel(null);
    } finally {
      setLoading(false);
      setSelectedTile(null);
    }
  };

  const cashOut = async () => {
    if (!game || loading) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('tower-engine', {
        body: {
          action: 'cashOut',
          gameId: game.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setGame(prev => prev ? {
          ...prev,
          status: 'cashed_out',
          final_payout: data.payout
        } : null);

        toast({
          title: "💰 Cashed Out!",
          description: `You won $${data.payout.toFixed(2)} at ${data.multiplier.toFixed(2)}x!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cash out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGame(null);
    setConfig(null);
    setRevealedTiles({});
    setSelectedTile(null);
    setAnimatingLevel(null);
  };

  const renderTile = (levelIndex: number, tileIndex: number) => {
    const tileKey = `${levelIndex}-${tileIndex}`;
    const revealed = revealedTiles[tileKey];
    const isSelected = selectedTile === tileIndex && levelIndex === game?.current_level;
    const isCurrentLevel = levelIndex === game?.current_level;
    const isAnimating = animatingLevel === levelIndex + 1;

    let tileClass = "w-12 h-12 rounded-lg border-2 transition-all duration-300 cursor-pointer flex items-center justify-center text-lg font-bold ";
    
    if (revealed) {
      if (revealed.safe) {
        tileClass += "bg-green-500/20 border-green-500 text-green-400 shadow-glow-green ";
      } else {
        tileClass += "bg-red-500/20 border-red-500 text-red-400 shadow-glow-red animate-pulse ";
      }
    } else if (isSelected) {
      tileClass += "bg-primary/30 border-primary scale-105 ";
    } else if (isCurrentLevel && game?.status === 'active') {
      tileClass += "bg-card border-border hover:border-primary hover:bg-primary/10 hover:scale-105 ";
    } else {
      tileClass += "bg-muted border-muted-foreground/20 cursor-not-allowed ";
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
        {revealed ? (revealed.safe ? '✅' : '💣') : '?'}
      </button>
    );
  };

  const renderLevel = (levelIndex: number) => {
    const isPastLevel = game && levelIndex < game.current_level;
    const isCurrentLevel = game && levelIndex === game.current_level;
    const levelNum = levelIndex + 1;
    const multiplier = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][levelIndex];

    return (
      <div key={levelIndex} className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${
        isPastLevel ? 'bg-green-500/10 border-green-500/30' :
        isCurrentLevel ? 'bg-primary/10 border-primary' :
        'bg-muted/50 border-muted-foreground/20'
      }`}>
        <div className="flex items-center gap-2 min-w-[80px]">
          <Badge variant={isPastLevel ? "default" : isCurrentLevel ? "secondary" : "outline"}>
            L{levelNum}
          </Badge>
          <span className="text-sm font-medium">{multiplier.toFixed(2)}x</span>
        </div>
        
        <div className="flex gap-2">
          {Array.from({ length: config?.tilesPerRow || 4 }, (_, i) => renderTile(levelIndex, i))}
        </div>

        {isPastLevel && (
          <div className="text-green-400 text-sm">✅ Cleared</div>
        )}
      </div>
    );
  };

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-6 w-6" />
              Tower Game
            </CardTitle>
            <p className="text-muted-foreground">
              Climb the tower by selecting safe tiles. Cash out anytime or reach the top for maximum rewards!
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Difficulty Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Difficulty</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      difficulty === key ? info.color : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="font-semibold">{info.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{info.description}</p>
                    <p className="text-sm font-medium text-primary">Max: {info.maxMultiplier}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bet Amount</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter bet amount"
                  min="1"
                  className="flex-1"
                />
                <Button onClick={startGame} disabled={loading} className="px-8">
                  {loading ? "Starting..." : "Start Game"}
                </Button>
              </div>
            </div>

            {/* Payout Table */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Payout Table</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-sm">
                {PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].map((multiplier, index) => (
                  <div key={index} className="bg-muted p-2 rounded text-center">
                    <div className="font-medium">L{index + 1}</div>
                    <div className="text-primary">{multiplier.toFixed(2)}x</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Game Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].color}>
                {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].icon} {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
              </Badge>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                <span className="font-medium">${betAmount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Level {game.current_level + 1}/{game.max_level}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {game.current_level > 0 && game.status === 'active' && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {game.current_multiplier.toFixed(2)}x
                  </span>
                  <Button onClick={cashOut} disabled={loading} variant="outline">
                    Cash Out ${(parseFloat(betAmount) * game.current_multiplier).toFixed(2)}
                  </Button>
                </div>
              )}
              
              {game.status !== 'active' && (
                <div className="flex items-center gap-4">
                  {game.final_payout && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Final Payout</div>
                      <div className="text-xl font-bold text-green-400">
                        ${game.final_payout.toFixed(2)}
                      </div>
                    </div>
                  )}
                  <Button onClick={resetGame}>Play Again</Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tower */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {/* Render levels from top to bottom */}
            {Array.from({ length: game.max_level }, (_, i) => game.max_level - 1 - i)
              .map(levelIndex => renderLevel(levelIndex))}
          </div>
        </CardContent>
      </Card>

      {/* Game Status */}
      {game.status !== 'active' && (
        <Card>
          <CardContent className="p-6 text-center">
            {game.status === 'lost' ? (
              <div className="space-y-2">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
                <h3 className="text-xl font-bold text-red-400">Game Over!</h3>
                <p className="text-muted-foreground">You hit a mine at level {game.current_level + 1}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Trophy className="h-12 w-12 text-green-400 mx-auto" />
                <h3 className="text-xl font-bold text-green-400">Congratulations!</h3>
                <p className="text-muted-foreground">
                  You successfully cashed out at level {game.current_level}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};