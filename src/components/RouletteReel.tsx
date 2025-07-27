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

// 🎡 IMMUTABLE PIXEL-PERFECT DIMENSIONS - NEVER CHANGE
const TILE_SIZE_PX = 100; // Fixed 100px tiles (using px values only)
const VISIBLE_TILE_COUNT = 15; // Always show exactly 15 tiles
const REEL_VIEWPORT_WIDTH_PX = TILE_SIZE_PX * VISIBLE_TILE_COUNT; // 1500px fixed viewport
const REEL_HEIGHT_PX = 120; // Fixed height in px
const CENTER_TILE_INDEX = Math.floor(VISIBLE_TILE_COUNT / 2); // 7th tile (0-indexed)
const BUFFER_TILES_COUNT = 200; // Extra tiles for smooth scrolling

// ⏱️ EXACT 4-SECOND ANIMATION TIMING
const TOTAL_ANIMATION_DURATION_MS = 4000; // Exactly 4 seconds
const PHASE_1_ACCELERATION_MS = 800;
const PHASE_2_CONSTANT_SPEED_MS = 1700;
const PHASE_3_DECELERATION_MS = 1500;

// Validate timing adds up to exactly 4 seconds
if (PHASE_1_ACCELERATION_MS + PHASE_2_CONSTANT_SPEED_MS + PHASE_3_DECELERATION_MS !== TOTAL_ANIMATION_DURATION_MS) {
  throw new Error('Animation phases must sum to exactly 4000ms');
}

