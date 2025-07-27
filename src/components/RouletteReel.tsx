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

// 🎯 Smoother easing functions for better visual appeal
const easeInQuart = (t: number): number => t * t * t * t;
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(() => {
    // Initialize from localStorage or default to 0
    const savedPosition = localStorage.getItem('rouletteReelPosition');
    return savedPosition ? parseFloat(savedPosition) : 0;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'phase1' | 'phase2' | 'phase3' | 'completed'>('idle');
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Animation refs
  const animationRef = useRef<number>();
  const animationStartTime = useRef<number>(0);
  const startPosition = useRef<number>(0);
  const targetPosition = useRef<number>(0);
  const hasStartedAnimation = useRef<boolean>(false);
  const phase2StartPosition = useRef<number>(0);
  const phase3StartPosition = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX: Math.round(translateX), isAnimating, animationPhase });

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

  // 🧱 Calculate target position for winning slot
  const calculateTargetPosition = useCallback((slot: number, currentPos: number): number => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return currentPos;
    }

    // Calculate how many complete wheel cycles we need to find the best target
    const wheelSize = WHEEL_SLOTS.length * TILE_SIZE_PX;
    const viewportCenter = REEL_VIEWPORT_WIDTH_PX / 2;
    
    // Find the closest instance of the winning slot to our current position
    // We want to ensure we travel at least 50+ wheel cycles for a realistic spin
    const minSpinDistance = 50 * wheelSize; // Minimum distance to travel
    
    // Calculate the base target position for the winning slot
    let bestTargetOffset = Infinity;
    let bestDistance = Infinity;
    
    // Check multiple instances of the winning slot
    for (let cycle = 0; cycle < BUFFER_TILES_COUNT; cycle++) {
      const tileAbsoluteIndex = cycle * WHEEL_SLOTS.length + slotIndex;
      const tileCenter = tileAbsoluteIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
      const targetOffset = viewportCenter - tileCenter;
      
      // Calculate total travel distance from current position
      const totalDistance = Math.abs(targetOffset - currentPos);
      
      // We want a target that's far enough for a good spin
      if (totalDistance >= minSpinDistance && totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestTargetOffset = targetOffset;
      }
    }
    
    // If no good target found, use a fallback
    if (bestTargetOffset === Infinity) {
      const centerRepeat = Math.floor(BUFFER_TILES_COUNT / 2);
      const winningTileAbsoluteIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
      const winningTileCenter = winningTileAbsoluteIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
      bestTargetOffset = viewportCenter - winningTileCenter;
    }

    console.log('🎯 Target Position Calculation:', {
      slot,
      slotIndex,
      currentPosition: Math.round(currentPos),
      targetOffset: Math.round(bestTargetOffset),
      travelDistance: Math.round(Math.abs(bestTargetOffset - currentPos)),
      wheelCycles: Math.round(Math.abs(bestTargetOffset - currentPos) / wheelSize)
    });

    return bestTargetOffset;
  }, []);

  // 🎞️ Smooth three-phase animation function with better interpolation
  const animate = useCallback(() => {
    const currentTime = Date.now();
    const elapsed = currentTime - animationStartTime.current;
    
    // Smooth frame rate limiting for consistent animation
    if (currentTime - lastFrameTime.current < 8) { // ~120fps cap for smoothness
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;
    
    let currentPosition = startPosition.current;
    let newPhase = animationPhase;

    // Phase 1: Smooth Acceleration (0-800ms)
    if (elapsed <= PHASE_1_ACCELERATION_MS) {
      if (animationPhase !== 'phase1') {
        newPhase = 'phase1';
        setAnimationPhase('phase1');
      }
      
      const phase1Progress = elapsed / PHASE_1_ACCELERATION_MS;
      const easedProgress = easeInQuart(phase1Progress); // Smoother acceleration
      
      // Progressive acceleration - starts very slow, builds momentum
      const phase1Distance = 80 * TILE_SIZE_PX;
      currentPosition = startPosition.current - (easedProgress * phase1Distance);
      phase2StartPosition.current = currentPosition;
      
    }
    // Phase 2: Constant High Speed (800-2500ms)
    else if (elapsed <= PHASE_1_ACCELERATION_MS + PHASE_2_CONSTANT_SPEED_MS) {
      if (animationPhase !== 'phase2') {
        newPhase = 'phase2';
        setAnimationPhase('phase2');
      }
      
      const phase2Elapsed = elapsed - PHASE_1_ACCELERATION_MS;
      const phase2Progress = phase2Elapsed / PHASE_2_CONSTANT_SPEED_MS;
      
      // Linear movement at max speed with slight ease for smoothness
      const smoothProgress = easeInOutCubic(phase2Progress * 0.1) * 10 * phase2Progress;
      const phase2Distance = 150 * TILE_SIZE_PX; // Increased distance for more dramatic effect
      currentPosition = phase2StartPosition.current - (smoothProgress * phase2Distance);
      phase3StartPosition.current = currentPosition;
      
    }
    // Phase 3: Smooth Deceleration (2500-4000ms)
    else if (elapsed <= TOTAL_ANIMATION_DURATION_MS) {
      if (animationPhase !== 'phase3') {
        newPhase = 'phase3';
        setAnimationPhase('phase3');
      }
      
      const phase3Elapsed = elapsed - PHASE_1_ACCELERATION_MS - PHASE_2_CONSTANT_SPEED_MS;
      const phase3Progress = phase3Elapsed / PHASE_3_DECELERATION_MS;
      const easedProgress = easeOutQuart(phase3Progress); // Smoother deceleration
      
      // Smooth deceleration to exact target position
      const remainingDistance = targetPosition.current - phase3StartPosition.current;
      currentPosition = phase3StartPosition.current + (easedProgress * remainingDistance);
      
    }
    // Animation complete - KEEP FINAL POSITION
    else {
      currentPosition = targetPosition.current;
      setAnimationPhase('completed');
      setIsAnimating(false);
      hasStartedAnimation.current = false;
      
      // Save final position for next round to start from here
      localStorage.setItem('rouletteReelPosition', currentPosition.toString());
      
      console.log('✅ Animation Complete - Position Maintained:', {
        totalDuration: elapsed,
        targetDuration: TOTAL_ANIMATION_DURATION_MS,
        finalPosition: Math.round(currentPosition),
        targetPosition: Math.round(targetPosition.current),
        accuracy: Math.abs(currentPosition - targetPosition.current),
        savedForNextRound: true
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

    // Update position with sub-pixel precision for smoothness
    setTranslateX(currentPosition);

    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [animationPhase]);

  // 🚀 Main animation trigger - starts from current position
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 Starting Animation from Current Position');
      
      // Calculate target from current position (not reset)
      const target = calculateTargetPosition(winningSlot, translateX);
      targetPosition.current = target;
      startPosition.current = translateX; // Start from wherever we are now
      animationStartTime.current = Date.now();
      lastFrameTime.current = Date.now();
      
      // Set flags and start
      hasStartedAnimation.current = true;
      setIsAnimating(true);
      setAnimationPhase('phase1');
      setShowWinningGlow(false);
      
      // Start animation loop
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Animation Setup - Continuous Position:', {
        startPosition: Math.round(startPosition.current),
        targetPosition: Math.round(target),
        winningSlot,
        totalDistance: Math.round(Math.abs(target - startPosition.current)),
        continuousPlay: true
      });
      
    } else if (!isSpinning && isAnimating) {
      // Spinning stopped but animation might still be running - let it complete
      console.log('🛑 Spin ended, letting animation complete naturally');
    } else if (!isSpinning && !isAnimating) {
      // Reset to idle state but DON'T reset position
      setAnimationPhase('idle');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }
  }, [isSpinning, winningSlot, isAnimating, calculateTargetPosition, animate, translateX]);

  // 🔄 Server synchronization (only when completely idle)
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isSpinning && 
        !isAnimating && 
        animationPhase === 'idle' &&
        !hasStartedAnimation.current) {
      
      console.log('🔄 Server sync (idle only):', synchronizedPosition);
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
            transform: 'translateX(-0.5px)', // Center the 1px line
            width: '1px'
          }}
        >
          {/* Top arrow */}
          <div 
            className="absolute top-0 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-emerald-400"
            style={{ left: '-4px' }}
          ></div>
          
          {/* Bottom arrow */}
          <div 
            className="absolute bottom-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-400"
            style={{ left: '-4px' }}
          ></div>
          
          {/* Center line */}
          <div className="absolute inset-y-0 w-0.5 bg-emerald-400"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-y-0 w-1 bg-emerald-400/20 blur-sm" style={{ left: '-2px' }}></div>
        </div>

        {/* 🎞️ Reel with tiles - SMOOTH TRANSFORMS */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none',
            willChange: 'transform',
            backfaceVisibility: 'hidden', // Improve rendering performance
            perspective: '1000px' // Enable hardware acceleration
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
                  backfaceVisibility: 'hidden' // Improve tile rendering
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
          </div>
        )}
      </div>
    </div>
  );
}