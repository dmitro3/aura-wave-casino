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

// Fixed logical grid system - completely device-independent
const BUFFER_MULTIPLIER = 10; // 10x buffer for seamless looping
const LOGICAL_TILE_WIDTH = 80; // Fixed logical tile width (device-independent) - reduced from 100
const LOGICAL_CENTER_POSITION = 0; // Fixed logical center position

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [logicalTranslateX, setLogicalTranslateX] = useState(0); // Logical position (device-independent)
  const [isAnimating, setIsAnimating] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1); // Scale factor to convert logical to physical pixels
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpinningState = useRef<boolean>(false);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, logicalTranslateX, synchronizedPosition, isAnimating, scaleFactor });

  // Calculate scale factor based on container width to maintain consistent logical positioning
  const updateScaleFactor = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const visibleLogicalWidth = 9 * LOGICAL_TILE_WIDTH; // 9 tiles visible (increased from 7)
      const newScaleFactor = containerWidth / visibleLogicalWidth;
      
      setScaleFactor(newScaleFactor);
      
      console.log('📱 Scale factor updated:', {
        containerWidth,
        visibleLogicalWidth,
        newScaleFactor,
        logicalTileWidth: LOGICAL_TILE_WIDTH,
        logicalCenter: LOGICAL_CENTER_POSITION,
        device: containerWidth < 768 ? 'mobile' : containerWidth < 1024 ? 'tablet' : 'desktop'
      });
    }
  }, []);

  // Update scale factor on mount and resize
  useEffect(() => {
    updateScaleFactor();
    
    const handleResize = () => {
      updateScaleFactor();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScaleFactor]);

  // Calculate the target logical position for the winning slot to be centered
  const calculateTargetLogicalPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }
    
    // Find the center instance of the winning slot in the buffer
    const centerRepeat = Math.floor(BUFFER_MULTIPLIER / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    const targetTileLogicalCenter = targetTileIndex * LOGICAL_TILE_WIDTH + LOGICAL_TILE_WIDTH / 2;
    
    // Calculate logical position so that the tile center aligns with the logical center
    const targetLogicalPosition = LOGICAL_CENTER_POSITION - targetTileLogicalCenter;
    
    console.log('🎯 Target logical position calculation for winning slot:', {
      winningSlot: slot,
      slotIndex,
      centerRepeat,
      targetTileIndex,
      targetTileLogicalCenter,
      logicalCenter: LOGICAL_CENTER_POSITION,
      logicalTileWidth: LOGICAL_TILE_WIDTH,
      targetLogicalPosition,
      verification: `Slot ${slot} should be at logical position ${targetLogicalPosition} to be centered`
    });
    
    // Verify the calculation is correct
    const verificationPosition = targetLogicalPosition + targetTileLogicalCenter;
    console.log('🔍 Verification check:', {
      calculatedLogicalPosition: targetLogicalPosition,
      tileLogicalCenter: targetTileLogicalCenter,
      verification: verificationPosition,
      logicalCenter: LOGICAL_CENTER_POSITION,
      shouldEqualLogicalCenter: Math.abs(verificationPosition - LOGICAL_CENTER_POSITION) < 1
    });
    
    return targetLogicalPosition;
  }, []);

  // Simple spinning animation with infinite scrolling using logical positioning
  const animate = useCallback(() => {
    if (isSpinning) {
      // Move the reel to the left (simulating spinning) using logical units
      setLogicalTranslateX(prev => {
        const newLogicalPosition = prev - (LOGICAL_TILE_WIDTH * 0.125); // Fixed logical speed
        
        // Reset position when we've moved too far left to maintain infinite scrolling
        const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_WIDTH * BUFFER_MULTIPLIER;
        if (Math.abs(newLogicalPosition) > totalLogicalWidth / 2) {
          return newLogicalPosition + totalLogicalWidth / 2;
        }
        
        return newLogicalPosition;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (winningSlot !== null) {
      // PRIORITY: Ensure the winning slot lands under the center line
      console.log('🎯 PROVABLY FAIR RESULT RECEIVED - Winning slot:', winningSlot);
      
      const startLogicalPosition = logicalTranslateX;
      
      // Calculate the EXACT target logical position for the winning slot to be centered
      const targetLogicalPosition = calculateTargetLogicalPosition(winningSlot);
      
      console.log('🎲 Starting precise deceleration animation:', {
        winningSlot,
        startLogicalPosition,
        targetLogicalPosition,
        distance: Math.abs(targetLogicalPosition - startLogicalPosition),
        goal: `Move reel to logical position ${targetLogicalPosition} so slot ${winningSlot} is centered`
      });
      
      // Debug current position before animation
      debugCurrentLogicalPosition();
      
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
        
        const newLogicalPosition = startLogicalPosition + (targetLogicalPosition - startLogicalPosition) * easeProgress;
        setLogicalTranslateX(newLogicalPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateToResult);
        } else {
          setIsAnimating(false);
          
          // Verify the result landed correctly
          console.log('✅ Animation complete - Winning slot:', winningSlot, 'at final logical position:', newLogicalPosition);
          verifyWinningTileLogicalPosition(newLogicalPosition);
          debugCurrentLogicalPosition();
        }
      };
      
      animateToResult();
    }
  }, [isSpinning, winningSlot, synchronizedPosition, logicalTranslateX, calculateTargetLogicalPosition]);

  // Start/stop animation based on spinning state
  useEffect(() => {
    if (isSpinning && !lastSpinningState.current) {
      console.log('🚀 Starting roulette spin');
      setIsAnimating(true);
      lastSpinningState.current = true;
      
      // Reset position to center if it's too far off
      const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_WIDTH * BUFFER_MULTIPLIER;
      if (Math.abs(logicalTranslateX) > totalLogicalWidth / 4) {
        setLogicalTranslateX(0);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (!isSpinning && lastSpinningState.current) {
      console.log('🛑 Stopping roulette spin');
      lastSpinningState.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, animate, logicalTranslateX]);

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
      setLogicalTranslateX(0);
    }
  }, [winningSlot, isSpinning]);

  // Verify that the winning tile is centered when animation stops
  const verifyWinningTileLogicalPosition = useCallback((finalLogicalPosition: number) => {
    if (winningSlot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
    if (slotIndex === -1) {
      console.error('❌ Invalid winning slot for verification:', winningSlot);
      return;
    }
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileLogicalCenter = 0;
    let closestRepeat = 0;
    let closestTileIndex = 0;
    
    for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalLogicalPosition + (tileGlobalIndex * LOGICAL_TILE_WIDTH);
      const tileLogicalCenterPosition = tileLeftEdge + (LOGICAL_TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileLogicalCenterPosition - LOGICAL_CENTER_POSITION);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileLogicalCenter = tileLogicalCenterPosition;
        closestRepeat = repeat;
        closestTileIndex = tileGlobalIndex;
      }
    }
    
    const isAccurate = closestDistance < 3; // 3px tolerance for precision
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      winningSlot,
      expectedCenter: LOGICAL_CENTER_POSITION,
      actualTileCenter: closestTileLogicalCenter,
      distanceOff: closestDistance.toFixed(2) + 'px',
      closestRepeat,
      closestTileIndex,
      finalLogicalPosition,
      result: isAccurate ? '✅ PERFECT LANDING' : '❌ POSITION ERROR',
      tolerance: '3px'
    });
    
    if (!isAccurate) {
      console.warn(`⚠️ Position adjustment needed: Slot ${winningSlot} is ${closestDistance.toFixed(2)}px off center`);
      
      // Auto-correct if off by more than 5px
      if (closestDistance > 5) {
        const correction = LOGICAL_CENTER_POSITION - closestTileLogicalCenter;
        console.log(`🔧 Auto-correcting position by ${correction.toFixed(2)}px`);
        setLogicalTranslateX(prev => prev + correction);
        
        // Verify the correction worked
        setTimeout(() => {
          const correctedPosition = finalLogicalPosition + correction;
          console.log(`🔍 Verification after correction: Position ${correctedPosition.toFixed(2)}`);
        }, 100);
      }
    } else {
      console.log(`🎉 Perfect! Slot ${winningSlot} landed exactly under the center line!`);
    }
  }, [winningSlot]);

  // Debug function to check current position
  const debugCurrentLogicalPosition = useCallback(() => {
    console.log('🔍 DEBUG: Current logical position analysis:', {
      currentLogicalTranslateX: logicalTranslateX,
      logicalCenter: LOGICAL_CENTER_POSITION,
      logicalTileWidth: LOGICAL_TILE_WIDTH,
      bufferMultiplier: BUFFER_MULTIPLIER,
      wheelSlotsLength: WHEEL_SLOTS.length
    });
    
    // Check what's currently at the center
    for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
      for (let i = 0; i < WHEEL_SLOTS.length; i++) {
        const tileGlobalIndex = repeat * WHEEL_SLOTS.length + i;
        const tileLeftEdge = logicalTranslateX + (tileGlobalIndex * LOGICAL_TILE_WIDTH);
        const tileLogicalCenterPosition = tileLeftEdge + (LOGICAL_TILE_WIDTH / 2);
        const distanceFromCenter = Math.abs(tileLogicalCenterPosition - LOGICAL_CENTER_POSITION);
        
        if (distanceFromCenter < LOGICAL_TILE_WIDTH / 2) {
          console.log(`📍 Currently at center: Slot ${WHEEL_SLOTS[i].slot} (repeat ${repeat}, index ${i}) at distance ${distanceFromCenter.toFixed(2)}px`);
        }
      }
    }
  }, [logicalTranslateX]);

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
      <div ref={containerRef} className="relative h-24 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
        
        {/* Center indicator line - positioned at container center */}
        <div 
          className="absolute inset-y-0 w-1 z-30 pointer-events-none"
          style={{ 
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
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
            transform: `translateX(${logicalTranslateX * scaleFactor}px)`,
            transition: 'none', // No CSS transitions, we control animation with JS
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Calculate if this tile is near the center for highlighting
            const tileLogicalCenter = logicalTranslateX + (tile.index * LOGICAL_TILE_WIDTH + LOGICAL_TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileLogicalCenter - LOGICAL_CENTER_POSITION);
            const isNearCenter = distanceFromCenter < LOGICAL_TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < LOGICAL_TILE_WIDTH / 3;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-200
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${isNearCenter && isAnimating ? 'scale-105 z-10' : ''}
                `}
                style={{ 
                  width: `${LOGICAL_TILE_WIDTH * scaleFactor}px`,
                  height: `${LOGICAL_TILE_WIDTH * scaleFactor}px` // Make tiles square
                }}
              >
                <div className={`text-lg font-bold drop-shadow-lg ${
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