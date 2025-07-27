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

// 🎯 Easing functions
const easeInQuad = (t: number): number => t * t;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(() => {
    // Initialize from localStorage or default to 0
    const savedPosition = localStorage.getItem('rouletteReelPosition');
    return savedPosition ? parseInt(savedPosition, 10) : 0;
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

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, isAnimating, animationPhase });

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
  const calculateTargetPosition = useCallback((slot: number): number => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }

    // Find the center instance of the winning slot in the buffer
    const centerRepeat = Math.floor(BUFFER_TILES_COUNT / 2);
    const winningTileAbsoluteIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    
    // Calculate the position where the winning tile is perfectly centered under the marker
    const winningTileLeftEdge = winningTileAbsoluteIndex * TILE_SIZE_PX;
    const winningTileCenter = winningTileLeftEdge + (TILE_SIZE_PX / 2);
    const viewportCenter = REEL_VIEWPORT_WIDTH_PX / 2;
    
    // Calculate offset to center the winning tile under the marker
    const targetOffset = Math.round(viewportCenter - winningTileCenter);

    console.log('🎯 Target Position Calculation:', {
      slot,
      slotIndex,
      winningTileAbsoluteIndex,
      winningTileLeftEdge,
      winningTileCenter,
      viewportCenter,
      targetOffset,
      verification: {
        finalTileCenter: winningTileCenter + targetOffset,
        shouldEqual: viewportCenter,
        isExact: Math.abs((winningTileCenter + targetOffset) - viewportCenter) < 1
      }
    });

    return targetOffset;
  }, []);

  // 🎞️ Three-phase animation function
  const animate = useCallback(() => {
    const elapsed = Date.now() - animationStartTime.current;
    let currentPosition = startPosition.current;
    let newPhase = animationPhase;

    // Phase 1: Acceleration (0-800ms)
    if (elapsed <= PHASE_1_ACCELERATION_MS) {
      if (animationPhase !== 'phase1') {
        newPhase = 'phase1';
        setAnimationPhase('phase1');
      }
      
      const phase1Progress = elapsed / PHASE_1_ACCELERATION_MS;
      const easedProgress = easeInQuad(phase1Progress);
      
      // Move 80+ tiles during acceleration for realistic effect
      const phase1Distance = 80 * TILE_SIZE_PX;
      currentPosition = startPosition.current - (easedProgress * phase1Distance);
      phase2StartPosition.current = currentPosition;
      
    }
    // Phase 2: Constant Speed (800-2500ms)
    else if (elapsed <= PHASE_1_ACCELERATION_MS + PHASE_2_CONSTANT_SPEED_MS) {
      if (animationPhase !== 'phase2') {
        newPhase = 'phase2';
        setAnimationPhase('phase2');
      }
      
      const phase2Elapsed = elapsed - PHASE_1_ACCELERATION_MS;
      const phase2Progress = phase2Elapsed / PHASE_2_CONSTANT_SPEED_MS;
      
      // Linear movement at constant speed - cover lots of distance
      const phase2Distance = 120 * TILE_SIZE_PX;
      currentPosition = phase2StartPosition.current - (phase2Progress * phase2Distance);
      phase3StartPosition.current = currentPosition;
      
    }
    // Phase 3: Deceleration (2500-4000ms)
    else if (elapsed <= TOTAL_ANIMATION_DURATION_MS) {
      if (animationPhase !== 'phase3') {
        newPhase = 'phase3';
        setAnimationPhase('phase3');
      }
      
      const phase3Elapsed = elapsed - PHASE_1_ACCELERATION_MS - PHASE_2_CONSTANT_SPEED_MS;
      const phase3Progress = phase3Elapsed / PHASE_3_DECELERATION_MS;
      const easedProgress = easeOutCubic(phase3Progress);
      
      // Decelerate to exact target position
      const remainingDistance = targetPosition.current - phase3StartPosition.current;
      currentPosition = phase3StartPosition.current + (easedProgress * remainingDistance);
      
    }
    // Animation complete
    else {
      currentPosition = targetPosition.current;
      setAnimationPhase('completed');
      setIsAnimating(false);
      hasStartedAnimation.current = false;
      
      // Save final position
      localStorage.setItem('rouletteReelPosition', Math.round(currentPosition).toString());
      
      console.log('✅ Animation Complete:', {
        totalDuration: elapsed,
        targetDuration: TOTAL_ANIMATION_DURATION_MS,
        finalPosition: Math.round(currentPosition),
        targetPosition: targetPosition.current,
        accuracy: Math.abs(currentPosition - targetPosition.current)
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

    // Update position (rounded to prevent sub-pixel drift)
    setTranslateX(Math.round(currentPosition));

    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, [animationPhase]);

  // 🚀 Main animation trigger
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 Starting 3-Phase Roulette Animation');
      
      // Calculate target and set up animation
      const target = calculateTargetPosition(winningSlot);
      targetPosition.current = target;
      startPosition.current = translateX;
      animationStartTime.current = Date.now();
      
      // Set flags and start
      hasStartedAnimation.current = true;
      setIsAnimating(true);
      setAnimationPhase('phase1');
      setShowWinningGlow(false);
      
      // Start animation loop
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Animation Setup:', {
        startPosition: startPosition.current,
        targetPosition: target,
        winningSlot,
        totalDistance: Math.abs(target - startPosition.current)
      });
      
    } else if (!isSpinning && isAnimating) {
      // Spinning stopped but animation might still be running
      console.log('🛑 Spin ended, letting animation complete naturally');
    } else if (!isSpinning && !isAnimating) {
      // Reset to idle state
      setAnimationPhase('idle');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }
  }, [isSpinning, winningSlot, isAnimating, calculateTargetPosition, animate, translateX]);

  // 🔄 Server synchronization (only when idle)
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isSpinning && 
        !isAnimating && 
        animationPhase === 'idle' &&
        !hasStartedAnimation.current) {
      
      console.log('🔄 Server sync:', synchronizedPosition);
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

        {/* 🎞️ Reel with tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none',
            willChange: 'transform'
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
                  maxHeight: `${TILE_SIZE_PX}px`
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