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

// ⏱️ 3-PHASE ANIMATION TIMING (4000ms total)
const TOTAL_ANIMATION_DURATION_MS = 4000;
const PHASE_1_ACCELERATION_MS = 800;
const PHASE_2_CONSTANT_SPEED_MS = 1700;
const PHASE_3_DECELERATION_MS = 1500;

// Validate timing adds up to 4 seconds
if (PHASE_1_ACCELERATION_MS + PHASE_2_CONSTANT_SPEED_MS + PHASE_3_DECELERATION_MS !== TOTAL_ANIMATION_DURATION_MS) {
  throw new Error('Animation phases must sum to 4000ms');
}

// 🎯 Realistic easing functions for natural physics
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
    animationPhase,
    hasStarted: hasStartedAnimation.current 
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

  // 🧱 Calculate target position for winning slot (RIGHT TO LEFT movement)
  const calculateTargetPosition = useCallback((slot: number, currentPos: number): number => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return currentPos;
    }

    const viewportCenter = REEL_VIEWPORT_WIDTH_PX / 2; // 750px
    const wheelSize = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px per wheel cycle
    
    // We want to travel several wheel cycles to the left (negative direction)
    // Find a target that's far enough to the left for a good spin
    const minSpinCycles = 50; // Minimum 50 wheel cycles
    const spinDistance = minSpinCycles * wheelSize; // How far to travel left
    
    // Calculate where we want to end up after spinning left
    const targetEndPosition = currentPos - spinDistance;
    
    // Find the nearest winning slot position at or beyond our target
    let bestTargetPosition = targetEndPosition;
    let closestDistance = Infinity;
    
    // Check multiple instances of the winning slot around our target area
    for (let cycle = 0; cycle < BUFFER_TILES_COUNT; cycle++) {
      const tileAbsoluteIndex = cycle * WHEEL_SLOTS.length + slotIndex;
      const tileCenter = tileAbsoluteIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
      const targetOffset = viewportCenter - tileCenter;
      
      // Check if this position is in our target range
      const distanceFromTarget = Math.abs(targetOffset - targetEndPosition);
      
      if (targetOffset <= targetEndPosition && distanceFromTarget < closestDistance) {
        closestDistance = distanceFromTarget;
        bestTargetPosition = targetOffset;
      }
    }

    console.log('🎯 Target Calculation (RIGHT to LEFT):', {
      slot,
      slotIndex,
      currentPosition: Math.round(currentPos),
      targetPosition: Math.round(bestTargetPosition),
      spinDistance: Math.round(Math.abs(bestTargetPosition - currentPos)),
      direction: 'RIGHT → LEFT',
      wheelCycles: Math.round(Math.abs(bestTargetPosition - currentPos) / wheelSize)
    });

    return bestTargetPosition;
  }, []);

  // 🎞️ Realistic 3-phase animation with natural physics
  const animate = useCallback(() => {
    const currentTime = Date.now();
    const elapsed = currentTime - animationStartTime.current;
    
    let currentPosition = startPosition.current;
    let newPhase = animationPhase;

    // Phase 1: Rapid Acceleration (0-800ms)
    if (elapsed <= PHASE_1_ACCELERATION_MS) {
      if (animationPhase !== 'accelerating') {
        setAnimationPhase('accelerating');
      }
      
      const progress = elapsed / PHASE_1_ACCELERATION_MS;
      const easedProgress = easeInCubic(progress); // Rapid acceleration
      
      // Calculate how much to move during acceleration
      const totalDistance = targetPosition.current - startPosition.current;
      const accelerationDistance = totalDistance * 0.2; // 20% of total distance in acceleration
      
      currentPosition = startPosition.current + (easedProgress * accelerationDistance);
      
    }
    // Phase 2: High Speed (800-2500ms)
    else if (elapsed <= PHASE_1_ACCELERATION_MS + PHASE_2_CONSTANT_SPEED_MS) {
      if (animationPhase !== 'spinning') {
        setAnimationPhase('spinning');
      }
      
      const phase2Elapsed = elapsed - PHASE_1_ACCELERATION_MS;
      const progress = phase2Elapsed / PHASE_2_CONSTANT_SPEED_MS;
      
      // Linear movement at high speed
      const totalDistance = targetPosition.current - startPosition.current;
      const accelerationDistance = totalDistance * 0.2;
      const constantSpeedDistance = totalDistance * 0.6; // 60% of distance at constant speed
      
      currentPosition = startPosition.current + accelerationDistance + (progress * constantSpeedDistance);
      
    }
    // Phase 3: Smooth Deceleration (2500-4000ms)
    else if (elapsed <= TOTAL_ANIMATION_DURATION_MS) {
      if (animationPhase !== 'decelerating') {
        setAnimationPhase('decelerating');
      }
      
      const phase3Elapsed = elapsed - PHASE_1_ACCELERATION_MS - PHASE_2_CONSTANT_SPEED_MS;
      const progress = phase3Elapsed / PHASE_3_DECELERATION_MS;
      const easedProgress = easeOutCubic(progress); // Natural deceleration
      
      // Final 20% of distance with deceleration
      const totalDistance = targetPosition.current - startPosition.current;
      const accelerationDistance = totalDistance * 0.2;
      const constantSpeedDistance = totalDistance * 0.6;
      const decelerationDistance = totalDistance * 0.2;
      
      currentPosition = startPosition.current + accelerationDistance + constantSpeedDistance + (easedProgress * decelerationDistance);
      
    }
    // Animation complete - STOP at exact target
    else {
      currentPosition = targetPosition.current;
      setAnimationPhase('completed');
      setIsAnimating(false);
      hasStartedAnimation.current = false;
      
      // Save final position for next round
      localStorage.setItem('rouletteReelPosition', currentPosition.toString());
      
      console.log('✅ Animation Complete - Position Locked:', {
        totalDuration: elapsed,
        finalPosition: Math.round(currentPosition),
        targetPosition: Math.round(targetPosition.current),
        accuracy: Math.abs(currentPosition - targetPosition.current),
        nextRoundStartsFrom: Math.round(currentPosition)
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

    // Update position with smooth precision
    setTranslateX(currentPosition);

    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [animationPhase]);

  // 🚀 Animation trigger - ONLY when spinning starts
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 Starting RIGHT-TO-LEFT Spin from Current Position');
      
      // Calculate target from current position
      const target = calculateTargetPosition(winningSlot, translateX);
      targetPosition.current = target;
      startPosition.current = translateX; // Start exactly where we are
      animationStartTime.current = Date.now();
      
      // Set flags and start
      hasStartedAnimation.current = true;
      setIsAnimating(true);
      setAnimationPhase('accelerating');
      setShowWinningGlow(false);
      
      // Start animation loop
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Spin Setup:', {
        startPosition: Math.round(startPosition.current),
        targetPosition: Math.round(target),
        winningSlot,
        totalDistance: Math.round(Math.abs(target - startPosition.current)),
        direction: target < startPosition.current ? 'LEFT' : 'RIGHT'
      });
      
    } else if (!isSpinning && isAnimating) {
      // Spinning stopped but animation might still be running - let it complete naturally
      console.log('🛑 Spin phase ended, letting animation complete');
    } else if (!isSpinning && !isAnimating) {
      // Completely idle - reset animation phase but keep position
      if (animationPhase !== 'idle' && animationPhase !== 'completed') {
        setAnimationPhase('idle');
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }
  }, [isSpinning, winningSlot, isAnimating, calculateTargetPosition, animate, translateX, animationPhase]);

  // 🔄 Server synchronization (only when completely idle)
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isSpinning && 
        !isAnimating && 
        animationPhase === 'idle' &&
        !hasStartedAnimation.current) {
      
      console.log('🔄 Server sync (when idle):', synchronizedPosition);
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

        {/* 🎞️ Reel with tiles - RIGHT TO LEFT MOVEMENT */}
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
            const isWinningTile = tile.slot === winningSlot && isUnderCenter && animationPhase === 'completed';
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
            <div>Target: {Math.round(targetPosition.current)}</div>
            <div>Winning: {winningSlot}</div>
            <div>Direction: RIGHT → LEFT</div>
          </div>
        )}
      </div>
    </div>
  );
}