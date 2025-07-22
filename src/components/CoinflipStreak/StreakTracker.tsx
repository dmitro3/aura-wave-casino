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
}

export default function StreakTracker({ 
  streak, 
  maxStreak = 9, 
  isAnimating = false 
}: StreakTrackerProps) {
  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Win Streak: {streak.length}
        </h3>
        <p className="text-sm text-muted-foreground">
          {maxStreak - streak.length} slots remaining
        </p>
      </div>
      
      <div className="flex justify-center space-x-2 overflow-x-auto py-2">
        {Array.from({ length: maxStreak }, (_, index) => {
          const isWon = index < streak.length;
          const streakResult = streak[index];
          const isLatest = index === streak.length - 1;
          
          return (
            <div
              key={index}
              className={`
                relative flex-shrink-0 w-12 h-12 rounded-full border-2 transition-all duration-300
                ${isWon 
                  ? 'border-primary bg-primary/20 shadow-glow' 
                  : 'border-muted bg-muted/10'
                }
                ${isLatest && isAnimating ? 'animate-pulse' : ''}
              `}
            >
              {isWon && streakResult ? (
                <div className="w-full h-full flex items-center justify-center">
                  <CoinFlipAnimation
                    isFlipping={false}
                    result={streakResult.result}
                    size="small"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  {index + 1}
                </div>
              )}
              
              {/* Multiplier display */}
              {isWon && streakResult && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-primary">
                  {streakResult.multiplier.toFixed(2)}x
                </div>
              )}
              
              {/* Connecting line */}
              {index < maxStreak - 1 && (
                <div className={`
                  absolute top-1/2 -right-1 w-2 h-0.5 transform -translate-y-1/2
                  ${index < streak.length - 1 ? 'bg-primary' : 'bg-muted'}
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