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

const TILE_WIDTH = 120;
// Remove hardcoded dimensions - will be calculated dynamically
const DEFAULT_CONTAINER_WIDTH = 1200; // Fallback for SSR/initial render

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [position, setPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [actualContainerWidth, setActualContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(DEFAULT_CONTAINER_WIDTH / 2);
  const [isReelReady, setIsReelReady] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSynchronizedPosition = useRef<number | null>(null);
  const positionInitialized = useRef(false);

  // Constants for tile generation
  const REPEAT_COUNT = 20; // Enough repeats for smooth infinite scrolling

  // MEMOIZED: Generate tiles once and reuse to prevent loading issues
  const tiles = useMemo(() => {
    const generatedTiles = [];
    
    for (let repeat = 0; repeat < REPEAT_COUNT; repeat++) {
      WHEEL_SLOTS.forEach((slot, index) => {
        generatedTiles.push({
          ...slot,
          uniqueKey: `${repeat}-${index}`,
          globalIndex: repeat * WHEEL_SLOTS.length + index
        });
      });
    }
    
    return generatedTiles;
  }, []); // Empty dependency array - generate once and never change

  // Measure actual container dimensions
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const centerOffset = width / 2;
        
        console.log('📏 Container dimensions:', { 
          width, 
          centerOffset, 
          isDefault: width === DEFAULT_CONTAINER_WIDTH 
        });
        
        setActualContainerWidth(width);
        setActualCenterOffset(centerOffset);
        
        // Mark reel as ready once container is measured and tiles are generated
        if (!isReelReady && tiles.length > 0) {
          setIsReelReady(true);
          console.log('✅ Reel ready with', tiles.length, 'tiles');
        }
      }
    };

    // Measure on mount and window resize
    measureContainer();
    window.addEventListener('resize', measureContainer);
    
    return () => window.removeEventListener('resize', measureContainer);
  }, [tiles.length, isReelReady]);

  // Animation phases for structured timing
  const SPEEDUP_DURATION = 0.5; // seconds
  const FAST_DURATION = 1.0; // seconds 
  const SLOWDOWN_DURATION = 2.0; // seconds
  const TOTAL_DURATION = SPEEDUP_DURATION + FAST_DURATION + SLOWDOWN_DURATION; // 3.5 seconds

  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🎰 Starting synchronized animation to:', winningSlot, 'at position:', synchronizedPosition);
      
      setIsAnimating(true);
      
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH;
      
      // Calculate the offset between backend's expected center and actual center
      const backendCenterOffset = DEFAULT_CONTAINER_WIDTH / 2; // 600px
      const actualCenter = actualCenterOffset;
      const centerOffsetDifference = actualCenter - backendCenterOffset;
      
      console.log('🎯 Center offset calculation:', {
        backendExpectedCenter: backendCenterOffset,
        actualCenter: actualCenter,
        centerOffsetDifference,
        containerWidth: actualContainerWidth,
        winningSlot
      });
      
      const startPosition = position;
      // Adjust the backend position by the center offset difference
      let finalPosition = synchronizedPosition + centerOffsetDifference;
      
      // CONSISTENT ANIMATION: Ensure we always move left with enough rotations for visual effect
      const minRotations = 5; // Minimum 5 full rotations for visual appeal
      const maxRotations = 8; // Maximum 8 full rotations to avoid excessive animation
      
      // Calculate target rotations based on current position
      let rotationsNeeded = minRotations;
      while (finalPosition + (rotationsNeeded * fullRotationDistance) >= startPosition) {
        rotationsNeeded++;
        if (rotationsNeeded > maxRotations) break;
      }
      
      // Apply the rotations - always move left
      finalPosition -= (rotationsNeeded * fullRotationDistance);
      
      console.log('🎯 Consistent animation setup:', {
        originalBackendPosition: synchronizedPosition,
        centerOffsetDifference,
        startPosition,
        rotationsApplied: rotationsNeeded,
        finalPosition,
        totalDistance: Math.abs(finalPosition - startPosition),
        direction: 'LEFT (guaranteed)'
      });

      const startTime = performance.now();
      startTimeRef.current = startTime;

      const animate = (currentTime: number) => {
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        
        if (elapsed >= TOTAL_DURATION) {
          // Animation complete - verify accuracy
          if (winningSlot !== null) {
            const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningSlot);
            if (winningSlotIndex !== -1) {
              let closestDistance = Infinity;
              let closestTilePosition = 0;
              
              for (let repeat = 0; repeat < REPEAT_COUNT; repeat++) {
                const tileGlobalIndex = repeat * WHEEL_SLOTS.length + winningSlotIndex;
                const tilePosition = finalPosition + tileGlobalIndex * TILE_WIDTH;
                const tileCenterPosition = tilePosition + TILE_WIDTH / 2;
                const distanceFromCenter = Math.abs(tileCenterPosition - actualCenter);
                
                if (distanceFromCenter < closestDistance) {
                  closestDistance = distanceFromCenter;
                  closestTilePosition = tileCenterPosition;
                }
              }
              
              console.log('🔍 Animation accuracy verification:', {
                winningSlot,
                actualCenterLine: actualCenter,
                backendExpectedCenter: backendCenterOffset,
                closestWinningSlotCenter: closestTilePosition,
                distanceFromCenter: closestDistance,
                isAccurate: closestDistance < 5 // Back to strict tolerance
              });
            }
          }
          
          setPosition(finalPosition); // Ensure exact landing
          setIsAnimating(false);
          startTimeRef.current = undefined;
        } else {
          // Calculate progress through different phases - CONSISTENT ANIMATION
          let progress = 0;
          
          if (elapsed <= SPEEDUP_DURATION) {
            // Phase 1: Speed up (0.5s) - Smooth acceleration from 0
            const phaseProgress = elapsed / SPEEDUP_DURATION;
            // Quadratic ease-in: slow start, accelerating
            progress = phaseProgress * phaseProgress * 0.15; // 0-15% completion
          } else if (elapsed <= SPEEDUP_DURATION + FAST_DURATION) {
            // Phase 2: Fast rolling (1.0s) - Consistent fast speed
            const phaseProgress = (elapsed - SPEEDUP_DURATION) / FAST_DURATION;
            // Linear progression for consistent visual speed
            progress = 0.15 + phaseProgress * 0.65; // 15-80% completion
          } else {
            // Phase 3: Slow down (2.0s) - Smooth deceleration to exact landing
            const phaseProgress = (elapsed - SPEEDUP_DURATION - FAST_DURATION) / SLOWDOWN_DURATION;
            // Cubic ease-out: fast to slow, precise landing
            const easeOut = 1 - Math.pow(1 - phaseProgress, 3);
            progress = 0.80 + easeOut * 0.20; // 80-100% completion
          }
          
          // Ensure smooth, consistent movement
          const currentPosition = startPosition + (finalPosition - startPosition) * progress;
          setPosition(currentPosition);
          
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, actualCenterOffset]);

  // Initialize position from synchronized position on first load
  useEffect(() => {
    // Only update if we have a new synchronized position and we're not currently animating
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isAnimating &&
        (synchronizedPosition !== lastSynchronizedPosition.current || !positionInitialized.current)) {
      
      console.log('🔄 Initializing position from synchronized state:', synchronizedPosition);
      
      // Calculate the offset between backend's expected center and actual center
      const backendCenterOffset = DEFAULT_CONTAINER_WIDTH / 2; // 600px
      const actualCenter = actualCenterOffset;
      const centerOffsetDifference = actualCenter - backendCenterOffset;
      
      // Adjust the backend position by the center offset difference
      let normalizedPosition = synchronizedPosition + centerOffsetDifference;
      
      console.log('🔄 Position adjustment on init:', {
        originalPosition: synchronizedPosition,
        centerOffsetDifference,
        adjustedPosition: normalizedPosition,
        actualCenter,
        backendExpectedCenter: backendCenterOffset,
        isFirstInit: !positionInitialized.current
      });
      
      // Safeguard: if position is extremely negative, normalize it
      const fullRotationDistance = WHEEL_SLOTS.length * TILE_WIDTH;
      
      // Keep position within reasonable bounds (same as backend logic)
      const maxNegativeRotations = -10 * fullRotationDistance;
      if (normalizedPosition < maxNegativeRotations) {
        const excessRotations = Math.floor((maxNegativeRotations - normalizedPosition) / fullRotationDistance);
        normalizedPosition += excessRotations * fullRotationDistance;
        console.log('🔄 Frontend normalized position:', { beforeNormalization: normalizedPosition - excessRotations * fullRotationDistance, normalized: normalizedPosition });
      }
      
      setPosition(normalizedPosition);
      lastSynchronizedPosition.current = synchronizedPosition;
      positionInitialized.current = true;
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset]);

  // Keep position between rounds - no reset
  useEffect(() => {
    // Clean up animation state when round ends, but don't move the reel
    if (!isSpinning && !showWinAnimation && isAnimating) {
      console.log('🎰 Round ended, stopping any remaining animation');
      setIsAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      startTimeRef.current = undefined;
    }
    
    // Reset position tracking when a new round starts
    if (isSpinning && !isAnimating) {
      console.log('🎰 New round starting, preparing for animation');
      // Don't reset position - keep current position for smooth continuation
    }
  }, [isSpinning, showWinAnimation, isAnimating]);

  const getTileColorClass = (color: string) => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-lg';
      case 'red': 
        return 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white shadow-lg';
      case 'black': 
        return 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600 text-white shadow-lg';
      default: 
        return 'bg-gray-500 text-white';
    }
  };

  // Show loading state until reel is ready
  if (!isReelReady) {
    return (
      <div className="relative w-full max-w-7xl mx-auto">
        <div className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
          <div className="absolute inset-0 flex items-center justify-center z-40">
            <div className="flex items-center gap-3 text-white">
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"></div>
              <span className="text-sm font-medium">Loading reel...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl">
        
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

        {/* Reel tiles */}
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
      </div>
    </div>
  );
}