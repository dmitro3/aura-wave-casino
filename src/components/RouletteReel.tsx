import { useEffect, useState } from 'react';

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

  const TILE_WIDTH = 120;

  // Main animation logic
  useEffect(() => {
    console.log('🎰 Reel state:', { isSpinning, winningSlot, isAnimating, position });

    if (isSpinning && !isAnimating) {
      console.log('🎰 ✅ STARTING ANIMATION');
      setIsAnimating(true);
      
      // Calculate final position
      const containerCenter = 300; // Center of container
      const totalCycles = 6; // Number of full spins
      const cycleDistance = REEL_SLOTS.length * TILE_WIDTH; // One full cycle
      const totalDistance = totalCycles * cycleDistance;
      
      let finalPosition = -totalDistance + containerCenter;
      
      // If we have a winning slot, land on it precisely
      if (winningSlot !== null) {
        const targetOffset = winningSlot * TILE_WIDTH;
        finalPosition = -totalDistance - targetOffset + containerCenter;
        console.log('🎯 Landing on slot:', winningSlot, 'final position:', finalPosition);
      }
      
      // Start animation
      setPosition(finalPosition);
      
      // Stop animation after duration
      setTimeout(() => {
        console.log('🎰 Animation completed');
        setIsAnimating(false);
      }, 5000); // 5 second animation
    }
    
    // Reset when round ends
    if (!isSpinning && !showWinAnimation && position !== 0) {
      console.log('🎰 Resetting reel');
      setTimeout(() => {
        setPosition(0);
        setIsAnimating(false);
      }, 2000);
    }
  }, [isSpinning, winningSlot, showWinAnimation, isAnimating, position]);

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

  // Create repeating tiles for seamless scrolling
  const tiles = [];
  const repeats = 25;
  for (let repeat = 0; repeat < repeats; repeat++) {
    REEL_SLOTS.forEach((slot, index) => {
      tiles.push({
        ...slot,
        uniqueKey: `${repeat}-${index}`
      });
    });
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      
      {/* Debug Info */}
      <div className="mb-4 p-2 bg-gray-900 rounded text-sm text-white font-mono">
        spinning: {String(isSpinning)} | slot: {winningSlot ?? 'null'} | animating: {String(isAnimating)} | pos: {position.toFixed(0)}px
      </div>

      {/* Reel Container */}
      <div className="relative h-32 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-4 border-yellow-500 overflow-hidden shadow-2xl">
        
        {/* Center Target */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-32 z-30 pointer-events-none">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-500"></div>
          </div>
          <div className="absolute inset-0 border-l-4 border-r-4 border-yellow-500 bg-yellow-500/15 backdrop-blur-sm rounded">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-500/90"></div>
          </div>
        </div>

        {/* Moving Tiles */}
        <div 
          className={`flex h-full items-center ${
            isAnimating ? 'transition-transform duration-[5000ms] ease-out' : 'transition-none'
          }`}
          style={{
            transform: `translateX(${position}px)`,
          }}
        >
          {tiles.map((tile) => {
            const isWinning = !isAnimating && showWinAnimation && tile.slot === winningSlot;
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-24 flex flex-col items-center justify-center border-r-2 border-gray-600 relative ${getTileColorClass(tile.color)} ${
                  isWinning ? 'scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinning ? 'text-yellow-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded-full bg-black/40 ${
                  isWinning ? 'bg-yellow-400/40 text-yellow-200' : 'text-white/80'
                }`}>
                  {tile.multiplier}
                </div>
                {isWinning && (
                  <>
                    <div className="absolute inset-0 bg-yellow-400/20 animate-pulse rounded"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent animate-ping"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Motion Effects */}
        {isAnimating && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
          </>
        )}

        {/* Side fades */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none z-10"></div>
      </div>

      {/* Win Celebration */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-4 rounded-2xl font-bold text-2xl shadow-2xl border-4 border-yellow-300 animate-bounce">
            🎯 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎯
          </div>
        </div>
      )}
      
      {/* Status */}
      <div className="text-center mt-4">
        <p className="text-lg font-semibold">
          {isAnimating ? (
            <span className="text-cyan-400 animate-pulse">🎰 Reel is spinning...</span>
          ) : winningSlot !== null ? (
            <span className="text-emerald-400">
              🏆 Result: {REEL_SLOTS[winningSlot]?.color} {REEL_SLOTS[winningSlot]?.slot} ({REEL_SLOTS[winningSlot]?.multiplier})
            </span>
          ) : (
            <span className="text-gray-400">🎮 Ready to spin!</span>
          )}
        </p>
      </div>
    </div>
  );
};