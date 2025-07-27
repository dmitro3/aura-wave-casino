import { useEffect, useState, useRef, useCallback } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
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

// 🎰 ROULETTE CONSTANTS
const TILE_SIZE_PX = 100;
const VISIBLE_TILE_COUNT = 15;
const REEL_WIDTH_PX = TILE_SIZE_PX * VISIBLE_TILE_COUNT; // 1500px
const REEL_HEIGHT_PX = 120;
const VERTICAL_LINE_PX = REEL_WIDTH_PX / 2; // 750px - fixed vertical line position
const WHEEL_SIZE_PX = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px per wheel rotation
const BUFFER_CYCLES = 100; // Generate 100 wheel cycles for smooth animation

// ⏱️ ANIMATION CONFIGURATION - 3 PHASES
const SPINNING_DURATION_MS = 4000; // Exactly 4 seconds for spinning phase
const PHASE_1_ACCELERATION_MS = 800; // 0.8s - slow start, speed up
const PHASE_2_FAST_ROLL_MS = 2400; // 2.4s - roll fast at high speed  
const PHASE_3_DECELERATION_MS = 800; // 0.8s - slow down to stop
const TARGET_FPS = 60;
const FRAME_TIME_MS = 1000 / TARGET_FPS; // 16.67ms per frame

// Validate timing adds up to exactly 4 seconds
if (PHASE_1_ACCELERATION_MS + PHASE_2_FAST_ROLL_MS + PHASE_3_DECELERATION_MS !== SPINNING_DURATION_MS) {
  throw new Error('Animation phases must sum to exactly 4000ms');
}

