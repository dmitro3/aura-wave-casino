import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
}

// Roulette wheel configuration: 15 slots total in specific order
const WHEEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: '14x' },
  { slot: 11, color: 'black', multiplier: '2x' },
  { slot: 5, color: 'red', multiplier: '2x' },
  { slot: 10, color: 'black', multiplier: '2x' },
  { slot: 6, color: 'red', multiplier: '2x' },
  { slot: 9, color: 'black', multiplier: '2x' },
  { slot: 7, color: 'red', multiplier: '2x' },
  { slot: 8, color: 'black', multiplier: '2x' },
  { slot: 1, color: 'red', multiplier: '2x' },
  { slot: 14, color: 'black', multiplier: '2x' },
  { slot: 2, color: 'red', multiplier: '2x' },
  { slot: 13, color: 'black', multiplier: '2x' },
  { slot: 3, color: 'red', multiplier: '2x' },
  { slot: 12, color: 'black', multiplier: '2x' },
  { slot: 4, color: 'red', multiplier: '2x' }
];

const TILE_WIDTH = 120;
const CONTAINER_WIDTH = 600;
const CENTER_OFFSET = CONTAINER_WIDTH / 2;

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition }: RouletteReelProps) {
  const [position, setPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Generate tiles for seamless scrolling (repeat pattern multiple times)
  const tiles = [];
  const repeatCount = 20; // Enough repeats for smooth infinite scrolling
  
  for (let repeat = 0; repeat < repeatCount; repeat++) {
    WHEEL_SLOTS.forEach((slot, index) => {
      tiles.push({
        ...slot,
        uniqueKey: `${repeat}-${index}`,
        globalIndex: repeat * WHEEL_SLOTS.length + index
      });
    });
  }

    // Synchronized animation using backend-calculated position
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🎰 Starting synchronized animation to:', winningSlot, 'at position:', synchronizedPosition);
      setIsAnimating(true);
      
      const animationDuration = 4000; // 4 seconds total animation
      const startPosition = position;
      const finalPosition = synchronizedPosition;
      
      console.log('🎯 Synchronized animation params:', {
        startPosition,
        finalPosition,
        winningSlot,
        difference: finalPosition - startPosition
      });

      // Reset start time for new animation
      startTimeRef.current = undefined;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = currentTime;
        }
        
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Realistic easing: start fast, then slow down smoothly
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Calculate current position from start to final
        const currentPosition = startPosition + (finalPosition - startPosition) * easeProgress;
        setPosition(currentPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation completed - land exactly on synchronized target
          console.log('🎰 Synchronized animation completed. Final position:', currentPosition);
          console.log('🎯 Target synchronized position was:', finalPosition);
          setPosition(finalPosition); // Ensure exact landing
          setIsAnimating(false);
          startTimeRef.current = undefined;
        }
      };
      
      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, winningSlot, synchronizedPosition]);

  // Initialize position from synchronized position on first load
  useEffect(() => {
    if (synchronizedPosition !== null && synchronizedPosition !== undefined && !isAnimating) {
      console.log('🔄 Initializing position from synchronized state:', synchronizedPosition);
      setPosition(synchronizedPosition);
    }
  }, [synchronizedPosition, isAnimating]);

  // Keep position between rounds - no reset
  useEffect(() => {
    // Just ensure we're not animating when round ends
    if (!isSpinning && !showWinAnimation && isAnimating) {
      console.log('🎰 Round ended, stopping any remaining animation');
      setIsAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, showWinAnimation, isAnimating]);

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

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Reel Container */}
      <div className="relative h-32 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-4 border-yellow-500 overflow-hidden shadow-2xl">
        
        {/* Center Indicator Line */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-yellow-500"></div>
          </div>
          
          {/* Center line */}
          <div className="absolute inset-0 bg-yellow-500 shadow-lg"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-yellow-500 shadow-yellow-500/50 shadow-2xl blur-sm"></div>
        </div>

        {/* Moving Tiles */}
        <div 
          id="roulette-reel"
          className="flex h-full items-center transition-none"
          style={{
            transform: `translateX(${position}px)`,
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Check if this tile is the winning one and should be highlighted
            const tilePosition = position + tile.globalIndex * TILE_WIDTH;
            const tileCenterPosition = tilePosition + TILE_WIDTH / 2;
            const isWinningTile = showWinAnimation && 
                                  tile.slot === winningSlot && 
                                  !isAnimating &&
                                  // Only highlight the tile that's actually at the center line
                                  Math.abs(tileCenterPosition - CENTER_OFFSET) < TILE_WIDTH / 3;
            
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-24 flex flex-col items-center justify-center border-r-2 border-gray-600 relative transition-all duration-300 ${getTileColorClass(tile.color)} ${
                  isWinningTile ? 'scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinningTile ? 'text-yellow-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                <div className={`text-xs font-medium px-2 py-1 rounded-full bg-black/40 ${
                  isWinningTile ? 'bg-yellow-400/40 text-yellow-200' : 'text-white/80'
                }`}>
                  {tile.multiplier}
                </div>
                
                {/* Win animation effects */}
                {isWinningTile && (
                  <>
                    <div className="absolute inset-0 bg-yellow-400/20 animate-pulse rounded"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent animate-ping"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Side fade effects */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none z-10"></div>
        
        {/* Motion blur overlay during spinning */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none z-5">
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        )}
      </div>


      

    </div>
  );
}