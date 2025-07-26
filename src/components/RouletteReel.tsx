import { useEffect, useState, useRef } from 'react';

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

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX });

  // Create a repeating loop of tiles (20 repetitions for smooth infinite scroll)
  const tiles = [];
  for (let repeat = 0; repeat < 20; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Animation: Start fast, then slow down smoothly to land on winning slot
  useEffect(() => {
    if (isSpinning && winningSlot !== null) {
      console.log('🚀 Starting reel animation for slot:', winningSlot);
      
      setIsAnimating(true);
      
      // Find the winning slot index in our WHEEL_SLOTS array
      const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningSlot);
      
      if (winningSlotIndex === -1) {
        console.error('❌ Winning slot not found:', winningSlot);
        return;
      }

      // Calculate where the winning slot should be positioned
      // We want it centered, so we need to position it at the center of our container
      const containerCenter = 600; // Assume 1200px container, center at 600px
      
      // Position the winning slot so it ends up at the center
      // We'll use a tile from the middle repetitions to avoid edge cases
      const targetRepetition = 10; // Use 10th repetition
      const targetTileIndex = targetRepetition * WHEEL_SLOTS.length + winningSlotIndex;
      const targetPosition = containerCenter - (targetTileIndex * TILE_WIDTH + TILE_WIDTH / 2);
      
      // Add multiple full rotations for visual effect (always move left)
      const fullRotation = WHEEL_SLOTS.length * TILE_WIDTH; // 15 * 120 = 1800px
      const extraRotations = 5; // 5 extra full rotations
      const finalPosition = targetPosition - (extraRotations * fullRotation);
      
      console.log('🎯 Animation target:', {
        winningSlot,
        winningSlotIndex,
        targetTileIndex,
        containerCenter,
        targetPosition,
        finalPosition,
        extraRotations
      });

      // Animate from current position to final position
      const startPosition = translateX;
      const totalDistance = Math.abs(finalPosition - startPosition);
      const duration = 3000; // 3 seconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function: start fast, then slow down smoothly
        // Using cubic ease-out for realistic deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const currentPosition = startPosition + (finalPosition - startPosition) * easeOut;
        setTranslateX(currentPosition);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete
          console.log('✅ Animation complete at position:', currentPosition);
          setIsAnimating(false);
          
          // Verify landing accuracy
          const actualTileCenter = currentPosition + (targetTileIndex * TILE_WIDTH + TILE_WIDTH / 2);
          const distanceFromCenter = Math.abs(actualTileCenter - containerCenter);
          console.log('🎯 Landing verification:', {
            expectedCenter: containerCenter,
            actualCenter: actualTileCenter,
            distanceOff: distanceFromCenter,
            accurate: distanceFromCenter < 10
          });
        }
      };

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, winningSlot, translateX]);

  // Clean up animation when round ends
  useEffect(() => {
    if (!isSpinning && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
    }
  }, [isSpinning]);

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
      <div className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
        
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
            const containerCenter = 600; // Half of 1200px container
            const distanceFromCenter = Math.abs(tileCenter - containerCenter);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-150
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