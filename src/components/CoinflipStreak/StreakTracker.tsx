import React from 'react';
import CoinFlipAnimation from './CoinFlipAnimation';

interface StreakResult {
  result: 'heads' | 'tails';
  multiplier: number;
}

interface StreakTrackerProps {
  streak: StreakResult[];
  maxStreak?: number;
  isAnimating?: boolean;
  betAmount?: number;
}

// Calculate multiplier with 1% house edge (1.98^n)
const calculateMultiplier = (streakLength: number): number => {
  return Math.pow(1.98, streakLength + 1);
};

export default function StreakTracker({ 
  streak, 
  maxStreak = 9, 
  isAnimating = false,
  betAmount = 0
}: StreakTrackerProps) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Streak Progress ({streak.length}/{maxStreak})
        </h3>
        <p className="text-xs text-muted-foreground">
          Win consecutive flips to increase your multiplier
        </p>
      </div>
      
      <div className="relative">
        {/* Progress line background */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted/30 rounded-full" />
        
        {/* Active progress line */}
        <div 
          className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-success to-primary rounded-full transition-all duration-500"
          style={{ width: `${(streak.length / maxStreak) * 100}%` }}
        />
        
        <div className="flex justify-between items-start space-x-1 relative">
          {Array.from({ length: maxStreak }, (_, index) => {
            const isWon = index < streak.length;
            const streakResult = streak[index];
            const isNext = index === streak.length;
            const multiplier = calculateMultiplier(index);
            const potentialPayout = betAmount * multiplier;
            
            return (
              <div key={index} className="flex flex-col items-center space-y-2">
                {/* Streak circle */}
                <div
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center relative
                    ${isWon 
                      ? 'border-success bg-success/20 text-success shadow-lg' 
                      : isNext && isAnimating
                      ? 'border-warning bg-warning/20 text-warning animate-pulse'
                      : 'border-muted bg-muted/10 text-muted-foreground'
                    }
                  `}
                >
                  {isWon && streakResult ? (
                    <div className="text-xs">
                      {streakResult.result === 'heads' ? '👑' : '⚡'}
                    </div>
                  ) : (
                    <div className="text-xs font-bold">
                      {index + 1}
                    </div>
                  )}
                </div>
                
                {/* Potential payout */}
                <div className="text-center min-h-[2.5rem] flex flex-col justify-center">
                  <div className="text-xs font-medium text-success leading-tight">
                    ${potentialPayout ? (potentialPayout >= 1000 ? 
                      `${(potentialPayout / 1000).toFixed(1)}k` : 
                      Math.round(potentialPayout).toString()
                    ) : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {multiplier.toFixed(2)}x
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}