// 🎯 Easing functions for realistic 3-phase animation
const easeInCubic = (t: number): number => t * t * t;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, extendedWinAnimation }: RouletteReelProps) {
  // Core state
  const [currentPosition, setCurrentPosition] = useState(() => {
    const saved = localStorage.getItem('roulettePosition');
    const initialPos = saved ? parseFloat(saved) : 0;
    console.log('🏁 Initial reel position loaded:', Math.round(initialPos));
    return initialPos;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinGlow, setShowWinGlow] = useState(false);
  
  // Animation state
  const animationRef = useRef<number>();
  const animationStartTime = useRef<number>(0);
  const animationStartPosition = useRef<number>(0);
  const animationTargetPosition = useRef<number>(0);
  const hasAnimationStarted = useRef<boolean>(false);
  const lastFrameTime = useRef<number>(0);
  const positionLocked = useRef<boolean>(false); // Lock position after animation completes
  
  // Position tracking
  const previousPosition = useRef<number>(currentPosition);
  const positionChangeCount = useRef<number>(0);
  const stablePosition = useRef<number>(currentPosition); // Track stable position between rounds

  // Track position changes for debugging
  useEffect(() => {
    if (Math.abs(currentPosition - previousPosition.current) > 0.01) {
      positionChangeCount.current++;
      const change = currentPosition - previousPosition.current;
      
      // Check if position is locked and this is an unexpected change
      const isUnexpectedChange = positionLocked.current && !isAnimating;
      
      console.log(`📍 Position changed #${positionChangeCount.current}:`, {
        from: Math.round(previousPosition.current),
        to: Math.round(currentPosition),
        change: Math.round(change),
        isAnimating,
        isSpinning,
        positionLocked: positionLocked.current,
        cause: isAnimating ? 'ANIMATION' : isUnexpectedChange ? '⚠️ UNEXPECTED - POSITION IS LOCKED!' : 'EXPECTED'
      });
      
      // Warn about unexpected changes
      if (isUnexpectedChange) {
        console.error('🚨 CRITICAL: Position changed while locked! This should never happen.');
      }
      
      previousPosition.current = currentPosition;
      
      // Update stable position only when animation completes
      if (!isAnimating && !isSpinning) {
        stablePosition.current = currentPosition;
        console.log('🔒 Stable position updated:', Math.round(currentPosition));
      }
    }
  }, [currentPosition, isAnimating, isSpinning]);

  console.log('🎰 Roulette State:', {
    isSpinning,
    winningSlot,
    currentPosition: Math.round(currentPosition),
    isAnimating,
    positionStable: !isAnimating && !isSpinning
  });

  // Generate tile array for rendering (but don't use it in calculateTargetPosition)
  const tiles = [];
  for (let cycle = 0; cycle < BUFFER_CYCLES; cycle++) {
    for (let slotIdx = 0; slotIdx < WHEEL_SLOTS.length; slotIdx++) {
      const slot = WHEEL_SLOTS[slotIdx];
      const tileIndex = cycle * WHEEL_SLOTS.length + slotIdx;
      tiles.push({
        id: `tile-${tileIndex}`,
        index: tileIndex,
        slot: slot.slot,
        color: slot.color,
        leftPosition: tileIndex * TILE_SIZE_PX
      });
    }
  }

  // 🧮 Calculate target position for winning number - PURE FUNCTION
  const calculateTargetPosition = useCallback((winningNumber: number, fromPosition: number): number => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningNumber);
    if (slotIndex === -1) {
      console.error('Invalid winning number:', winningNumber);
      return fromPosition;
    }

    // Calculate minimum spin distance (must spin left)
    const minSpinCycles = 20; // Minimum 20 full wheel rotations
    const maxSpinCycles = 40; // Maximum 40 full wheel rotations
    const spinCycles = minSpinCycles + Math.random() * (maxSpinCycles - minSpinCycles);
    const totalSpinDistance = spinCycles * WHEEL_SIZE_PX;

    // Target area after spinning left
    const targetAreaCenter = fromPosition - totalSpinDistance;
    
    // Find the best winning tile near target area
    let bestTargetPosition = null;
    let bestDistance = Infinity;
    
    // Calculate directly without depending on tiles array
    for (let cycle = 0; cycle < BUFFER_CYCLES; cycle++) {
      for (let slotIdx = 0; slotIdx < WHEEL_SLOTS.length; slotIdx++) {
        const slot = WHEEL_SLOTS[slotIdx];
        
        if (slot.slot === winningNumber) {
          // Calculate tile position directly
          const tileIndex = cycle * WHEEL_SLOTS.length + slotIdx;
          const tileLeftEdge = tileIndex * TILE_SIZE_PX;
          const tileRightEdge = tileLeftEdge + TILE_SIZE_PX;
          
          // Random position within the winning tile (not always center)
          const randomOffsetWithinTile = Math.random() * TILE_SIZE_PX;
          const verticalLineOnTile = tileLeftEdge + randomOffsetWithinTile;
          
          // Calculate required position to put vertical line on this spot
          const requiredPosition = VERTICAL_LINE_PX - verticalLineOnTile;
          
          // Check if this position is in our target area (to the left of start)
          if (requiredPosition <= targetAreaCenter) {
            const distanceFromTarget = Math.abs(requiredPosition - targetAreaCenter);
            if (distanceFromTarget < bestDistance) {
              bestDistance = distanceFromTarget;
              bestTargetPosition = requiredPosition;
            }
          }
        }
      }
    }
    
    if (bestTargetPosition === null) {
      console.error('Could not find suitable target position');
      return fromPosition - totalSpinDistance;
    }

    console.log('🎯 Target Position Calculated:', {
      winningNumber,
      fromPosition: Math.round(fromPosition),
      targetPosition: Math.round(bestTargetPosition),
      spinDistance: Math.round(Math.abs(bestTargetPosition - fromPosition)),
      wheelRotations: Math.round(Math.abs(bestTargetPosition - fromPosition) / WHEEL_SIZE_PX)
    });

    return bestTargetPosition;
  }, []); // NO DEPENDENCIES - pure function

  // 🎬 3-PHASE ANIMATION: slow start → speed up → fast roll → slow down
  const animate = useCallback(() => {
    const now = performance.now();
    const elapsed = now - animationStartTime.current;
    
    // Frame rate control for smooth 60fps
    if (now - lastFrameTime.current < FRAME_TIME_MS) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = now;

    // PRECISE timing check - exactly 4000ms
    if (elapsed >= SPINNING_DURATION_MS) {
      // Animation complete - PERMANENTLY lock at exact target position
      const finalPosition = animationTargetPosition.current;
      setCurrentPosition(finalPosition);
      setIsAnimating(false);
      hasAnimationStarted.current = false;
      positionLocked.current = true; // LOCK position until next spin
      
      // PERMANENTLY save position - this will never change until next animation
      localStorage.setItem('roulettePosition', finalPosition.toString());
      
      console.log('✅ 3-Phase Animation Complete - POSITION PERMANENTLY LOCKED:', {
        actualDuration: Math.round(elapsed),
        targetDuration: SPINNING_DURATION_MS,
        durationAccuracy: Math.abs(elapsed - SPINNING_DURATION_MS),
        finalPosition: Math.round(finalPosition),
        positionAccuracy: Math.abs(finalPosition - animationTargetPosition.current),
        positionLocked: true,
        willNeverChangeUntilNextSpin: true
      });
      
      // Show winning effect
      setShowWinGlow(true);
      setTimeout(() => setShowWinGlow(false), 2000);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }

    // Calculate which phase we're in and the position
    const startPos = animationStartPosition.current;
    const targetPos = animationTargetPosition.current;
    const totalDistance = targetPos - startPos;
    let newPosition = startPos;
    let currentPhase = 'accelerating';

    // Phase 1: Acceleration (0-800ms) - slow start, speed up
    if (elapsed <= PHASE_1_ACCELERATION_MS) {
      currentPhase = 'accelerating';
      const progress = elapsed / PHASE_1_ACCELERATION_MS;
      const easedProgress = easeInCubic(progress); // Smooth acceleration
      
      // Move 15% of total distance during acceleration
      const accelerationDistance = totalDistance * 0.15;
      newPosition = startPos + (easedProgress * accelerationDistance);
    }
    // Phase 2: Fast Roll (800-3200ms) - roll fast at high speed
    else if (elapsed <= PHASE_1_ACCELERATION_MS + PHASE_2_FAST_ROLL_MS) {
      currentPhase = 'fast-rolling';
      const phaseElapsed = elapsed - PHASE_1_ACCELERATION_MS;
      const progress = phaseElapsed / PHASE_2_FAST_ROLL_MS;
      
      // Linear movement at high speed - cover 70% of distance
      const accelerationDistance = totalDistance * 0.15;
      const fastRollDistance = totalDistance * 0.70;
      newPosition = startPos + accelerationDistance + (progress * fastRollDistance);
    }
    // Phase 3: Deceleration (3200-4000ms) - slow down to stop
    else if (elapsed <= SPINNING_DURATION_MS) {
      currentPhase = 'decelerating';
      const phaseElapsed = elapsed - PHASE_1_ACCELERATION_MS - PHASE_2_FAST_ROLL_MS;
      const progress = phaseElapsed / PHASE_3_DECELERATION_MS;
      const easedProgress = easeOutCubic(progress); // Smooth deceleration
      
      // Final 15% of distance with smooth deceleration
      const accelerationDistance = totalDistance * 0.15;
      const fastRollDistance = totalDistance * 0.70;
      const decelerationDistance = totalDistance * 0.15;
      newPosition = startPos + accelerationDistance + fastRollDistance + (easedProgress * decelerationDistance);
    }
    
    setCurrentPosition(newPosition);
    
    // Debug logging every second to verify timing and phases
    const currentSecond = Math.floor(elapsed / 1000);
    const previousSecond = Math.floor((elapsed - 16.67) / 1000);
    if (currentSecond !== previousSecond) {
      console.log(`🕐 Phase ${currentSecond + 1}/4: ${currentPhase} (${Math.round((elapsed / SPINNING_DURATION_MS) * 100)}%)`);
    }
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // 🚀 Start animation when spinning begins - STABLE POSITION + 3-PHASE ANIMATION
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasAnimationStarted.current) {
      console.log('🚀 Starting 3-Phase Roulette Animation (4 seconds total)');
      
      // Capture current position at the EXACT moment spinning starts
      const startingPosition = currentPosition;
      
      // Calculate target position from captured starting position
      const targetPos = calculateTargetPosition(winningSlot, startingPosition);
      
      // Setup animation with PRECISE timing
      const startTime = performance.now();
      animationStartTime.current = startTime;
      lastFrameTime.current = startTime;
      animationStartPosition.current = startingPosition; // Use captured position
      animationTargetPosition.current = targetPos;
      hasAnimationStarted.current = true;
      setIsAnimating(true);
      setShowWinGlow(false);
      positionLocked.current = false; // Unlock position for new spin
      
      // Start animation
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 3-Phase Animation Started:', {
        startTime: Math.round(startTime),
        startPosition: Math.round(startingPosition),
        targetPosition: Math.round(targetPos),
        totalDistance: Math.round(Math.abs(targetPos - startingPosition)),
        phases: {
          acceleration: `0-${PHASE_1_ACCELERATION_MS}ms (15% distance)`,
          fastRoll: `${PHASE_1_ACCELERATION_MS}-${PHASE_1_ACCELERATION_MS + PHASE_2_FAST_ROLL_MS}ms (70% distance)`,
          deceleration: `${PHASE_1_ACCELERATION_MS + PHASE_2_FAST_ROLL_MS}-${SPINNING_DURATION_MS}ms (15% distance)`
        },
        direction: 'RIGHT → LEFT',
        winningNumber: winningSlot,
        positionContinuousFromPreviousRound: true
      });
      
      // Set a verification timer to check if animation completes on time
      setTimeout(() => {
        if (isAnimating) {
          console.warn('⚠️ Animation still running after 4.1 seconds - possible timing issue');
        } else {
          console.log('✅ 3-Phase animation completed within expected timeframe');
        }
      }, SPINNING_DURATION_MS + 100); // Check 100ms after expected completion
    }
    // Reset flag when spinning stops
    else if (!isSpinning && hasAnimationStarted.current) {
      hasAnimationStarted.current = false;
      console.log('🛑 Spinning phase ended - position remains stable until next round');
    }
  }, [isSpinning, winningSlot, calculateTargetPosition, animate]); // STABLE DEPENDENCIES

  // 💾 Save position to localStorage only when animation completes (not during animation)
  useEffect(() => {
    if (!isAnimating && !isSpinning) {
      localStorage.setItem('roulettePosition', currentPosition.toString());
      console.log('💾 Position permanently saved:', Math.round(currentPosition));
    }
  }, [currentPosition, isAnimating, isSpinning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 🎨 Tile styling
  const getTileStyle = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-green-500 to-green-600 border-green-400 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500 text-white';
      default: return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  return (
    <div className="flex justify-center w-full">
      {/* 🎰 ROULETTE CONTAINER */}
      <div 
        className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        style={{ 
          width: `${REEL_WIDTH_PX}px`,
          height: `${REEL_HEIGHT_PX}px`
        }}
      >
        {/* 🎯 FIXED VERTICAL LINE */}
        <div 
          className="absolute inset-y-0 z-30 pointer-events-none bg-emerald-400 opacity-80"
          style={{ 
            left: `${VERTICAL_LINE_PX}px`,
            width: '2px',
            transform: 'translateX(-1px)'
          }}
        >
          {/* Top arrow */}
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '8px solid #10b981'
            }}
          />
          
          {/* Bottom arrow */}
          <div 
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '8px solid #10b981'
            }}
          />
        </div>

        {/* 🎡 SPINNING REEL */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${currentPosition}px)`,
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Check if vertical line intersects with this tile
            const tileScreenLeft = tile.leftPosition + currentPosition;
            const tileScreenRight = tileScreenLeft + TILE_SIZE_PX;
            const isUnderLine = tileScreenLeft <= VERTICAL_LINE_PX && tileScreenRight >= VERTICAL_LINE_PX;
            const isWinningTile = isUnderLine && tile.slot === winningSlot && !isAnimating;
            const hasWinGlow = isWinningTile && showWinGlow;

            return (
              <div
                key={tile.id}
                className={`
                  flex-shrink-0 flex items-center justify-center
                  border-2 shadow-lg transition-all duration-200
                  ${getTileStyle(tile.color)}
                  ${isUnderLine && !isAnimating ? 'scale-105 z-10' : ''}
                  ${hasWinGlow ? 'ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 scale-110 z-20' : ''}
                `}
                style={{ 
                  width: `${TILE_SIZE_PX}px`,
                  height: `${TILE_SIZE_PX}px`,
                  minWidth: `${TILE_SIZE_PX}px`
                }}
              >
                <span className={`text-xl font-bold drop-shadow-lg transition-all duration-200 ${
                  hasWinGlow ? 'text-emerald-200 scale-125' : 
                  isWinningTile ? 'text-emerald-200 scale-110' : ''
                }`}>
                  {tile.slot}
                </span>
              </div>
            );
          })}
        </div>

        {/* 📊 STATUS INDICATOR */}
        <div className="absolute top-2 right-2 z-40">
          {!isSpinning && !isAnimating && (
            <div className="bg-green-500/20 border border-green-400 text-green-400 px-3 py-1 rounded text-sm font-bold">
              READY
            </div>
          )}
          {isSpinning && isAnimating && (
            <div className="bg-red-500/20 border border-red-400 text-red-400 px-3 py-1 rounded text-sm font-bold animate-pulse">
              SPINNING...
            </div>
          )}
          {!isSpinning && isAnimating && (
            <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-400 px-3 py-1 rounded text-sm font-bold">
              FINISHING...
            </div>
          )}
        </div>

        {/* 🔧 DEBUG INFO - TIMING VALIDATION */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs p-2 rounded">
            <div>Position: {Math.round(currentPosition)}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            <div>Animating: {isAnimating ? 'YES' : 'NO'}</div>
            <div>Winning: {winningSlot || 'N/A'}</div>
            <div>Rotations: {Math.round(Math.abs(currentPosition) / WHEEL_SIZE_PX)}</div>
            {isAnimating && (
              <div className="text-yellow-300 font-bold">
                Timer: {Math.min(Math.round((performance.now() - animationStartTime.current) / 1000 * 10) / 10, 4.0)}s / 4.0s
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}