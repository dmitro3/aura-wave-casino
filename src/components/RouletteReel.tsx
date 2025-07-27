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
const BUFFER_MULTIPLIER = 50; // Massive buffer to prevent any disappearing

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management - all at the top to avoid initialization errors
  const [logicalTranslateX, setLogicalTranslateX] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'fullSpeed' | 'decelerating' | 'stopped'>('idle');
  const [spinStartTime, setSpinStartTime] = useState(0);
  const [decelerationStartTime, setDecelerationStartTime] = useState(0);
  const [decelerationStartPosition, setDecelerationStartPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [lastWinningSlot, setLastWinningSlot] = useState<number | null>(null);
  const [lastRoundId, setLastRoundId] = useState<string | null>(null);

  // Refs
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpinningState = useRef<boolean>(false);
  const positionRef = useRef<number>(0);

  // Animation configuration
  const ACCELERATION_DURATION = 800; // 0.8 seconds to reach full speed
  const FULL_SPEED_VELOCITY = LOGICAL_TILE_SIZE * 0.12; // Smooth velocity
  const DECELERATION_DURATION = 2500; // 2.5 seconds to stop
  const FULL_SPEED_DURATION = 2000; // 2 seconds of full speed spinning

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, logicalTranslateX, isAnimating, animationPhase });

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
        newScaleFactor
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

  // Generate tiles array with massive buffer for seamless looping
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
    
    console.log('🎰 Generated tiles:', {
      totalTiles: tilesArray.length,
      bufferMultiplier: BUFFER_MULTIPLIER,
      wheelSlots: WHEEL_SLOTS.length,
      totalWidth: WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER
    });
    
    return tilesArray;
  }, []);

  // Ultra-robust infinite scrolling logic
  const normalizePosition = useCallback((position: number) => {
    const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER;
    const halfWidth = totalLogicalWidth / 2;
    
    let normalizedPosition = position;
    
    // Keep position within bounds with proper wrapping
    while (normalizedPosition < -halfWidth) {
      normalizedPosition += totalLogicalWidth;
    }
    while (normalizedPosition > halfWidth) {
      normalizedPosition -= totalLogicalWidth;
    }
    
    // Additional safety check
    if (Math.abs(normalizedPosition) > halfWidth) {
      console.warn('⚠️ Position normalization failed, resetting to center');
      normalizedPosition = 0;
    }
    
    return normalizedPosition;
  }, []);

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
      targetLogicalPosition
    });
    
    return targetLogicalPosition;
  }, []);

  // Verify that the winning tile is centered when animation stops
  const verifyWinningTilePosition = useCallback((finalLogicalPosition: number) => {
    if (winningSlot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
    if (slotIndex === -1) return;
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileLogicalCenter = 0;
    
    for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalLogicalPosition + (tileGlobalIndex * LOGICAL_TILE_SIZE);
      const tileLogicalCenterPosition = tileLeftEdge + (LOGICAL_TILE_SIZE / 2);
      const distanceFromCenter = Math.abs(tileLogicalCenterPosition - 0);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileLogicalCenter = tileLogicalCenterPosition;
      }
    }
    
    const isAccurate = closestDistance < 1;
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      serverWinningSlot: winningSlot,
      actualTileCenter: closestTileLogicalCenter,
      distanceOff: closestDistance.toFixed(2),
      result: isAccurate ? '✅ PERFECT LANDING' : '❌ POSITION ERROR'
    });
    
    if (!isAccurate && closestDistance > 2) {
      const correction = 0 - closestTileLogicalCenter;
      console.log(`🔧 Auto-correcting position by ${correction.toFixed(2)} logical units`);
      const correctedPosition = normalizePosition(finalLogicalPosition + correction);
      setLogicalTranslateX(correctedPosition);
      positionRef.current = correctedPosition;
    }
  }, [winningSlot, normalizePosition]);

  // Animation functions with ultra-robust position management
  const animateAcceleration = useCallback(() => {
    if (animationPhase !== 'accelerating') return;
    
    const currentTime = Date.now();
    const elapsed = currentTime - spinStartTime;
    const progress = Math.min(elapsed / ACCELERATION_DURATION, 1);
    
    // Smooth acceleration curve (ease-in)
    const accelerationProgress = 1 - Math.pow(1 - progress, 2);
    const currentVelocity = FULL_SPEED_VELOCITY * accelerationProgress;
    
    setLogicalTranslateX(prev => {
      const newPosition = normalizePosition(prev - currentVelocity);
      positionRef.current = newPosition;
      return newPosition;
    });
    
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateAcceleration);
    } else {
      console.log('🌀 Entering full-speed spinning phase');
      setAnimationPhase('fullSpeed');
    }
  }, [animationPhase, spinStartTime, normalizePosition]);

  const animateFullSpeed = useCallback(() => {
    if (animationPhase !== 'fullSpeed') return;
    
    setLogicalTranslateX(prev => {
      const newPosition = normalizePosition(prev - FULL_SPEED_VELOCITY);
      positionRef.current = newPosition;
      return newPosition;
    });
    
    animationRef.current = requestAnimationFrame(animateFullSpeed);
  }, [animationPhase, normalizePosition]);

  const animateDeceleration = useCallback(() => {
    if (animationPhase !== 'decelerating') return;
    
    const elapsed = Date.now() - decelerationStartTime;
    const progress = Math.min(elapsed / DECELERATION_DURATION, 1);
    
    // Smooth deceleration curve
    let decelerationProgress;
    if (progress < 0.8) {
      decelerationProgress = 1 - Math.pow(1 - progress / 0.8, 2);
    } else {
      const finalProgress = (progress - 0.8) / 0.2;
      decelerationProgress = 0.8 + (finalProgress * 0.2);
    }
    
    const newLogicalPosition = decelerationStartPosition + (targetPosition - decelerationStartPosition) * decelerationProgress;
    const normalizedPosition = normalizePosition(newLogicalPosition);
    
    setLogicalTranslateX(normalizedPosition);
    positionRef.current = normalizedPosition;
    
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateDeceleration);
    } else {
      // Animation complete - ensure exact landing
      const exactFinalPosition = normalizePosition(targetPosition);
      
      setLogicalTranslateX(exactFinalPosition);
      positionRef.current = exactFinalPosition;
      
      console.log('✅ DECELERATION COMPLETE:', {
        serverWinningSlot: winningSlot,
        finalLogicalPosition: exactFinalPosition
      });
      
      setAnimationPhase('stopped');
      setIsAnimating(false);
      verifyWinningTilePosition(exactFinalPosition);
    }
  }, [animationPhase, decelerationStartTime, decelerationStartPosition, targetPosition, winningSlot, verifyWinningTilePosition, normalizePosition]);

  // Main animation trigger based on isSpinning prop - NO POSITION RESET
  useEffect(() => {
    console.log('🎰 RouletteReel state change:', {
      isSpinning,
      winningSlot,
      animationPhase,
      isAnimating,
      currentPosition: logicalTranslateX
    });

    if (isSpinning && !isAnimating) {
      console.log('🚀 STARTING ANIMATION - Round entered spinning phase');
      setIsAnimating(true);
      setAnimationPhase('accelerating');
      setSpinStartTime(Date.now());
      
      // Calculate target position if we have a winning slot
      if (winningSlot !== null) {
        const target = calculateTargetLogicalPosition(winningSlot);
        setTargetPosition(target);
        setLastWinningSlot(winningSlot);
        console.log('🎯 TARGET CALCULATED:', { winningSlot, target });
      }
      
    } else if (!isSpinning && isAnimating) {
      console.log('🛑 STOPPING ANIMATION - Round left spinning phase');
      setIsAnimating(false);
      setAnimationPhase('stopped');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // DO NOT reset position - keep it for next round
    }
  }, [isSpinning, winningSlot, isAnimating, calculateTargetLogicalPosition, logicalTranslateX]);

  // Handle deceleration when winning slot is received during spinning
  useEffect(() => {
    if (isSpinning && winningSlot !== null && animationPhase === 'fullSpeed' && winningSlot !== lastWinningSlot) {
      console.log('🎯 PROVABLY FAIR RESULT RECEIVED - Starting deceleration');
      setAnimationPhase('decelerating');
      setDecelerationStartTime(Date.now());
      setDecelerationStartPosition(logicalTranslateX);
      setLastWinningSlot(winningSlot);
      
      const target = calculateTargetLogicalPosition(winningSlot);
      setTargetPosition(target);
      
      console.log('🎲 DECELERATION START:', {
        serverWinningSlot: winningSlot,
        startPosition: logicalTranslateX,
        targetPosition: target
      });
    }
  }, [isSpinning, winningSlot, animationPhase, logicalTranslateX, calculateTargetLogicalPosition, lastWinningSlot]);

  // Trigger animation functions based on phase changes
  useEffect(() => {
    console.log('🎰 Phase change detected:', animationPhase);
    
    if (animationPhase === 'accelerating') {
      console.log('🚀 Starting acceleration animation');
      animateAcceleration();
    } else if (animationPhase === 'fullSpeed') {
      console.log('🌀 Starting full speed animation');
      animateFullSpeed();
    } else if (animationPhase === 'decelerating') {
      console.log('🎯 Starting deceleration animation');
      animateDeceleration();
    }
  }, [animationPhase, animateAcceleration, animateFullSpeed, animateDeceleration]);

  // Server-side synchronization - only update if position is significantly different
  useEffect(() => {
    if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
      const currentPos = positionRef.current;
      const serverPos = synchronizedPosition;
      const difference = Math.abs(currentPos - serverPos);
      
      // Only sync if there's a significant difference (more than 1 tile width)
      if (difference > LOGICAL_TILE_SIZE) {
        console.log('🔄 Server sync: Updating position from', currentPos, 'to', serverPos);
        setLogicalTranslateX(serverPos);
        positionRef.current = serverPos;
      } else {
        console.log('✅ Position already in sync with server');
      }
    }
  }, [synchronizedPosition]);

  // Enhanced safety check to ensure reel is always visible and properly positioned
  useEffect(() => {
    const checkReelVisibility = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const visibleTilesWidth = VISIBLE_LOGICAL_TILES * LOGICAL_TILE_SIZE * scaleFactor;
        
        // If reel is not visible or position is way off, reset to a safe position
        if (visibleTilesWidth === 0 || Math.abs(logicalTranslateX) > 100000) {
          console.warn('⚠️ Reel visibility issue detected, resetting to safe position');
          const safePosition = normalizePosition(0);
          setLogicalTranslateX(safePosition);
          positionRef.current = safePosition;
        }
        
        // Additional check for tile visibility
        const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER;
        const halfWidth = totalLogicalWidth / 2;
        
        if (Math.abs(logicalTranslateX) > halfWidth) {
          console.warn('⚠️ Position out of bounds, normalizing');
          const normalizedPos = normalizePosition(logicalTranslateX);
          setLogicalTranslateX(normalizedPos);
          positionRef.current = normalizedPos;
        }
      }
    };

    // Check every 2 seconds for better responsiveness
    const interval = setInterval(checkReelVisibility, 2000);
    return () => clearInterval(interval);
  }, [logicalTranslateX, scaleFactor, normalizePosition]);

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