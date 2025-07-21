import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, Trophy, Zap, AlertTriangle, Coins } from 'lucide-react';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';

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
  const { liveBetFeed, isConnected } = useRealtimeFeeds();

  // Filter tower bets from live feed
  const towerBets = liveBetFeed.filter(bet => bet.game_type === 'tower');

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

  const changeDifficulty = (newDifficulty: string) => {
    if (game?.status === 'active') {
      toast({
        title: "Game in Progress",
        description: "Finish your current game before changing difficulty",
        variant: "destructive",
      });
      return;
    }
    setDifficulty(newDifficulty);
    resetGame();
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
    const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name === 'Easy' ? 4 : 
                       DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name === 'Medium' ? 3 : 
                       DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name === 'Hard' ? 2 : 3;

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
          {Array.from({ length: tilesPerRow }, (_, i) => renderTile(levelIndex, i))}
        </div>

        {isPastLevel && (
          <div className="text-green-400 text-sm">✅ Cleared</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-6">{/* Game Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-6 w-6" />
                Tower Game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Difficulty and Bet Controls */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select value={difficulty} onValueChange={changeDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.icon} {info.name} - {info.maxMultiplier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Bet Amount</label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="1"
                    disabled={game?.status === 'active'}
                  />
                </div>
                <div className="flex items-end">
                  {!game || game.status !== 'active' ? (
                    <Button onClick={startGame} disabled={loading}>
                      {loading ? "Starting..." : "Start Game"}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {game.current_level > 0 && (
                        <Button onClick={cashOut} disabled={loading} variant="outline">
                          Cash Out ${(parseFloat(betAmount) * game.current_multiplier).toFixed(2)}
                        </Button>
                      )}
                      <Button onClick={resetGame} variant="destructive">
                        End Game
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Game Status */}
              {game && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge className={DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].color}>
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].icon} {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Level {game.current_level + 1}/{game.max_level}</span>
                    </div>
                  </div>
                  {game.current_level > 0 && (
                    <div className="text-2xl font-bold text-primary">
                      {game.current_multiplier.toFixed(2)}x
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tower */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {game ? (
                  /* Render levels from top to bottom */
                  Array.from({ length: game.max_level }, (_, i) => game.max_level - 1 - i)
                    .map(levelIndex => renderLevel(levelIndex))
                ) : (
                  /* Show example tower for selected difficulty */
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold mb-4">
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].icon} {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name} Mode Preview
                    </h3>
                    {PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].slice().reverse().map((multiplier, index) => {
                      const actualLevel = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].length - 1 - index;
                      const tilesPerRow = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 3 : difficulty === 'hard' ? 2 : 3;
                      
                      return (
                        <div key={actualLevel} className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20 border-muted-foreground/20">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Badge variant="outline">L{actualLevel + 1}</Badge>
                            <span className="text-sm font-medium">{multiplier.toFixed(2)}x</span>
                          </div>
                          <div className="flex gap-2">
                            {Array.from({ length: tilesPerRow }, (_, i) => (
                              <div key={i} className="w-12 h-12 rounded-lg border-2 bg-muted border-muted-foreground/20 flex items-center justify-center cursor-not-allowed">
                                ?
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game End Status */}
          {game?.status !== 'active' && game?.status && (
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
                      You cashed out at level {game.current_level} for ${game.final_payout?.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tower Live Feed */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Tower Live Feed
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {!isConnected ? (
                <div className="text-center text-muted-foreground py-4">
                  Connecting to live feed...
                </div>
              ) : towerBets.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No recent Tower bets. Be the first!
                </div>
              ) : (
                towerBets.slice(0, 20).map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                        {bet.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{bet.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {bet.game_data?.difficulty} - Level {bet.game_data?.level_reached}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${bet.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                        {bet.result === 'win' ? '+' : '-'}${Math.abs(bet.profit).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bet.multiplier ? `${bet.multiplier.toFixed(2)}x` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};