// 🎯 Easing functions for realistic physics
const easeInCubic = (t: number): number => t * t * t;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(() => {
    // Initialize from localStorage or default to 0
    const savedPosition = localStorage.getItem('rouletteReelPosition');
    return savedPosition ? parseFloat(savedPosition) : 0;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'spinning' | 'decelerating' | 'completed'>('idle');
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Animation refs
  const animationRef = useRef<number>();
  const animationStartTime = useRef<number>(0);
  const startPosition = useRef<number>(0);
  const targetPosition = useRef<number>(0);
  const hasStartedAnimation = useRef<boolean>(false);

  console.log('🎰 RouletteReel:', { 
    isSpinning, 
    winningSlot, 
    translateX: Math.round(translateX), 
    isAnimating, 
    animationPhase
  });

  // Generate tiles array with buffer
  const tiles = [];
  for (let i = 0; i < WHEEL_SLOTS.length * BUFFER_TILES_COUNT; i++) {
    const slotIndex = i % WHEEL_SLOTS.length;
    const slot = WHEEL_SLOTS[slotIndex];
    tiles.push({
      key: `tile-${i}`,
      index: i,
      slot: slot.slot,
      color: slot.color
    });
  }

  // 🧱 Calculate target position for RIGHT-TO-LEFT movement ONLY
  const calculateTargetPosition = useCallback((slot: number, currentPos: number): number => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return currentPos;
    }

    const viewportCenter = REEL_VIEWPORT_WIDTH_PX / 2; // 750px
    const wheelSize = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px per wheel cycle
    
    // ABSOLUTE RIGHT-TO-LEFT: Always move left (negative direction) from current position
    const minSpinCycles = 40; // Minimum 40 wheel cycles to the left
    const maxSpinCycles = 80; // Maximum 80 wheel cycles to the left
    
    // Calculate how far LEFT we must travel (always negative direction)
    const spinCycles = minSpinCycles + Math.random() * (maxSpinCycles - minSpinCycles);
    const leftwardDistance = spinCycles * wheelSize; // Always positive value
    
    // Target MUST be to the left: currentPos - leftwardDistance (always negative movement)
    const targetArea = currentPos - leftwardDistance; // This guarantees leftward movement
    
    // Find the winning slot closest to our target area (but MUST be to the left)
    let bestTargetPosition = targetArea;
    let closestDistance = Infinity;
    
    // Search for winning slot instances near our target area
    for (let cycle = 0; cycle < BUFFER_TILES_COUNT; cycle++) {
      const tileAbsoluteIndex = cycle * WHEEL_SLOTS.length + slotIndex;
      const tileCenter = tileAbsoluteIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
      const targetOffset = viewportCenter - tileCenter;
      
      // STRICT ENFORCEMENT: Only consider positions that are significantly to the LEFT
      if (targetOffset < currentPos - (wheelSize * 10)) { // Must be at least 10 wheel cycles to the left
        const distanceFromTargetArea = Math.abs(targetOffset - targetArea);
        
        if (distanceFromTargetArea < closestDistance) {
          closestDistance = distanceFromTargetArea;
          bestTargetPosition = targetOffset;
        }
      }
    }

    // SAFETY CHECK: Ensure target is always to the left
    if (bestTargetPosition >= currentPos) {
      console.warn('⚠️ Target calculation error - forcing leftward movement');
      bestTargetPosition = currentPos - (minSpinCycles * wheelSize);
    }

    // FINAL VERIFICATION: Ensure movement is RIGHT-TO-LEFT
    const movementDirection = bestTargetPosition - currentPos;
    const isMovingLeft = movementDirection < 0;
    
    console.log('🎯 RIGHT-TO-LEFT Target Calculation:', {
      slot,
      currentPosition: Math.round(currentPos),
      targetPosition: Math.round(bestTargetPosition),
      leftwardDistance: Math.round(Math.abs(bestTargetPosition - currentPos)),
      movementDirection: movementDirection < 0 ? 'LEFT ←' : 'RIGHT →',
      isCorrectDirection: isMovingLeft,
      wheelCycles: Math.round(Math.abs(bestTargetPosition - currentPos) / wheelSize)
    });

    // ABSOLUTE GUARANTEE: If somehow target is not to the left, force it
    if (!isMovingLeft) {
      console.error('❌ FORCING LEFT MOVEMENT');
      return currentPos - (minSpinCycles * wheelSize);
    }

    return bestTargetPosition;
  }, []);

  // 🎞️ EXACT 4-SECOND animation with precise timing
  const animate = useCallback(() => {
    const currentTime = Date.now();
    const elapsed = currentTime - animationStartTime.current;
    
    let currentPosition = startPosition.current;

    // Phase 1: Rapid Acceleration (0-800ms) - 20% of total distance
    if (elapsed <= PHASE_1_ACCELERATION_MS) {
      if (animationPhase !== 'accelerating') {
        setAnimationPhase('accelerating');
      }
      
      const progress = elapsed / PHASE_1_ACCELERATION_MS;
      const easedProgress = easeInCubic(progress);
      
      const totalDistance = targetPosition.current - startPosition.current;
      const accelerationDistance = totalDistance * 0.2;
      
      currentPosition = startPosition.current + (easedProgress * accelerationDistance);
      
    }
    // Phase 2: High Speed (800-2500ms) - 60% of total distance
    else if (elapsed <= PHASE_1_ACCELERATION_MS + PHASE_2_CONSTANT_SPEED_MS) {
      if (animationPhase !== 'spinning') {
        setAnimationPhase('spinning');
      }
      
      const phase2Elapsed = elapsed - PHASE_1_ACCELERATION_MS;
      const progress = phase2Elapsed / PHASE_2_CONSTANT_SPEED_MS;
      
      const totalDistance = targetPosition.current - startPosition.current;
      const accelerationDistance = totalDistance * 0.2;
      const constantSpeedDistance = totalDistance * 0.6;
      
      currentPosition = startPosition.current + accelerationDistance + (progress * constantSpeedDistance);
      
    }
    // Phase 3: Smooth Deceleration (2500-4000ms) - final 20% of distance
    else if (elapsed <= TOTAL_ANIMATION_DURATION_MS) {
      if (animationPhase !== 'decelerating') {
        setAnimationPhase('decelerating');
      }
      
      const phase3Elapsed = elapsed - PHASE_1_ACCELERATION_MS - PHASE_2_CONSTANT_SPEED_MS;
      const progress = phase3Elapsed / PHASE_3_DECELERATION_MS;
      const easedProgress = easeOutCubic(progress);
      
      const totalDistance = targetPosition.current - startPosition.current;
      const accelerationDistance = totalDistance * 0.2;
      const constantSpeedDistance = totalDistance * 0.6;
      const decelerationDistance = totalDistance * 0.2;
      
      currentPosition = startPosition.current + accelerationDistance + constantSpeedDistance + (easedProgress * decelerationDistance);
      
    }
    // Animation complete - LOCK position and STOP completely
    else {
      currentPosition = targetPosition.current;
      setAnimationPhase('completed');
      setIsAnimating(false);
      hasStartedAnimation.current = false;
      
      // CRITICAL: Save final position and MAINTAIN it
      localStorage.setItem('rouletteReelPosition', currentPosition.toString());
      
      console.log('✅ Animation Complete - Position LOCKED:', {
        totalDuration: elapsed,
        exactDuration: TOTAL_ANIMATION_DURATION_MS,
        finalPosition: Math.round(currentPosition),
        positionSaved: true,
        staysHereUntilNextSpin: true
      });
      
      // Show winning glow
      setShowWinningGlow(true);
      setTimeout(() => setShowWinningGlow(false), 2000);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }

    // Update position smoothly
    setTranslateX(currentPosition);

    // Continue animation until exactly 4 seconds
    animationRef.current = requestAnimationFrame(animate);
  }, [animationPhase]);

  // 🚀 Animation trigger - SINGLE ANIMATION PER SPINNING PHASE ONLY
  useEffect(() => {
    // STRICT SINGLE ANIMATION: Only start when spinning phase begins
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 Starting SINGLE 4-Second RIGHT-TO-LEFT Spin');
      
      const target = calculateTargetPosition(winningSlot, translateX);
      targetPosition.current = target;
      startPosition.current = translateX; // Start from current position
      animationStartTime.current = Date.now();
      
      // LOCK animation flags to prevent re-triggers
      hasStartedAnimation.current = true;
      setIsAnimating(true);
      setAnimationPhase('accelerating');
      setShowWinningGlow(false);
      
      // Start single animation loop
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Single Spin Started:', {
        startPosition: Math.round(startPosition.current),
        targetPosition: Math.round(target),
        winningSlot,
        totalDistance: Math.round(Math.abs(target - startPosition.current)),
        direction: 'RIGHT → LEFT ONLY',
        guaranteedSingleAnimation: true
      });
      
    }
    // When spinning stops, clean up flags for next round
    else if (!isSpinning && hasStartedAnimation.current) {
      console.log('🛑 Spinning phase ended - cleaning up for next round');
      // Clean reset for next round
      hasStartedAnimation.current = false;
    }
    // Ensure idle state when not spinning
    else if (!isSpinning && !isAnimating && !hasStartedAnimation.current) {
      if (animationPhase !== 'idle' && animationPhase !== 'completed') {
        setAnimationPhase('idle');
      }
    }
  }, [isSpinning, winningSlot]); // REMOVED problematic dependencies

  // 🔄 Server synchronization - ONLY when completely idle
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isSpinning && 
        !isAnimating && 
        (animationPhase === 'idle' || animationPhase === 'completed') &&
        !hasStartedAnimation.current) {
      
      console.log('🔄 Server sync (betting phase only):', synchronizedPosition);
      setTranslateX(synchronizedPosition);
      localStorage.setItem('rouletteReelPosition', synchronizedPosition.toString());
    }
  }, [synchronizedPosition, isSpinning, isAnimating, animationPhase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 🎨 Get tile color classes
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-green-500 to-green-600 border-green-400 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500 text-white';
      default: return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  return (
    <div className="flex justify-center w-full">
      {/* 🧱 IMMUTABLE FIXED-WIDTH CONTAINER */}
      <div 
        className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        style={{ 
          width: `${REEL_VIEWPORT_WIDTH_PX}px`,
          height: `${REEL_HEIGHT_PX}px`,
          minWidth: `${REEL_VIEWPORT_WIDTH_PX}px`,
          maxWidth: `${REEL_VIEWPORT_WIDTH_PX}px`,
          minHeight: `${REEL_HEIGHT_PX}px`,
          maxHeight: `${REEL_HEIGHT_PX}px`
        }}
      >
        {/* 🎯 Center marker - FIXED POSITION */}
        <div 
          className="absolute inset-y-0 z-30 pointer-events-none"
          style={{ 
            left: `${REEL_VIEWPORT_WIDTH_PX / 2}px`,
            transform: 'translateX(-0.5px)',
            width: '1px'
          }}
        >
          <div 
            className="absolute top-0 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-emerald-400"
            style={{ left: '-4px' }}
          ></div>
          
          <div 
            className="absolute bottom-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-400"
            style={{ left: '-4px' }}
          ></div>
          
          <div className="absolute inset-y-0 w-0.5 bg-emerald-400"></div>
          
          <div className="absolute inset-y-0 w-1 bg-emerald-400/20 blur-sm" style={{ left: '-2px' }}></div>
        </div>

        {/* 🎞️ Reel - ONLY MOVES RIGHT TO LEFT */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {tiles.map((tile) => {
            // Calculate if this tile is under the center marker
            const tileLeftEdge = tile.index * TILE_SIZE_PX;
            const tileCenter = tileLeftEdge + TILE_SIZE_PX / 2;
            const viewportCenter = REEL_VIEWPORT_WIDTH_PX / 2;
            const tileCenterOnScreen = tileCenter + translateX;
            const distanceFromCenter = Math.abs(tileCenterOnScreen - viewportCenter);
            const isUnderCenter = distanceFromCenter < TILE_SIZE_PX / 3;
            const isWinningTile = tile.slot === winningSlot && isUnderCenter && (animationPhase === 'completed' || (!isSpinning && !isAnimating));
            const isWinningGlow = isWinningTile && showWinningGlow;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 flex items-center justify-center
                  border-2 shadow-lg transition-all duration-200
                  ${getTileColor(tile.color)}
                  ${isUnderCenter ? 'scale-110 z-10' : ''}
                  ${isWinningTile ? 'z-20' : ''}
                  ${isWinningGlow ? 'ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 animate-pulse' : ''}
                `}
                style={{ 
                  width: `${TILE_SIZE_PX}px`,
                  height: `${TILE_SIZE_PX}px`,
                  minWidth: `${TILE_SIZE_PX}px`,
                  maxWidth: `${TILE_SIZE_PX}px`,
                  minHeight: `${TILE_SIZE_PX}px`,
                  maxHeight: `${TILE_SIZE_PX}px`,
                  backfaceVisibility: 'hidden'
                }}
              >
                <div className={`text-xl font-bold drop-shadow-lg transition-all duration-200 ${
                  isWinningGlow ? 'text-emerald-200 scale-125' : 
                  isWinningTile ? 'text-emerald-200 scale-110' : 
                  isUnderCenter ? 'scale-110' : ''
                }`}>
                  {tile.slot}
                </div>
              </div>
            );
          })}
        </div>

        {/* 📐 Debug overlay (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
            <div>Phase: {animationPhase}</div>
            <div>Position: {Math.round(translateX)}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            <div>Animating: {isAnimating ? 'YES' : 'NO'}</div>
            <div>Started: {hasStartedAnimation.current ? 'YES' : 'NO'}</div>
            <div>Winning: {winningSlot}</div>
            <div>Direction: RIGHT → LEFT ONLY</div>
            <div className={`font-bold ${!isSpinning && !isAnimating ? 'text-green-400' : 'text-yellow-400'}`}>
              Status: {!isSpinning && !isAnimating ? 'MOTIONLESS' : 'MOVING'}
            </div>
          </div>
        )}

        {/* 🎯 Visual state indicator */}
        <div className="absolute top-2 right-2 z-40">
          {!isSpinning && !isAnimating && (
            <div className="bg-green-500/20 border border-green-400 text-green-400 px-2 py-1 rounded text-xs font-bold">
              BETTING PHASE - REEL LOCKED
            </div>
          )}
          {isSpinning && isAnimating && (
            <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-400 px-2 py-1 rounded text-xs font-bold animate-pulse">
              SPINNING - SINGLE ANIMATION
            </div>
          )}
        </div>
      </div>
    </div>
  );
}