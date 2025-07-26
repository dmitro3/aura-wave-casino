import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
}

const REEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: '14x' },
  { slot: 1, color: 'red', multiplier: '2x' },
  { slot: 2, color: 'black', multiplier: '2x' },
  { slot: 3, color: 'red', multiplier: '2x' },
  { slot: 4, color: 'black', multiplier: '2x' },
  { slot: 5, color: 'red', multiplier: '2x' },
  { slot: 6, color: 'black', multiplier: '2x' },
  { slot: 7, color: 'red', multiplier: '2x' },
  { slot: 8, color: 'black', multiplier: '2x' },
  { slot: 9, color: 'red', multiplier: '2x' },
  { slot: 10, color: 'black', multiplier: '2x' },
  { slot: 11, color: 'red', multiplier: '2x' },
  { slot: 12, color: 'black', multiplier: '2x' },
  { slot: 13, color: 'red', multiplier: '2x' },
  { slot: 14, color: 'black', multiplier: '2x' }
];

export const RouletteReel = ({ isSpinning, winningSlot, showWinAnimation }: RouletteReelProps) => {
  const [position, setPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  const TILE_WIDTH = 100;
  const ANIMATION_DURATION = 4000;

  // Debug logging
  useEffect(() => {
    console.log('🎰 RouletteReel Props Update:', { 
      isSpinning, 
      winningSlot, 
      showWinAnimation, 
      isAnimating,
      position 
    });
  }, [isSpinning, winningSlot, showWinAnimation, isAnimating, position]);

  // Simple CSS-based animation approach
  const startSimpleAnimation = (targetSlot: number) => {
    console.log('🎰 Starting SIMPLE animation to slot:', targetSlot);
    
    setIsAnimating(true);
    
    // Calculate final position for center alignment
    const containerCenter = 300; // Approximate center
    const cycles = 5; // Number of full cycles
    const totalDistance = cycles * REEL_SLOTS.length * TILE_WIDTH;
    const targetPosition = targetSlot * TILE_WIDTH;
    const finalPosition = -(totalDistance + targetPosition - containerCenter);
    
    console.log('🎰 Animation target:', {
      targetSlot,
      containerCenter,
      totalDistance,
      targetPosition,
      finalPosition
    });

    // Use CSS transition for smooth animation
    setTimeout(() => {
      setPosition(finalPosition);
    }, 100);

    // Stop animation after duration
    setTimeout(() => {
      console.log('🎰 Animation completed');
      setIsAnimating(false);
    }, ANIMATION_DURATION + 100);
  };

  const resetReel = () => {
    console.log('🎰 Resetting reel');
    setPosition(0);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Handle state changes
  useEffect(() => {
    console.log('🎰 State change effect triggered');
    
    if (isSpinning && winningSlot !== null && !isAnimating) {
      console.log('🎰 CONDITIONS MET - Starting animation!');
      startSimpleAnimation(winningSlot);
    } else if (!isSpinning && !showWinAnimation) {
      console.log('🎰 Round ended, resetting in 2 seconds');
      setTimeout(resetReel, 2000);
    } else {
      console.log('🎰 Conditions not met:', {
        isSpinning,
        winningSlotNotNull: winningSlot !== null,
        notAnimating: !isAnimating
      });
    }
  }, [isSpinning, winningSlot, showWinAnimation]);

  const getTileColorClass = (color: string) => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-lg';
      case 'red': 
        return 'bg-gradient-to-br from-red-500 to-red-700 border-red-300 text-white shadow-lg';
      case 'black': 
        return 'bg-gradient-to-br from-gray-800 to-black border-gray-600 text-white shadow-lg';
      default: 
        return 'bg-gray-500 text-white';
    }
  };

  // Create repeating tiles
  const tiles = [];
  const repeats = 10;
  for (let repeat = 0; repeat < repeats; repeat++) {
    REEL_SLOTS.forEach((slot, index) => {
      tiles.push({
        ...slot,
        uniqueKey: `${repeat}-${index}`
      });
    });
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      
      {/* Debug Info */}
      <div className="mb-4 p-2 bg-gray-800 rounded text-xs text-white">
        <div>isSpinning: {String(isSpinning)}</div>
        <div>winningSlot: {winningSlot}</div>
        <div>isAnimating: {String(isAnimating)}</div>
        <div>position: {position.toFixed(0)}px</div>
        <div>showWinAnimation: {String(showWinAnimation)}</div>
      </div>

      {/* Main Reel Container */}
      <div className="relative h-24 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-3 border-yellow-500 overflow-hidden shadow-2xl">
        
        {/* Static Center Highlight */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-24 z-30 pointer-events-none">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-yellow-500"></div>
          </div>
          <div className="absolute inset-0 border-l-2 border-r-2 border-yellow-500 bg-yellow-500/5 backdrop-blur-sm">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-500/60"></div>
          </div>
        </div>

        {/* Rolling Tiles */}
        <div 
          className={`flex h-full items-center ${isAnimating ? 'transition-transform duration-[4000ms] ease-out' : 'transition-none'}`}
          style={{
            transform: `translateX(${position}px)`,
            willChange: isAnimating ? 'transform' : 'auto',
          }}
        >
          {tiles.map((tile) => {
            const isWinning = !isAnimating && showWinAnimation && tile.slot === winningSlot;
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-16 flex flex-col items-center justify-center border-r border-gray-700 relative transition-all duration-500 ${getTileColorClass(tile.color)} ${
                  isWinning ? 'scale-110 ring-3 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-xl font-bold drop-shadow-md transition-all duration-300 ${
                  isWinning ? 'text-yellow-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-300 ${
                  isWinning ? 'bg-yellow-400/40 text-yellow-200 scale-110' : 'text-white/80'
                }`}>
                  {tile.multiplier}
                </div>
                {isWinning && (
                  <>
                    <div className="absolute inset-0 bg-yellow-400/15 animate-pulse rounded"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-ping"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Motion Effects */}
        {isAnimating && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/8 to-transparent animate-pulse pointer-events-none"></div>
          </>
        )}

        {/* Side Gradients */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none z-10"></div>
      </div>

      {/* Win Celebration */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in fade-in duration-700">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl font-bold text-xl shadow-2xl border-3 border-yellow-300 animate-bounce">
            🎯 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎯
          </div>
        </div>
      )}
      
      {/* Status */}
      <div className="text-center mt-4">
        <p className="text-lg font-semibold">
          {isAnimating ? (
            <span className="text-cyan-400 animate-pulse">🎰 Rolling the reel...</span>
          ) : winningSlot !== null ? (
            <span className="text-emerald-400">
              🏆 Result: {REEL_SLOTS[winningSlot]?.color} {REEL_SLOTS[winningSlot]?.slot}
            </span>
          ) : (
            <span className="text-gray-400">🎮 Ready to spin!</span>
          )}
        </p>
      </div>
    </div>
  );
};