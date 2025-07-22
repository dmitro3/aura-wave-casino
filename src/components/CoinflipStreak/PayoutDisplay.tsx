import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Zap, DollarSign } from 'lucide-react';

interface PayoutDisplayProps {
  currentMultiplier: number;
  nextMultiplier: number;
  betAmount: number;
  currentPayout: number;
  nextPayout: number;
  streak: number;
  gamePhase: string;
}

export default function PayoutDisplay({
  currentMultiplier,
  nextMultiplier,
  betAmount,
  currentPayout,
  nextPayout,
  streak,
  gamePhase
}: PayoutDisplayProps) {
  const showNext = streak > 0 && gamePhase === 'choice' && streak < 9;

  return (
    <Card className="glass border-0 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Payout */}
          <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">Current Payout</span>
            </div>
            <div className="text-2xl font-bold text-success mb-1">
              ${currentPayout.toFixed(2)}
            </div>
            <div className="text-sm text-success/80">
              {currentMultiplier.toFixed(2)}x multiplier
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Profit: +${(currentPayout - betAmount).toFixed(2)}
            </div>
          </div>

          {/* Next Payout (if applicable) */}
          {showNext && (
            <div className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-warning">Next Win</span>
              </div>
              <div className="text-2xl font-bold text-warning mb-1">
                ${nextPayout.toFixed(2)}
              </div>
              <div className="text-sm text-warning/80">
                {nextMultiplier.toFixed(2)}x multiplier
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Risk: ${betAmount.toFixed(2)} • 50% chance
              </div>
            </div>
          )}

          {/* Risk Warning for high streaks */}
          {streak >= 5 && gamePhase === 'choice' && (
            <div className="md:col-span-2 text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <TrendingUp className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">High Risk Warning</span>
              </div>
              <div className="text-xs text-destructive/80">
                {streak} win streak • Higher multipliers but higher risk of losing everything
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}