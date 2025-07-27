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
const BACKEND_CONTAINER_WIDTH = 1200; // Backend's container width
const BACKEND_CENTER_OFFSET = 600; // Backend's center position

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualContainerWidth, setActualContainerWidth] = useState(BACKEND_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(BACKEND_CENTER_OFFSET);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition });

  // Measure actual container size for responsive design
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || BACKEND_CONTAINER_WIDTH;
        const centerOffset = width / 2;
        
        setActualContainerWidth(width);
        setActualCenterOffset(centerOffset);
        
        console.log('📏 Container measured:', { width, centerOffset });
      }
    };

    measureContainer();
    window.addEventListener('resize', measureContainer);
    
    return () => window.removeEventListener('resize', measureContainer);
  }, []);

  // Sync position when not animating (cross-user synchronization)
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isAnimating) {
      
      console.log('🔄 Syncing to backend position:', synchronizedPosition);
      
      // Adjust backend position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const adjustedPosition = synchronizedPosition + centerDifference;
      
      console.log('📍 Position sync:', {
        backend: synchronizedPosition,
        centerDifference,
        adjusted: adjustedPosition
      });
      
      setTranslateX(adjustedPosition);
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset]);

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

  // Enhanced animation: Use provably fair position with smoother slowdown
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🚀 Starting provably fair animation to slot:', winningSlot, 'at position:', synchronizedPosition);
      
      setIsAnimating(true);
      
      // Use the EXACT position calculated by the provably fair backend
      const startPosition = translateX;
      
      // Adjust backend position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const exactTargetPosition = synchronizedPosition + centerDifference;
      
      console.log('🎯 Provably fair animation setup:', {
        winningSlot,
        startPosition,
        backendPosition: synchronizedPosition,
        centerDifference,
        exactTarget: exactTargetPosition,
        distance: Math.abs(exactTargetPosition - startPosition)
      });

      // Enhanced animation timing with smoother slowdown
      const duration = 5000; // 5 seconds for even smoother experience
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Enhanced easing function for ultra-smooth slowdown with better physics
        let easeProgress;
        if (progress < 0.15) {
          // Phase 1: Quick start (first 15% of time) - cubic ease-in
          const phaseProgress = progress / 0.15;
          easeProgress = Math.pow(phaseProgress, 3) * 0.25; // 0% to 25% distance
        } else if (progress < 0.5) {
          // Phase 2: Fast movement (15%-50% of time) - linear with slight acceleration
          const phaseProgress = (progress - 0.15) / 0.35;
          easeProgress = 0.25 + phaseProgress * 0.6; // 25% to 85% distance
        } else {
          // Phase 3: Ultra-smooth slowdown (50%-100% of time) - exponential ease-out
          const phaseProgress = (progress - 0.5) / 0.5;
          // Exponential ease-out for realistic deceleration: 1 - e^(-3t)
          const smoothEaseOut = 1 - Math.exp(-3 * phaseProgress);
          easeProgress = 0.85 + smoothEaseOut * 0.15; // 85% to 100% distance
        }
        
        const currentPosition = startPosition + (exactTargetPosition - startPosition) * easeProgress;
        setTranslateX(currentPosition);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - verify provably fair landing
          console.log('✅ Provably fair animation complete at position:', currentPosition);
          setIsAnimating(false);
          
          // Verify the provably fair result landed correctly
          verifyProvablyFairLanding(winningSlot, currentPosition);
        }
      };

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, translateX, actualCenterOffset]);

  // Verify that the provably fair result landed exactly under the center line
  const verifyProvablyFairLanding = (slot: number | null, finalPosition: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileCenter = 0;
    
    for (let repeat = 0; repeat < 20; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalPosition + (tileGlobalIndex * TILE_WIDTH);
      const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileCenter = tileCenterPosition;
      }
    }
    
    const isAccurate = closestDistance < 5; // Very strict tolerance
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      expectedSlot: slot,
      expectedCenter: actualCenterOffset,
      actualTileCenter: closestTileCenter,
      distanceOff: closestDistance.toFixed(2) + 'px',
      result: isAccurate ? '✅ PERFECT PROVABLY FAIR LANDING' : '❌ PROVABLY FAIR ERROR',
      tolerance: '5px'
    });
    
    if (!isAccurate) {
      console.error(`❌ PROVABLY FAIR SYSTEM ERROR: Slot ${slot} missed center by ${closestDistance.toFixed(2)}px!`);
    } else {
      console.log(`✅ PROVABLY FAIR SUCCESS: Slot ${slot} landed perfectly under center line!`);
    }
  };

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
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
        
        {/* Center indicator line */}
        <div className={`absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none transition-all duration-300 ${
          isAnimating ? 'w-2' : 'w-1'
        }`}>
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className={`w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent transition-colors duration-300 ${
              isAnimating ? 'border-b-yellow-400' : 'border-b-emerald-400'
            }`}></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className={`w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent transition-colors duration-300 ${
              isAnimating ? 'border-t-yellow-400' : 'border-t-emerald-400'
            }`}></div>
          </div>
          
          {/* Center line */}
          <div className={`absolute inset-0 shadow-lg transition-all duration-300 ${
            isAnimating 
              ? 'bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-300' 
              : 'bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300'
          }`}></div>
          
          {/* Glow effect */}
          <div className={`absolute inset-0 shadow-2xl blur-sm transition-all duration-300 ${
            isAnimating 
              ? 'bg-yellow-400 shadow-yellow-400/50 animate-pulse' 
              : 'bg-emerald-400 shadow-emerald-400/50'
          }`}></div>
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
            const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;
            const isSpinningTile = isAnimating && distanceFromCenter < TILE_WIDTH / 2;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-200
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${isSpinningTile ? 'scale-105 ring-2 ring-yellow-400 shadow-xl shadow-yellow-400/30 z-10 animate-pulse' : ''}
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