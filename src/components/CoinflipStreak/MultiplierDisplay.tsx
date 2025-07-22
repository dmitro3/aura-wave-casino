import React from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';

interface MultiplierDisplayProps {
  currentMultiplier: number;
  nextMultiplier: number;
  betAmount: number;
  currentPayout: number;
  nextPayout: number;
  streak: number;
}

export default function MultiplierDisplay({
  currentMultiplier,
  nextMultiplier,
  betAmount,
  currentPayout,
  nextPayout,
  streak
}: MultiplierDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="glass rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Multiplier</span>
          <div className="flex items-center space-x-1 text-primary">
            <TrendingUp className="w-4 h-4" />
            <span className="text-lg font-bold">{currentMultiplier.toFixed(2)}x</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Payout</span>
          <div className="flex items-center space-x-1 text-success">
            <DollarSign className="w-4 h-4" />
            <span className="text-lg font-bold">${currentPayout.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Next Level Preview */}
      {streak > 0 && (
        <div className="glass rounded-lg p-4 space-y-3 border border-primary/20">
          <div className="text-center">
            <h4 className="text-sm font-medium text-primary mb-2">Next Win</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Multiplier</span>
            <div className="flex items-center space-x-1 text-primary">
              <TrendingUp className="w-4 h-4" />
              <span className="text-lg font-bold">{nextMultiplier.toFixed(2)}x</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Potential Payout</span>
            <div className="flex items-center space-x-1 text-success">
              <DollarSign className="w-4 h-4" />
              <span className="text-lg font-bold">${nextPayout.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Risk: ${betAmount.toFixed(2)} • Win Chance: 50%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}