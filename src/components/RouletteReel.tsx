import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

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

// Fixed configuration for truly device-independent positioning
const REEL_HEIGHT = 120; // Fixed reel height in pixels
const LOGICAL_TILE_SIZE = 100; // Fixed logical tile size (device-independent)
const VISIBLE_LOGICAL_TILES = 9; // Fixed number of visible logical tiles
const BUFFER_MULTIPLIER = 10; // 10x buffer for seamless looping

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
      const visibleLogicalWidth = VISIBLE_LOGICAL_TILES * LOGICAL_TILE_SIZE;
      const newScaleFactor = containerWidth / visibleLogicalWidth;
      
      setScaleFactor(newScaleFactor);
      
      console.log('📱 Scale factor calculation:', {
        containerWidth,
        visibleLogicalWidth,
        newScaleFactor,
        logicalTileSize: LOGICAL_TILE_SIZE,
        visibleLogicalTiles: VISIBLE_LOGICAL_TILES,
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

  // Generate tiles array with buffer for seamless looping
  const tiles = useMemo(() => {
    const tilesArray = [];
    for (let i = 0; i < WHEEL_SLOTS.length * BUFFER_MULTIPLIER; i++) {
      const slotIndex = i % WHEEL_SLOTS.length;
      const slot = WHEEL_SLOTS[slotIndex];
      tilesArray.push({
        key: `tile-${i}`,
        index: i,
        slot: slot.slot,
        color: slot.color
      });
    }
    
    console.log('🎰 Tiles generated:', {
      tilesCount: tilesArray.length,
      bufferMultiplier: BUFFER_MULTIPLIER,
      wheelSlotsLength: WHEEL_SLOTS.length,
      totalLogicalWidth: WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER
    });
    
    return tilesArray;
  }, []);

  // Safety check to ensure reel is always visible
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const visibleTilesWidth = VISIBLE_LOGICAL_TILES * LOGICAL_TILE_SIZE * scaleFactor;
      
      console.log('🔍 Reel visibility check:', {
        containerWidth,
        visibleTilesWidth,
        logicalTranslateX,
        scaleFactor,
        tilesCount: tiles.length,
        isVisible: visibleTilesWidth > 0 && Math.abs(logicalTranslateX) < 10000
      });
      
      // If reel is not visible, reset to center
      if (visibleTilesWidth === 0 || Math.abs(logicalTranslateX) > 10000) {
        console.warn('⚠️ Reel not visible, resetting to center');
        setLogicalTranslateX(0);
        setAnimationPhase('idle');
      }
    }
  }, [logicalTranslateX, scaleFactor, tiles.length]);

  // Calculate target logical position for winning slot to be centered
  const calculateTargetLogicalPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }
    
    // Find the center instance of the winning slot in the buffer
    const centerRepeat = Math.floor(BUFFER_MULTIPLIER / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    const targetTileLogicalCenter = targetTileIndex * LOGICAL_TILE_SIZE + LOGICAL_TILE_SIZE / 2;
    
    // Calculate logical position so that the tile center aligns with logical center (0)
    const targetLogicalPosition = 0 - targetTileLogicalCenter;
    
    console.log('🎯 PROVABLY FAIR TARGET CALCULATION:', {
      serverResultSlot: slot,
      slotIndex,
      centerRepeat,
      targetTileIndex,
      targetTileLogicalCenter,
      logicalCenter: 0,
      targetLogicalPosition,
      logicalTileSize: LOGICAL_TILE_SIZE,
      verification: `Server result ${slot} should land at logical position ${targetLogicalPosition} to be centered`
    });
    
    // Verify the calculation is correct
    const verificationPosition = targetLogicalPosition + targetTileLogicalCenter;
    console.log('🔍 CALCULATION VERIFICATION:', {
      calculatedLogicalPosition: targetLogicalPosition,
      tileLogicalCenter: targetTileLogicalCenter,
      verification: verificationPosition,
      logicalCenter: 0,
      shouldEqualLogicalCenter: Math.abs(verificationPosition - 0) < 1,
      result: Math.abs(verificationPosition - 0) < 1 ? '✅ CALCULATION CORRECT' : '❌ CALCULATION ERROR'
    });
    
    return targetLogicalPosition;
  }, []);

  // Animation state management
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'fullSpeed' | 'decelerating' | 'stopped'>('idle');
  const [spinStartTime, setSpinStartTime] = useState(0);
  const [decelerationStartTime, setDecelerationStartTime] = useState(0);
  const [decelerationStartPosition, setDecelerationStartPosition] = useState(0);

  // Animation configuration
  const ACCELERATION_DURATION = 800; // 0.8 seconds to reach full speed
  const FULL_SPEED_VELOCITY = LOGICAL_TILE_SIZE * 0.12; // Slightly reduced for smoother animation
  const DECELERATION_DURATION = 2500; // 2.5 seconds to stop
  const FULL_SPEED_DURATION = 2000; // 2 seconds of full speed spinning

  // Calculate complete animation path based on provably fair result
  const calculateAnimationPath = useCallback((winningSlot: number) => {
    const targetLogicalPosition = calculateTargetLogicalPosition(winningSlot);
    
    // Calculate how far we need to travel during deceleration
    const decelerationDistance = FULL_SPEED_VELOCITY * (DECELERATION_DURATION / 1000) * 0.5; // Average velocity during deceleration
    
    // Calculate the position where deceleration should start
    const decelerationStartPosition = targetLogicalPosition + decelerationDistance;
    
    // Calculate how far we travel during full speed
    const fullSpeedDistance = FULL_SPEED_VELOCITY * (FULL_SPEED_DURATION / 1000);
    
    // Calculate the position where full speed should start (after acceleration)
    const fullSpeedStartPosition = decelerationStartPosition + fullSpeedDistance;
    
    // Calculate how far we travel during acceleration
    const accelerationDistance = FULL_SPEED_VELOCITY * (ACCELERATION_DURATION / 1000) * 0.5; // Average velocity during acceleration
    
    // Calculate the starting position
    const animationStartPosition = fullSpeedStartPosition + accelerationDistance;
    
    console.log('🎯 COMPLETE ANIMATION PATH CALCULATION:', {
      serverWinningSlot: winningSlot,
      targetLogicalPosition,
      decelerationDistance,
      decelerationStartPosition,
      fullSpeedDistance,
      fullSpeedStartPosition,
      accelerationDistance,
      animationStartPosition,
      totalDistance: Math.abs(animationStartPosition - targetLogicalPosition)
    });
    
    return {
      startPosition: animationStartPosition,
      fullSpeedStartPosition,
      decelerationStartPosition,
      targetPosition: targetLogicalPosition
    };
  }, [calculateTargetLogicalPosition]);

  // Full speed spinning animation with proper frame timing
  const animateFullSpeed = useCallback(() => {
    if (animationPhase !== 'fullSpeed') return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - (animateFullSpeed.lastTime || currentTime);
    animateFullSpeed.lastTime = currentTime;
    
    // Ensure minimum delta time to prevent jumps
    const clampedDeltaTime = Math.min(deltaTime, 50); // Max 50ms between frames
    
    setLogicalTranslateX(prev => {
      const velocity = FULL_SPEED_VELOCITY * (clampedDeltaTime / 16.67); // Normalize to 60fps
      const newPosition = prev - velocity;
      
      // Improved infinite scrolling logic to prevent disappearing
      const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER;
      const halfWidth = totalLogicalWidth / 2;
      
      // Reset position when we've moved too far in either direction
      if (newPosition < -halfWidth) {
        return newPosition + totalLogicalWidth;
      } else if (newPosition > halfWidth) {
        return newPosition - totalLogicalWidth;
      }
      
      return newPosition;
    });
    
    animationRef.current = requestAnimationFrame(animateFullSpeed);
  }, [animationPhase]);



  // Verify that the winning tile is centered when animation stops
  const verifyWinningTilePosition = useCallback((finalLogicalPosition: number) => {
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
      const tileLeftEdge = finalLogicalPosition + (tileGlobalIndex * LOGICAL_TILE_SIZE);
      const tileLogicalCenterPosition = tileLeftEdge + (LOGICAL_TILE_SIZE / 2);
      const distanceFromCenter = Math.abs(tileLogicalCenterPosition - 0); // Logical center is 0
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileLogicalCenter = tileLogicalCenterPosition;
        closestRepeat = repeat;
        closestTileIndex = tileGlobalIndex;
      }
    }
    
    const isAccurate = closestDistance < 1; // 1 logical unit tolerance for precision
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      serverWinningSlot: winningSlot,
      expectedCenter: 0,
      actualTileCenter: closestTileLogicalCenter,
      distanceOff: closestDistance.toFixed(2) + ' logical units',
      closestRepeat,
      closestTileIndex,
      finalLogicalPosition,
      result: isAccurate ? '✅ PERFECT LANDING' : '❌ POSITION ERROR',
      tolerance: '1 logical unit'
    });
    
    if (!isAccurate) {
      console.warn(`⚠️ Position adjustment needed: Server result ${winningSlot} is ${closestDistance.toFixed(2)} logical units off center`);
      
      // Auto-correct if off by more than 2 logical units
      if (closestDistance > 2) {
        const correction = 0 - closestTileLogicalCenter;
        console.log(`🔧 Auto-correcting position by ${correction.toFixed(2)} logical units`);
        setLogicalTranslateX(prev => prev + correction);
        
        // Verify the correction worked
        setTimeout(() => {
          const correctedPosition = finalLogicalPosition + correction;
          console.log(`🔍 Verification after correction: Position ${correctedPosition.toFixed(2)}`);
        }, 100);
      }
    } else {
      console.log(`🎉 Perfect! Server result ${winningSlot} landed exactly under the center line!`);
    }
  }, [winningSlot]);

  // Handle spinning state changes
  useEffect(() => {
    if (isSpinning !== lastSpinningState.current) {
      lastSpinningState.current = isSpinning;
      
      if (isSpinning) {
        console.log('🎰 SPINNING STARTED - Initializing animation');
        setIsAnimating(true);
        setAnimationPhase('idle');
        
        // Calculate the complete animation path if we have a winning slot
        if (winningSlot !== null) {
          const animationPath = calculateAnimationPath(winningSlot);
          
          // Set the starting position for the animation
          setLogicalTranslateX(animationPath.startPosition);
          setDecelerationStartPosition(animationPath.decelerationStartPosition);
          
          console.log('🎯 ANIMATION PATH SET:', {
            serverWinningSlot: winningSlot,
            startPosition: animationPath.startPosition,
            targetPosition: animationPath.targetPosition
          });
        }
        
        // Start animation immediately
        const startAnimation = () => {
          console.log('🚀 Starting roulette acceleration');
          setAnimationPhase('accelerating');
          setSpinStartTime(Date.now());
          
          const animateAcceleration = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - spinStartTime;
            const progress = Math.min(elapsed / ACCELERATION_DURATION, 1);
            
            // Smooth acceleration curve (ease-in)
            const accelerationProgress = 1 - Math.pow(1 - progress, 2);
            const currentVelocity = FULL_SPEED_VELOCITY * accelerationProgress;
            
            // Use frame timing for smooth movement
            const deltaTime = currentTime - (animateAcceleration.lastTime || currentTime);
            animateAcceleration.lastTime = currentTime;
            const clampedDeltaTime = Math.min(deltaTime, 50); // Max 50ms between frames
            
            setLogicalTranslateX(prev => {
              const velocity = currentVelocity * (clampedDeltaTime / 16.67); // Normalize to 60fps
              const newPosition = prev - velocity;
              
              // Improved infinite scrolling logic to prevent disappearing
              const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER;
              const halfWidth = totalLogicalWidth / 2;
              
              // Reset position when we've moved too far in either direction
              if (newPosition < -halfWidth) {
                return newPosition + totalLogicalWidth;
              } else if (newPosition > halfWidth) {
                return newPosition - totalLogicalWidth;
              }
              
              return newPosition;
            });
            
            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animateAcceleration);
            } else {
              // Phase 2: Full speed spinning
              console.log('🌀 Entering full-speed spinning phase');
              setAnimationPhase('fullSpeed');
              animateFullSpeed();
            }
          };
          
          animateAcceleration();
        };
        
        // Start animation after a small delay to ensure state is updated
        setTimeout(startAnimation, 10);
        
      } else {
        console.log('🛑 SPINNING STOPPED - Cleaning up animation');
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setIsAnimating(false);
      }
    }
  }, [isSpinning, logicalTranslateX, animateFullSpeed, winningSlot, calculateAnimationPath]);

  // Handle deceleration when winning slot is received
  useEffect(() => {
    if (!isSpinning && winningSlot !== null && animationPhase === 'fullSpeed') {
      // Phase 3: Start deceleration to provably fair result
      console.log('🎯 PROVABLY FAIR RESULT RECEIVED - Starting deceleration');
      setAnimationPhase('decelerating');
      setDecelerationStartTime(Date.now());
      
      // Use the pre-calculated animation path
      const animationPath = calculateAnimationPath(winningSlot);
      const targetLogicalPosition = animationPath.targetPosition;
      
      console.log('🎲 DECELERATION CALCULATION:', {
        serverWinningSlot: winningSlot,
        decelerationStartPosition: decelerationStartPosition,
        targetLogicalPosition,
        distance: Math.abs(targetLogicalPosition - decelerationStartPosition)
      });
      
      const animateDeceleration = () => {
        const elapsed = Date.now() - decelerationStartTime;
        const progress = Math.min(elapsed / DECELERATION_DURATION, 1);
        
        // Simplified deceleration curve for more predictable landing
        let decelerationProgress;
        if (progress < 0.8) {
          // First 80%: Smooth deceleration
          decelerationProgress = 1 - Math.pow(1 - progress / 0.8, 2);
        } else {
          // Last 20%: Very slow final approach
          const finalProgress = (progress - 0.8) / 0.2;
          decelerationProgress = 0.8 + (finalProgress * 0.2);
        }
        
        // Interpolate between start and target position
        const newLogicalPosition = decelerationStartPosition + (targetLogicalPosition - decelerationStartPosition) * decelerationProgress;
        
        // Ensure position stays within bounds during deceleration
        const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER;
        const halfWidth = totalLogicalWidth / 2;
        
        let finalPosition = newLogicalPosition;
        if (finalPosition < -halfWidth) {
          finalPosition += totalLogicalWidth;
        } else if (finalPosition > halfWidth) {
          finalPosition -= totalLogicalWidth;
        }
        
        setLogicalTranslateX(finalPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateDeceleration);
        } else {
          // Animation complete - ensure we land exactly on target
          let exactFinalPosition = targetLogicalPosition;
          
          // Ensure final position is within bounds
          if (exactFinalPosition < -halfWidth) {
            exactFinalPosition += totalLogicalWidth;
          } else if (exactFinalPosition > halfWidth) {
            exactFinalPosition -= totalLogicalWidth;
          }
          
          setLogicalTranslateX(exactFinalPosition);
          
          console.log('✅ DECELERATION COMPLETE:', {
            serverWinningSlot: winningSlot,
            finalLogicalPosition: exactFinalPosition,
            targetLogicalPosition,
            accuracy: Math.abs(exactFinalPosition - targetLogicalPosition)
          });
          
          setAnimationPhase('stopped');
          setIsAnimating(false);
          verifyWinningTilePosition(exactFinalPosition);
        }
      };
      
      animateDeceleration();
    }
  }, [isSpinning, winningSlot, animationPhase, decelerationStartPosition, calculateAnimationPath]);

  // Debug animation state
  useEffect(() => {
    console.log('🎰 Animation state update:', {
      isSpinning,
      animationPhase,
      isAnimating,
      logicalTranslateX: logicalTranslateX.toFixed(2),
      winningSlot
    });
  }, [isSpinning, animationPhase, isAnimating, logicalTranslateX, winningSlot]);

  // Reset animation state when round changes
  useEffect(() => {
    if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
      setLogicalTranslateX(synchronizedPosition);
      setAnimationPhase('idle');
    }
  }, [synchronizedPosition]);

  // Get tile color class
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-green-500 to-green-600 border-green-400 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500 text-white';
      default: return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container with fixed height */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        style={{ height: `${REEL_HEIGHT}px` }}
      >
        {/* Center indicator line - static and centered */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-emerald-400"></div>
          
          {/* Bottom arrow */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-400"></div>
          
          {/* Center line */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-emerald-400"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-emerald-400/20 blur-sm"></div>
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
            const tileLogicalCenter = logicalTranslateX + (tile.index * LOGICAL_TILE_SIZE + LOGICAL_TILE_SIZE / 2);
            const distanceFromCenter = Math.abs(tileLogicalCenter - 0); // Logical center is always 0
            const isNearCenter = distanceFromCenter < LOGICAL_TILE_SIZE / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < LOGICAL_TILE_SIZE / 3;

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
                  width: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  height: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  minWidth: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  maxWidth: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  minHeight: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  maxHeight: `${LOGICAL_TILE_SIZE * scaleFactor}px`
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