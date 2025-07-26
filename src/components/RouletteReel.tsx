import { useEffect, useState, useRef, useMemo } from 'react';

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

// Core constants - MUST match backend exactly
const TILE_WIDTH = 120;
const BACKEND_CONTAINER_WIDTH = 1200;
const BACKEND_CENTER_OFFSET = BACKEND_CONTAINER_WIDTH / 2; // 600px

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State
  const [reelPosition, setReelPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReelReady, setIsReelReady] = useState(false);
  const [actualContainerWidth, setActualContainerWidth] = useState(BACKEND_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(BACKEND_CENTER_OFFSET);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSyncPosition = useRef<number | null>(null);

  console.log('🎰 RouletteReel render:', { isSpinning, winningSlot, synchronizedPosition, reelPosition });

  // Generate tiles once - never change
  const tiles = useMemo(() => {
    const allTiles = [];
    const repetitions = 25;
    
    for (let rep = 0; rep < repetitions; rep++) {
      for (let i = 0; i < WHEEL_SLOTS.length; i++) {
        allTiles.push({
          ...WHEEL_SLOTS[i],
          uniqueKey: `tile-${rep}-${i}`,
          globalIndex: rep * WHEEL_SLOTS.length + i
        });
      }
    }
    
    console.log(`✅ Generated ${allTiles.length} tiles`);
    return allTiles;
  }, []);

  // Container setup and measurement
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || BACKEND_CONTAINER_WIDTH;
        const centerOffset = width / 2;
        
        setActualContainerWidth(width);
        setActualCenterOffset(centerOffset);
        
        if (!isReelReady) {
          setIsReelReady(true);
          console.log(`📏 Container ready: ${width}px wide, center at ${centerOffset}px`);
        }
      }
    };

    measureContainer();
    window.addEventListener('resize', measureContainer);
    return () => window.removeEventListener('resize', measureContainer);
  }, [isReelReady]);

  // Position sync (when not animating) - CRITICAL for cross-user sync
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isAnimating &&
        synchronizedPosition !== lastSyncPosition.current) {
      
      console.log('🔄 Syncing position across users:', synchronizedPosition);
      
      // Adjust backend position for actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      let adjustedPosition = synchronizedPosition + centerDifference;
      
      // Normalize position to prevent tiles disappearing
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH; // 1800px
      const maxNegativeDistance = -20 * fullRotationDistance; // Very safe buffer
      
      if (adjustedPosition < maxNegativeDistance) {
        const rotationsToAdd = Math.ceil((maxNegativeDistance - adjustedPosition) / fullRotationDistance);
        adjustedPosition += rotationsToAdd * fullRotationDistance;
        console.log('🔄 Normalized position to prevent tile disappearing');
      }
      
      console.log('📍 Position sync result:', {
        backend: synchronizedPosition,
        centerAdjustment: centerDifference,
        final: adjustedPosition
      });
      
      setReelPosition(adjustedPosition);
      lastSyncPosition.current = synchronizedPosition;
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset]);

  // MAIN ANIMATION SYSTEM - Fixed pattern every round
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null) {
      console.log('🚀 STARTING CONSISTENT ANIMATION PATTERN');
      console.log('Target slot:', winningSlot);
      console.log('Target position:', synchronizedPosition);
      
      setIsAnimating(true);
      
      const startPos = reelPosition;
      
      // Calculate precise target position with center adjustment
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const targetPos = synchronizedPosition + centerDifference;
      
      // ALWAYS MOVE LEFT - ensure consistent pattern
      let finalPos = targetPos;
      const oneFullRotation = WHEEL_SLOTS.length * TILE_WIDTH; // 1800px
      const minimumRotations = 6; // At least 6 rotations for visual effect
      
      // Keep adding rotations until we're guaranteed to move left
      while (finalPos >= startPos - (minimumRotations * oneFullRotation)) {
        finalPos -= oneFullRotation;
      }
      
      const totalDistance = Math.abs(finalPos - startPos);
      
      console.log('🎯 Animation pattern setup:', {
        start: startPos,
        target: targetPos,
        final: finalPos,
        distance: totalDistance,
        rotations: (totalDistance / oneFullRotation).toFixed(1),
        direction: 'LEFT (guaranteed)'
      });
      
      // Animation timing - EXACT PATTERN every round
      const SPEED_UP_TIME = 500;    // 0.5s
      const FAST_TIME = 1000;       // 1.0s  
      const SLOW_DOWN_TIME = 1500;  // 1.5s
      const TOTAL_TIME = SPEED_UP_TIME + FAST_TIME + SLOW_DOWN_TIME; // 3.0s
      
      const startTime = Date.now();
      
      const runAnimation = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= TOTAL_TIME) {
          // Animation finished - land exactly on target
          setReelPosition(finalPos);
          setIsAnimating(false);
          console.log('✅ Animation complete - landed at:', finalPos);
          
          // Verify winning slot is under center line
          verifyWinningSlotLanding(winningSlot, finalPos);
          
        } else {
          // Calculate progress through phases - CONSISTENT PATTERN
          let progress = 0;
          
          if (elapsed <= SPEED_UP_TIME) {
            // Phase 1: Speeding up (0-0.5s) - Smooth acceleration
            const t = elapsed / SPEED_UP_TIME;
            progress = t * t * 0.15; // 0% to 15% distance (quadratic ease-in)
          } else if (elapsed <= SPEED_UP_TIME + FAST_TIME) {
            // Phase 2: Fast rolling (0.5s-1.5s) - Consistent speed
            const t = (elapsed - SPEED_UP_TIME) / FAST_TIME;
            progress = 0.15 + (t * 0.70); // 15% to 85% distance (linear)
          } else {
            // Phase 3: Slowing down (1.5s-3.0s) - Smooth deceleration 
            const t = (elapsed - SPEED_UP_TIME - FAST_TIME) / SLOW_DOWN_TIME;
            const easeOut = 1 - Math.pow(1 - t, 3); // Cubic ease-out
            progress = 0.85 + (easeOut * 0.15); // 85% to 100% distance
          }
          
          const currentPos = startPos + (finalPos - startPos) * progress;
          setReelPosition(currentPos);
          
          animationFrameRef.current = requestAnimationFrame(runAnimation);
        }
      };
      
      // Start animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(runAnimation);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, reelPosition, actualCenterOffset]);

  // Stop animation when round ends
  useEffect(() => {
    if (!isSpinning && isAnimating) {
      console.log('🛑 Round ended - stopping animation');
      setIsAnimating(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isSpinning, isAnimating]);

  // Verify winning slot lands under center line
  const verifyWinningSlotLanding = (slot: number | null, position: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Find closest instance of winning slot to center
    let bestDistance = Infinity;
    let bestCenter = 0;
    
    for (let rep = 0; rep < 25; rep++) {
      const tileIndex = rep * WHEEL_SLOTS.length + slotIndex;
      const tileLeft = position + (tileIndex * TILE_WIDTH);
      const tileCenter = tileLeft + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
      
      if (distanceFromCenter < bestDistance) {
        bestDistance = distanceFromCenter;
        bestCenter = tileCenter;
      }
    }
    
    const isAccurate = bestDistance < 10; // Strict tolerance
    
    console.log('🎯 Landing verification:', {
      slot,
      expectedCenter: actualCenterOffset,
      actualCenter: bestCenter,
      distance: bestDistance.toFixed(1) + 'px',
      accurate: isAccurate ? '✅ PERFECT' : '❌ INACCURATE'
    });
    
    if (!isAccurate) {
      console.warn(`❌ Landing inaccurate! Slot ${slot} is ${bestDistance.toFixed(1)}px off center`);
    }
  };

  // Tile color styling - EXACT match to original
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
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl">
        
        {/* Loading State */}
        {!isReelReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 z-40">
            <div className="flex items-center gap-3 text-white">
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
              <span className="text-sm font-medium">Loading reel...</span>
            </div>
          </div>
        )}
        
        {/* Center Vertical Line - Target for winning numbers */}
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

        {/* Reel tiles - EXACT original appearance */}
        {isReelReady && (
          <div 
            className="flex h-full items-center transition-none"
            style={{
              transform: `translateX(${reelPosition}px)`,
              willChange: 'transform'
            }}
          >
            {tiles.map((tile) => {
              const tilePosition = reelPosition + tile.globalIndex * TILE_WIDTH;
              const tileCenterPosition = tilePosition + TILE_WIDTH / 2;
              const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
              
              // Visual effects - EXACT original behavior
              const isCenterTile = isAnimating && distanceFromCenter < TILE_WIDTH / 2;
              const isWinningTile = (showWinAnimation || extendedWinAnimation) && 
                                    tile.slot === winningSlot && 
                                    !isAnimating &&
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}