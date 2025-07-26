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

  // MAIN ANIMATION SYSTEM - Fixed to land at exact correct position
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null) {
      console.log('🎰 STARTING ANIMATION TO EXACT POSITION');
      console.log('Winning slot:', winningSlot);
      console.log('Backend calculated position:', synchronizedPosition);
      
      setIsAnimating(true);
      
      const startPos = reelPosition;
      
      // The backend has calculated the EXACT position where the winning slot will be centered
      // We need to adjust this position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const exactTargetPosition = synchronizedPosition + centerDifference;
      
      console.log('🎯 Position adjustment:', {
        backendPosition: synchronizedPosition,
        backendCenter: BACKEND_CENTER_OFFSET,
        actualCenter: actualCenterOffset,
        centerDifference: centerDifference,
        adjustedTarget: exactTargetPosition
      });
      
      // ALWAYS MOVE LEFT - Add full rotations until we guarantee left movement
      let finalPosition = exactTargetPosition;
      const oneFullRotation = WHEEL_SLOTS.length * TILE_WIDTH; // 1800px
      const minimumRotations = 5; // At least 5 rotations for visual effect
      
      // Keep subtracting rotations until we move left enough
      while (finalPosition >= startPos - (minimumRotations * oneFullRotation)) {
        finalPosition -= oneFullRotation;
      }
      
      const totalDistance = Math.abs(finalPosition - startPos);
      const rotationCount = totalDistance / oneFullRotation;
      
      console.log('🚀 Final animation setup:', {
        startPosition: startPos,
        exactTarget: exactTargetPosition,
        finalTarget: finalPosition,
        totalDistance: totalDistance,
        rotations: rotationCount.toFixed(1),
        direction: 'LEFT'
      });
      
      // Animation timing with proper speed control
      const TOTAL_ANIMATION_TIME = 3000; // 3 seconds total
      const SPEEDUP_PHASE = 500;         // 0.5s speed up
      const FAST_PHASE = 1000;           // 1.0s fast rolling  
      const SLOWDOWN_PHASE = 1500;       // 1.5s slow down
      
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= TOTAL_ANIMATION_TIME) {
          // Animation complete - set exact final position
          setReelPosition(finalPosition);
          setIsAnimating(false);
          
          console.log('✅ Animation complete at exact position:', finalPosition);
          
          // Verify the winning slot is under center line
          verifyWinningSlotPosition(winningSlot, finalPosition);
          
        } else {
          // Calculate progress with speed ramping
          let progress = 0;
          
          if (elapsed <= SPEEDUP_PHASE) {
            // Speed up phase: slow start, accelerating
            const phaseProgress = elapsed / SPEEDUP_PHASE;
            progress = phaseProgress * phaseProgress * 0.10; // 0% to 10% (slow start)
          } else if (elapsed <= SPEEDUP_PHASE + FAST_PHASE) {
            // Fast phase: consistent high speed
            const phaseProgress = (elapsed - SPEEDUP_PHASE) / FAST_PHASE;
            progress = 0.10 + phaseProgress * 0.75; // 10% to 85% (fast movement)
          } else {
            // Slowdown phase: smooth deceleration to exact stop
            const phaseProgress = (elapsed - SPEEDUP_PHASE - FAST_PHASE) / SLOWDOWN_PHASE;
            const easeOut = 1 - Math.pow(1 - phaseProgress, 4); // Strong ease-out for precise stop
            progress = 0.85 + easeOut * 0.15; // 85% to 100% (precise landing)
          }
          
          // Apply progress to get current position
          const currentPosition = startPos + (finalPosition - startPos) * progress;
          setReelPosition(currentPosition);
          
          // Continue animation
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      
      // Start animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
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

  // Verify winning slot lands exactly under center line
  const verifyWinningSlotPosition = (slot: number | null, finalPos: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Check where the winning slot actually ended up
    let closestDistance = Infinity;
    let closestTileCenter = 0;
    let closestRepetition = -1;
    
    for (let rep = 0; rep < 25; rep++) {
      const tileGlobalIndex = rep * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalPos + (tileGlobalIndex * TILE_WIDTH);
      const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileCenter = tileCenterPosition;
        closestRepetition = rep;
      }
    }
    
    const isAccurate = closestDistance < 5; // Very strict tolerance
    
    console.log('🎯 LANDING VERIFICATION:', {
      targetSlot: slot,
      expectedCenter: actualCenterOffset,
      actualTileCenter: closestTileCenter,
      distanceOff: closestDistance.toFixed(2) + 'px',
      repetition: closestRepetition,
      result: isAccurate ? '✅ PERFECT LANDING' : '❌ MISSED TARGET'
    });
    
    if (!isAccurate) {
      console.error(`❌ CRITICAL ERROR: Winning slot ${slot} missed center by ${closestDistance.toFixed(2)}px!`);
      console.error('This indicates a positioning calculation error that needs to be fixed.');
    } else {
      console.log(`✅ SUCCESS: Winning slot ${slot} landed perfectly under center line!`);
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