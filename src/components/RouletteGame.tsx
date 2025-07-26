import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { RouletteReel } from './RouletteReel';

interface Round {
  id: string;
  status: string;
  betting_end_time?: string;
  spinning_end_time?: string;
  result_slot?: number;
  result_color?: string;
  round_number?: number;
}

export function RouletteGame() {
  const { user } = useAuth();
  const { userData: profile } = useUserProfile();
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  // Get current round from server
  const getCurrentRound = async () => {
    try {
      console.log('🎰 Getting current round...');
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_current_round' }
      });

      if (error) {
        console.error('❌ Error getting round:', error);
        throw error;
      }

      console.log('✅ Got round:', data);
      setCurrentRound(data);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to get round:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to game server",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Place a bet
  const placeBet = async (betColor: string) => {
    if (!user || !currentRound) {
      toast({
        title: "Cannot Bet",
        description: "You must be logged in and have an active round",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`🎰 Placing bet: ${betColor}`);
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { 
          action: 'place_bet',
          userId: user.id,
          roundId: currentRound.id,
          betColor: betColor,
          betAmount: 10 // Fixed bet amount for testing
        }
      });

      if (error) {
        console.error('❌ Error placing bet:', error);
        throw error;
      }

      console.log('✅ Bet placed:', data);
      toast({
        title: "Bet Placed",
        description: `Bet $10 on ${betColor}`,
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to place bet:', error);
      toast({
        title: "Bet Failed",
        description: error.message || "Failed to place bet",
        variant: "destructive",
      });
    }
  };

  // Spin the round (manual for testing)
  const spinRound = async () => {
    if (!currentRound) return;

    try {
      console.log('🎰 Spinning round...');
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { 
          action: 'spin_round',
          roundId: currentRound.id
        }
      });

      if (error) {
        console.error('❌ Error spinning round:', error);
        throw error;
      }

      console.log('✅ Round completed:', data);
      setCurrentRound(data);
      
      toast({
        title: "Round Complete",
        description: `Result: ${data.result_color} (slot ${data.result_slot})`,
        variant: "default",
      });

      // After 3 seconds, get a new round
      setTimeout(() => {
        getCurrentRound();
      }, 3000);
    } catch (error: any) {
      console.error('Failed to spin round:', error);
      toast({
        title: "Spin Failed", 
        description: error.message || "Failed to spin round",
        variant: "destructive",
      });
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!currentRound?.betting_end_time) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(currentRound.betting_end_time!).getTime();
      const timeLeft = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(timeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRound?.betting_end_time]);

  // Initialize
  useEffect(() => {
    getCurrentRound();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">🎰 Roulette</h2>
        <p className="text-gray-400">Loading...</p>
        <div className="mt-4">
          <Button onClick={getCurrentRound} variant="outline">
            🔄 Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">🎰 Roulette</h2>
        <p className="text-red-400">❌ No active round</p>
        <div className="mt-4">
          <Button onClick={getCurrentRound} variant="outline">
            🔄 Get Round
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">🎰 Roulette</h2>
      
      {/* Debug Info */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-sm">
        <p><strong>Round:</strong> {currentRound.id.slice(0, 8)}</p>
        <p><strong>Status:</strong> {currentRound.status}</p>
        <p><strong>Time Left:</strong> {timeLeft}s</p>
        {currentRound.result_slot !== undefined && (
          <p><strong>Result:</strong> {currentRound.result_color} (slot {currentRound.result_slot})</p>
        )}
      </div>

      {/* Roulette Wheel */}
      <div className="mb-6">
        <RouletteReel 
          isSpinning={currentRound.status === 'spinning'}
          winningSlot={currentRound.result_slot || null}
          showWinAnimation={currentRound.status === 'completed'}
        />
      </div>

      {/* Betting Interface */}
      {currentRound.status === 'betting' && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Place Your Bets (${timeLeft}s left)</h3>
          
          {user ? (
            <div className="flex gap-4">
              <Button 
                onClick={() => placeBet('red')} 
                className="bg-red-600 hover:bg-red-700"
              >
                Red (2x)
              </Button>
              <Button 
                onClick={() => placeBet('black')} 
                className="bg-gray-800 hover:bg-gray-900"
              >
                Black (2x)
              </Button>
              <Button 
                onClick={() => placeBet('green')} 
                className="bg-green-600 hover:bg-green-700"
              >
                Green (14x)
              </Button>
            </div>
          ) : (
            <p className="text-gray-400">Sign in to place bets</p>
          )}
        </div>
      )}

      {/* Manual Controls (for testing) */}
      <div className="mt-6 p-4 bg-blue-900/20 rounded">
        <h3 className="text-lg font-semibold mb-2">🧪 Testing Controls</h3>
        <div className="flex gap-2">
          <Button onClick={getCurrentRound} variant="outline" size="sm">
            🔄 Refresh Round
          </Button>
          {currentRound.status === 'betting' && (
            <Button onClick={spinRound} variant="outline" size="sm">
              🎲 Manual Spin
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}