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
      <div className="text-center mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Streak Progress ({streak.length}/{maxStreak})
        </h3>
      </div>
      
      <div className="flex justify-center items-center space-x-1 overflow-x-auto pb-8">
        {Array.from({ length: maxStreak }, (_, index) => {
          const isWon = index < streak.length;
          const streakResult = streak[index];
          const isNext = index === streak.length;
          const multiplier = calculateMultiplier(index);
          const potentialPayout = betAmount * multiplier;
          
          return (
            <div
              key={index}
              className={`
                relative flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                ${isWon 
                  ? 'border-success bg-success/20 text-success' 
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
              
              {/* Potential payout display below */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
                <div className="text-xs font-medium text-success">
                  ${potentialPayout ? Math.round(potentialPayout) : '0'}
                </div>
              </div>
              
              {/* Connecting line */}
              {index < maxStreak - 1 && (
                <div className={`
                  absolute top-1/2 -right-0.5 w-1 h-0.5 transform -translate-y-1/2
                  ${index < streak.length ? 'bg-success' : 'bg-muted/30'}
                  transition-colors duration-300
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}