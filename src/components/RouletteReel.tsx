import { useEffect, useState, useRef, useMemo } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
}

// Roulette wheel configuration: 15 slots total in specific order (MUST match backend exactly)
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

// Animation constants - MUST match backend exactly
const TILE_WIDTH = 120;
const BACKEND_CONTAINER_WIDTH = 1200;
const BACKEND_CENTER_OFFSET = BACKEND_CONTAINER_WIDTH / 2; // 600px

// Animation timing - YOUR EXACT SPECIFICATION
const SPEEDUP_DURATION = 0.5;   // First 0.5s: speeding up  
const FAST_DURATION = 1.0;      // Next 1.0s: rolling fast
const SLOWDOWN_DURATION = 1.5;  // Last 1.5s: slowing down to finish
const TOTAL_DURATION = SPEEDUP_DURATION + FAST_DURATION + SLOWDOWN_DURATION; // Exactly 3 seconds

// Tile generation for smooth infinite scrolling
const REPEAT_COUNT = 30; // Enough repetitions to never run out of tiles

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // Core animation state
  const [position, setPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReelReady, setIsReelReady] = useState(false);
  
  // Container measurement
  const [actualContainerWidth, setActualContainerWidth] = useState(BACKEND_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(BACKEND_CENTER_OFFSET);
  
  // Animation control
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Synchronization tracking
  const lastSyncPosition = useRef<number | null>(null);
  const isPositionSynced = useRef(false);

  console.log('🎰 RouletteReel render - isSpinning:', isSpinning, 'winningSlot:', winningSlot, 'syncPos:', synchronizedPosition);

  // STEP 1: Generate stable tiles for infinite scrolling
  const tiles = useMemo(() => {
    console.log('🔧 Generating reel tiles...');
    const generatedTiles = [];
    
    for (let repeat = 0; repeat < REPEAT_COUNT; repeat++) {
      WHEEL_SLOTS.forEach((slot, slotIndex) => {
        generatedTiles.push({
          ...slot,
          uniqueKey: `reel-${repeat}-${slotIndex}`,
          globalIndex: repeat * WHEEL_SLOTS.length + slotIndex,
          repeatNumber: repeat,
          slotIndex: slotIndex
        });
      });
    }
    
    console.log(`✅ Generated ${generatedTiles.length} tiles (${REPEAT_COUNT} repeats × ${WHEEL_SLOTS.length} slots)`);
    return generatedTiles;
  }, []); // Never re-generate - critical for stability

  // STEP 2: Measure container and mark ready
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

  // STEP 3: Synchronize position when not animating
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isAnimating &&
        synchronizedPosition !== lastSyncPosition.current) {
      
      console.log('🔄 Syncing reel position...');
      
      // Adjust backend position for actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      let syncedPosition = synchronizedPosition + centerDifference;
      
      // Keep position within reasonable bounds to prevent tile disappearing
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH;
      const maxNegativeDistance = -20 * fullRotationDistance; // Very safe buffer
      
      if (syncedPosition < maxNegativeDistance) {
        const rotationsToAdd = Math.ceil((maxNegativeDistance - syncedPosition) / fullRotationDistance);
        syncedPosition += rotationsToAdd * fullRotationDistance;
        console.log('🔄 Normalized position to prevent tile disappearing');
      }
      
      console.log('📍 Position sync:', {
        backend: synchronizedPosition,
        centerAdjustment: centerDifference,
        final: syncedPosition
      });
      
      setPosition(syncedPosition);
      lastSyncPosition.current = synchronizedPosition;
      isPositionSynced.current = true;
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset]);

  // STEP 4: MAIN ANIMATION SYSTEM - Completely rewritten from scratch
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🎰 STARTING NEW ANIMATION SYSTEM');
      console.log(`🎯 Target: Slot ${winningSlot} at backend position ${synchronizedPosition}`);
      
      setIsAnimating(true);
      
      // Calculate precise target position
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const targetPosition = synchronizedPosition + centerDifference;
      const startPosition = position;
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH;
      
      // ALWAYS MOVE LEFT - Calculate how many rotations needed
      let finalPosition = targetPosition;
      const minimumRotations = 6; // At least 6 full rotations for visual effect
      
      // Keep adding rotations until we're guaranteed to move left
      while (finalPosition >= startPosition - (minimumRotations * fullRotationDistance)) {
        finalPosition -= fullRotationDistance;
      }
      
      const totalDistance = Math.abs(finalPosition - startPosition);
      const rotationsCount = totalDistance / fullRotationDistance;
      
      console.log('🚀 Animation setup:', {
        start: startPosition,
        target: targetPosition, 
        final: finalPosition,
        distance: totalDistance,
        rotations: rotationsCount.toFixed(1),
        direction: 'LEFT (guaranteed)'
      });
      
      // Start the animation
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        
        if (elapsed >= TOTAL_DURATION) {
          // ANIMATION COMPLETE
          setPosition(finalPosition);
          setIsAnimating(false);
          
          // Verify the landing accuracy
          verifyLanding(winningSlot, finalPosition);
          
          console.log('✅ Animation complete');
          
        } else {
          // CALCULATE ANIMATION PROGRESS
          let progress = 0;
          
          if (elapsed <= SPEEDUP_DURATION) {
            // Phase 1: Speeding up (0-0.5s)
            const phaseProgress = elapsed / SPEEDUP_DURATION;
            progress = easeInQuad(phaseProgress) * 0.20; // 0% to 20% of distance
            
          } else if (elapsed <= SPEEDUP_DURATION + FAST_DURATION) {
            // Phase 2: Rolling fast (0.5s-1.5s)  
            const phaseProgress = (elapsed - SPEEDUP_DURATION) / FAST_DURATION;
            progress = 0.20 + (phaseProgress * 0.60); // 20% to 80% of distance (linear)
            
          } else {
            // Phase 3: Slowing down (1.5s-3.0s)
            const phaseProgress = (elapsed - SPEEDUP_DURATION - FAST_DURATION) / SLOWDOWN_DURATION;
            progress = 0.80 + (easeOutCubic(phaseProgress) * 0.20); // 80% to 100% of distance
          }
          
          // Apply progress to position
          const currentPosition = startPosition + (finalPosition - startPosition) * progress;
          setPosition(currentPosition);
          
          // Continue animation
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      // Cancel any existing animation and start new one
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, actualCenterOffset, position]);

  // STEP 5: Animation cleanup
  useEffect(() => {
    if (!isSpinning && isAnimating) {
      console.log('🛑 Stopping animation - round ended');
      setIsAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, isAnimating]);

  // ANIMATION HELPER FUNCTIONS
  const easeInQuad = (t: number): number => t * t;
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

  // LANDING VERIFICATION
  const verifyLanding = (targetSlot: number | null, finalPos: number) => {
    if (targetSlot === null) return;
    
    const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === targetSlot);
    if (winningSlotIndex === -1) return;
    
    // Find the closest winning tile to the center line
    let closestDistance = Infinity;
    let bestTileCenter = 0;
    
    for (let repeat = 0; repeat < REPEAT_COUNT; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + winningSlotIndex;
      const tileLeft = finalPos + tileGlobalIndex * TILE_WIDTH;
      const tileCenter = tileLeft + TILE_WIDTH / 2;
      const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        bestTileCenter = tileCenter;
      }
    }
    
    const isAccurate = closestDistance < 10; // 10px tolerance
    
    console.log('🔍 Landing verification:', {
      targetSlot,
      expectedCenter: actualCenterOffset,
      actualCenter: bestTileCenter,
      distance: closestDistance.toFixed(1) + 'px',
      accurate: isAccurate ? '✅' : '❌'
    });
    
    if (!isAccurate) {
      console.warn(`❌ Inaccurate landing! Off by ${closestDistance.toFixed(1)}px`);
    }
  };

  // TILE COLOR STYLING
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
        
        {/* Center Vertical Line - The target for winning numbers */}
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

        {/* Reel Tiles */}
        {isReelReady && (
          <div 
            className="flex h-full items-center transition-none"
            style={{
              transform: `translateX(${position}px)`,
              willChange: 'transform'
            }}
          >
            {tiles.map((tile) => {
              const tilePosition = position + tile.globalIndex * TILE_WIDTH;
              const tileCenterPosition = tilePosition + TILE_WIDTH / 2;
              const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
              
              // Visual effects
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