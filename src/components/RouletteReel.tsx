import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
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
const CONTAINER_WIDTH = 1200; // Increased from 800 for more visibility
const CENTER_OFFSET = CONTAINER_WIDTH / 2;

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
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
    if (isSpinning && winningSlot !== null && winningSlot !== undefined && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🎰 Starting synchronized animation to:', winningSlot, 'at position:', synchronizedPosition);
      setIsAnimating(true);
      
      const startPosition = position;
      let finalPosition = synchronizedPosition;
      
      // FORCE CONSISTENT LEFT MOVEMENT: Ensure final position is always left of start
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH; // 15 * 120 = 1800px
      while (finalPosition >= startPosition) {
        finalPosition -= fullRotationDistance;
      }
      
      // Calculate total distance (should always be negative for left movement)
      const totalDistance = Math.abs(finalPosition - startPosition);
      
      console.log('🎯 Consistent animation setup:', {
        startPosition,
        originalFinal: synchronizedPosition,
        adjustedFinal: finalPosition,
        totalDistance,
        direction: 'LEFT (guaranteed)',
        winningSlot
      });

      // Animation phases with specific durations
      const SPEEDUP_DURATION = 500;    // 0.5 seconds speed up
      const FAST_DURATION = 1000;      // 1 second fast rolling  
      const SLOWDOWN_DURATION = 2000;  // 2 seconds slowing down
      const TOTAL_DURATION = SPEEDUP_DURATION + FAST_DURATION + SLOWDOWN_DURATION; // 3.5 seconds total

      // Reset start time for new animation
      startTimeRef.current = undefined;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = currentTime;
        }
        
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / TOTAL_DURATION, 1);
        
        let easeProgress = 0;
        
        if (elapsed <= SPEEDUP_DURATION) {
          // Phase 1: Speed up (0-0.5s) - Ease in
          const phaseProgress = elapsed / SPEEDUP_DURATION;
          easeProgress = phaseProgress * phaseProgress; // Quadratic ease in
        } else if (elapsed <= SPEEDUP_DURATION + FAST_DURATION) {
          // Phase 2: Fast rolling (0.5-1.5s) - Linear
          const phaseProgress = (elapsed - SPEEDUP_DURATION) / FAST_DURATION;
          easeProgress = 0.25 + phaseProgress * 0.5; // 25% to 75% of total distance
        } else {
          // Phase 3: Slow down (1.5-3.5s) - Ease out
          const phaseProgress = (elapsed - SPEEDUP_DURATION - FAST_DURATION) / SLOWDOWN_DURATION;
          const easeOut = 1 - Math.pow(1 - phaseProgress, 3); // Cubic ease out
          easeProgress = 0.75 + easeOut * 0.25; // 75% to 100% of total distance
        }
        
        // Calculate current position (always moving left)
        const currentPosition = startPosition + (finalPosition - startPosition) * easeProgress;
        setPosition(currentPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation completed - land exactly on synchronized target
          console.log('🎰 Consistent animation completed. Final position:', currentPosition);
          console.log('🎯 Target synchronized position was:', finalPosition);
          console.log('🎯 Winning slot should be:', winningSlot, 'under center line');
          
          // Verify positioning accuracy
          if (winningSlot !== null) {
            const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningSlot);
            if (winningSlotIndex !== -1) {
              // Find the closest instance of the winning slot to the center
              let closestDistance = Infinity;
              let closestTilePosition = null;
              
              for (let repeat = 0; repeat < 20; repeat++) {
                const globalIndex = repeat * WHEEL_SLOTS.length + winningSlotIndex;
                const tilePosition = finalPosition + globalIndex * TILE_WIDTH;
                const tileCenterPosition = tilePosition + TILE_WIDTH / 2;
                const distanceFromCenter = Math.abs(tileCenterPosition - CENTER_OFFSET);
                
                if (distanceFromCenter < closestDistance) {
                  closestDistance = distanceFromCenter;
                  closestTilePosition = tileCenterPosition;
                }
              }
              
              console.log('🔍 Animation accuracy verification:', {
                winningSlot,
                centerLine: CENTER_OFFSET,
                closestWinningSlotCenter: closestTilePosition,
                distanceFromCenter: closestDistance,
                isAccurate: closestDistance < 5 // Within 5px tolerance
              });
            }
          }
          
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
      
      // Safeguard: if position is extremely negative, normalize it
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH;
      let normalizedPosition = synchronizedPosition;
      
      // Keep position within reasonable bounds (same as backend logic)
      const maxNegativeRotations = -10 * fullRotationDistance;
      if (normalizedPosition < maxNegativeRotations) {
        const excessRotations = Math.floor((maxNegativeRotations - normalizedPosition) / fullRotationDistance);
        normalizedPosition += excessRotations * fullRotationDistance;
        console.log('🔄 Frontend normalized position:', { original: synchronizedPosition, normalized: normalizedPosition });
      }
      
      setPosition(normalizedPosition);
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
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel Container */}
      <div className="relative h-36 rounded-xl overflow-hidden shadow-2xl">
        
        {/* Center Indicator Line */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400"></div>
          </div>
          
          {/* Center line */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-emerald-400 shadow-emerald-400/50 shadow-2xl blur-sm animate-pulse"></div>
          
          {/* Side glow */}
          <div className="absolute inset-y-0 -left-2 -right-2 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent blur-md"></div>
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
            const distanceFromCenter = Math.abs(tileCenterPosition - CENTER_OFFSET);
            
            // Check if tile is at center during spinning for scaling animation
            const isCenterTile = isAnimating && distanceFromCenter < TILE_WIDTH / 2;
            
            const isWinningTile = (showWinAnimation || extendedWinAnimation) && 
                                  tile.slot === winningSlot && 
                                  !isAnimating &&
                                  // Only highlight the tile that's actually at the center line
                                  distanceFromCenter < TILE_WIDTH / 3;
            
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-28 flex flex-col items-center justify-center relative transition-all duration-150 ${getTileColorClass(tile.color)} ${
                  isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : 
                  isCenterTile ? 'scale-105 z-10' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                

                
                {/* Win animation effects */}
                {isWinningTile && (
                  <>
                    <div className="absolute inset-0 bg-emerald-400/20 animate-pulse rounded"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-ping"></div>
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