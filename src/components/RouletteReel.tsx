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

  // Calculate the target position for the winning slot to be centered
  const calculateTargetPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }
    
    // Find the center instance of the winning slot in the buffer
    const centerRepeat = Math.floor(BUFFER_MULTIPLIER / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    const targetTileCenter = targetTileIndex * TILE_WIDTH + TILE_WIDTH / 2;
    
    // Calculate position so that the tile center aligns with the container center
    const targetPosition = CENTER_OFFSET - targetTileCenter;
    
    console.log('🎯 Target position calculation for winning slot:', {
      winningSlot: slot,
      slotIndex,
      centerRepeat,
      targetTileIndex,
      targetTileCenter,
      centerOffset: CENTER_OFFSET,
      targetPosition,
      verification: `Slot ${slot} should be at position ${targetPosition} to be centered`
    });
    
    // Verify the calculation is correct
    const verificationPosition = targetPosition + targetTileCenter;
    console.log('🔍 Verification check:', {
      calculatedPosition: targetPosition,
      tileCenter: targetTileCenter,
      verification: verificationPosition,
      shouldEqualCenter: verificationPosition === CENTER_OFFSET
    });
    
    return targetPosition;
  }, []);

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
    } else if (winningSlot !== null) {
      // PRIORITY: Ensure the winning slot lands under the center line
      console.log('🎯 PROVABLY FAIR RESULT RECEIVED - Winning slot:', winningSlot);
      
      const startPosition = translateX;
      
      // Calculate the EXACT target position for the winning slot to be centered
      const targetPosition = calculateTargetPosition(winningSlot);
      
      console.log('🎲 Starting precise deceleration animation:', {
        winningSlot,
        startPosition,
        targetPosition,
        distance: Math.abs(targetPosition - startPosition),
        goal: `Move reel to position ${targetPosition} so slot ${winningSlot} is centered`
      });
      
      // Debug current position before animation
      debugCurrentPosition();
      
      const duration = 2500; // 2.5 seconds for smooth deceleration
      const startTime = Date.now();
      
      const animateToResult = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth deceleration with emphasis on final precision
        let easeProgress;
        if (progress < 0.4) {
          // First 40%: Still moving at good speed
          const phaseProgress = progress / 0.4;
          easeProgress = phaseProgress * 0.6; // 0% to 60% distance
        } else if (progress < 0.8) {
          // 40%-80%: Slowing down significantly
          const phaseProgress = (progress - 0.4) / 0.4;
          easeProgress = 0.6 + phaseProgress * 0.3; // 60% to 90% distance
        } else {
          // Last 20%: Very slow final approach for precision
          const phaseProgress = (progress - 0.8) / 0.2;
          const smoothEaseOut = 1 - Math.pow(1 - phaseProgress, 5); // Quintic ease-out for precision
          easeProgress = 0.9 + smoothEaseOut * 0.1; // 90% to 100% distance
        }
        
        const newPosition = startPosition + (targetPosition - startPosition) * easeProgress;
        setTranslateX(newPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateToResult);
        } else {
          setIsAnimating(false);
          
          // Verify the result landed correctly
          console.log('✅ Animation complete - Winning slot:', winningSlot, 'at final position:', newPosition);
          verifyWinningTilePosition(newPosition);
          debugCurrentPosition();
        }
      };
      
      animateToResult();
    }
  }, [isSpinning, winningSlot, synchronizedPosition, translateX, calculateTargetPosition]);

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

  // Verify that the winning tile is centered when animation stops
  const verifyWinningTilePosition = useCallback((finalPosition: number) => {
    if (winningSlot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
    if (slotIndex === -1) {
      console.error('❌ Invalid winning slot for verification:', winningSlot);
      return;
    }
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileCenter = 0;
    let closestRepeat = 0;
    let closestTileIndex = 0;
    
    for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalPosition + (tileGlobalIndex * TILE_WIDTH);
      const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenterPosition - CENTER_OFFSET);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileCenter = tileCenterPosition;
        closestRepeat = repeat;
        closestTileIndex = tileGlobalIndex;
      }
    }
    
    const isAccurate = closestDistance < 3; // 3px tolerance for precision
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      winningSlot,
      expectedCenter: CENTER_OFFSET,
      actualTileCenter: closestTileCenter,
      distanceOff: closestDistance.toFixed(2) + 'px',
      closestRepeat,
      closestTileIndex,
      finalPosition,
      result: isAccurate ? '✅ PERFECT LANDING' : '❌ POSITION ERROR',
      tolerance: '3px'
    });
    
    if (!isAccurate) {
      console.warn(`⚠️ Position adjustment needed: Slot ${winningSlot} is ${closestDistance.toFixed(2)}px off center`);
      
      // Auto-correct if off by more than 5px
      if (closestDistance > 5) {
        const correction = CENTER_OFFSET - closestTileCenter;
        console.log(`🔧 Auto-correcting position by ${correction.toFixed(2)}px`);
        setTranslateX(prev => prev + correction);
        
        // Verify the correction worked
        setTimeout(() => {
          const correctedPosition = finalPosition + correction;
          console.log(`🔍 Verification after correction: Position ${correctedPosition.toFixed(2)}`);
        }, 100);
      }
    } else {
      console.log(`🎉 Perfect! Slot ${winningSlot} landed exactly under the center line!`);
    }
  }, [winningSlot]);

  // Debug function to check current position
  const debugCurrentPosition = useCallback(() => {
    console.log('🔍 DEBUG: Current position analysis:', {
      currentTranslateX: translateX,
      centerOffset: CENTER_OFFSET,
      tileWidth: TILE_WIDTH,
      bufferMultiplier: BUFFER_MULTIPLIER,
      wheelSlotsLength: WHEEL_SLOTS.length
    });
    
    // Check what's currently at the center
    for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
      for (let i = 0; i < WHEEL_SLOTS.length; i++) {
        const tileGlobalIndex = repeat * WHEEL_SLOTS.length + i;
        const tileLeftEdge = translateX + (tileGlobalIndex * TILE_WIDTH);
        const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
        const distanceFromCenter = Math.abs(tileCenterPosition - CENTER_OFFSET);
        
        if (distanceFromCenter < TILE_WIDTH / 2) {
          console.log(`📍 Currently at center: Slot ${WHEEL_SLOTS[i].slot} (repeat ${repeat}, index ${i}) at distance ${distanceFromCenter.toFixed(2)}px`);
        }
      }
    }
  }, [translateX]);

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