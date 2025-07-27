import { useEffect, useState, useRef, useCallback } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
}

// Roulette wheel configuration: 15 slots in order
const WHEEL_SLOTS = [
  { slot: 0, color: 'green' },
  { slot: 11, color: 'black' },
  { slot: 5, color: 'red' },
  { slot: 10, color: 'black' },
  { slot: 6, color: 'red' },
  { slot: 9, color: 'black' },
  { slot: 7, color: 'red' },
  { slot: 8, color: 'black' },
  { slot: 1, color: 'red' },
  { slot: 14, color: 'black' },
  { slot: 2, color: 'red' },
  { slot: 13, color: 'black' },
  { slot: 3, color: 'red' },
  { slot: 12, color: 'black' },
  { slot: 4, color: 'red' }
];

const TILE_WIDTH = 120; // Width of each tile in pixels
const CONTAINER_WIDTH = 1200;
const CENTER_OFFSET = CONTAINER_WIDTH / 2;
const BUFFER_MULTIPLIER = 10; // 10x buffer for seamless looping

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpinningState = useRef<boolean>(false);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition, isAnimating });

  // Simple spinning animation with infinite scrolling
  const animate = useCallback(() => {
    if (isSpinning) {
      // Move the reel to the left (simulating spinning)
      setTranslateX(prev => {
        const newPosition = prev - 15; // 15px per frame for smooth movement
        
        // Reset position when we've moved too far left to maintain infinite scrolling
        const totalTilesWidth = WHEEL_SLOTS.length * TILE_WIDTH * BUFFER_MULTIPLIER;
        if (Math.abs(newPosition) > totalTilesWidth / 2) {
          return newPosition + totalTilesWidth / 2;
        }
        
        return newPosition;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
      // Animate to the final position when we have the result
      const startPosition = translateX;
      const targetPosition = synchronizedPosition;
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      
      const animateToResult = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic for smooth deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const newPosition = startPosition + (targetPosition - startPosition) * easeOutCubic;
        
        setTranslateX(newPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateToResult);
        } else {
          setIsAnimating(false);
        }
      };
      
      animateToResult();
    }
  }, [isSpinning, synchronizedPosition, translateX]);

  // Start/stop animation based on spinning state
  useEffect(() => {
    if (isSpinning && !lastSpinningState.current) {
      console.log('🚀 Starting roulette spin');
      setIsAnimating(true);
      lastSpinningState.current = true;
      
      // Reset position to center if it's too far off
      const totalTilesWidth = WHEEL_SLOTS.length * TILE_WIDTH * BUFFER_MULTIPLIER;
      if (Math.abs(translateX) > totalTilesWidth / 4) {
        setTranslateX(0);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (!isSpinning && lastSpinningState.current) {
      console.log('🛑 Stopping roulette spin');
      lastSpinningState.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, animate, translateX]);

  // Create a repeating loop of tiles with buffer for seamless looping
  const tiles = [];
  for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Clean up animation when component unmounts
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Reset position when winning slot changes (new round)
  useEffect(() => {
    if (winningSlot !== null && !isSpinning) {
      // Reset to center position for new round
      setTranslateX(0);
    }
  }, [winningSlot, isSpinning]);

  // Get tile color styling
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white';
      case 'red':
        return 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };



  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container */}
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
        
        {/* Center indicator line */}
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
        </div>

        {/* Horizontal scrolling tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none', // No CSS transitions, we control animation with JS
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Calculate if this tile is near the center for highlighting
            const tileCenter = translateX + (tile.index * TILE_WIDTH + TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileCenter - CENTER_OFFSET);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-200
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${isNearCenter && isAnimating ? 'scale-105 z-10' : ''}
                `}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}