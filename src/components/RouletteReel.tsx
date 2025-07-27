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

// 🎰 ROULETTE CONSTANTS
const TILE_SIZE_PX = 100;
const VISIBLE_TILE_COUNT = 15;
const REEL_WIDTH_PX = TILE_SIZE_PX * VISIBLE_TILE_COUNT; // 1500px
const REEL_HEIGHT_PX = 120;
const VERTICAL_LINE_PX = REEL_WIDTH_PX / 2; // 750px - fixed vertical line position
const WHEEL_SIZE_PX = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px per wheel rotation
const BUFFER_CYCLES = 100; // Generate 100 wheel cycles for smooth animation

// ⏱️ ANIMATION CONFIGURATION
const SPINNING_DURATION_MS = 4000; // Exactly 4 seconds for spinning phase
const TARGET_FPS = 60;
const FRAME_TIME_MS = 1000 / TARGET_FPS; // 16.67ms per frame

// 🎯 Smooth easing function for natural roulette physics
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
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
  
  // Position tracking
  const previousPosition = useRef<number>(currentPosition);
  const positionChangeCount = useRef<number>(0);

  // Track position changes for debugging
  useEffect(() => {
    if (Math.abs(currentPosition - previousPosition.current) > 0.01) {
      positionChangeCount.current++;
      const change = currentPosition - previousPosition.current;
      console.log(`📍 Position changed #${positionChangeCount.current}:`, {
        from: Math.round(previousPosition.current),
        to: Math.round(currentPosition),
        change: Math.round(change),
        isAnimating,
        isSpinning,
        cause: isAnimating ? 'ANIMATION' : 'OTHER'
      });
      previousPosition.current = currentPosition;
    }
  }, [currentPosition, isAnimating, isSpinning]);

  console.log('🎰 Roulette State:', {
    isSpinning,
    winningSlot,
    currentPosition: Math.round(currentPosition),
    isAnimating,
    positionStable: !isAnimating && !isSpinning
  });

  // Generate tile array with buffer cycles
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

  // 🧮 Calculate target position for winning number
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
    
    for (const tile of tiles) {
      if (tile.slot === winningNumber) {
        // Calculate where vertical line would be if this tile is the target
        const tileLeftEdge = tile.leftPosition;
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
  }, [tiles]);

  // 🎬 PRECISELY TIMED 4-second animation loop
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
      
      // PERMANENTLY save position - this will never change until next animation
      localStorage.setItem('roulettePosition', finalPosition.toString());
      
      console.log('✅ Animation Complete - POSITION PERMANENTLY LOCKED:', {
        actualDuration: Math.round(elapsed),
        targetDuration: SPINNING_DURATION_MS,
        durationAccuracy: Math.abs(elapsed - SPINNING_DURATION_MS),
        finalPosition: Math.round(finalPosition),
        positionAccuracy: Math.abs(finalPosition - animationTargetPosition.current),
        isExactly4Seconds: Math.abs(elapsed - 4000) < 50, // Within 50ms tolerance
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

    // Calculate animation progress (0 to 1) - EXACTLY based on 4000ms
    const progress = elapsed / SPINNING_DURATION_MS;
    
    // Apply smooth easing to progress
    const easedProgress = easeOutQuart(progress);
    
    // Calculate current position
    const startPos = animationStartPosition.current;
    const targetPos = animationTargetPosition.current;
    const distance = targetPos - startPos;
    const newPosition = startPos + (easedProgress * distance);
    
    setCurrentPosition(newPosition);
    
    // Debug logging every second to verify timing
    if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 16.67) / 1000)) {
      console.log(`🕐 Animation Progress: ${Math.floor(elapsed / 1000) + 1}s / 4s (${Math.round(progress * 100)}%)`);
    }
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // 🚀 Start animation when spinning begins - VALIDATE 4-SECOND TIMING
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasAnimationStarted.current) {
      console.log('🚀 Starting EXACTLY 4-Second Roulette Animation');
      
      // Calculate target position from current position
      const targetPos = calculateTargetPosition(winningSlot, currentPosition);
      
      // Setup animation with PRECISE timing
      const startTime = performance.now();
      animationStartTime.current = startTime;
      lastFrameTime.current = startTime;
      animationStartPosition.current = currentPosition;
      animationTargetPosition.current = targetPos;
      hasAnimationStarted.current = true;
      setIsAnimating(true);
      setShowWinGlow(false);
      
      // Start animation
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 4-Second Animation Started:', {
        startTime: Math.round(startTime),
        startPosition: Math.round(currentPosition),
        targetPosition: Math.round(targetPos),
        totalDistance: Math.round(Math.abs(targetPos - currentPosition)),
        expectedDuration: `${SPINNING_DURATION_MS}ms (4 seconds)`,
        direction: 'RIGHT → LEFT',
        winningNumber: winningSlot
      });
      
      // Set a verification timer to check if animation completes on time
      setTimeout(() => {
        if (isAnimating) {
          console.warn('⚠️ Animation still running after 4.1 seconds - possible timing issue');
        } else {
          console.log('✅ Animation completed within expected timeframe');
        }
      }, SPINNING_DURATION_MS + 100); // Check 100ms after expected completion
    }
    // Reset flag when spinning stops
    else if (!isSpinning && hasAnimationStarted.current) {
      hasAnimationStarted.current = false;
      console.log('🛑 Spinning phase ended - animation flags reset');
    }
  }, [isSpinning, winningSlot, currentPosition, calculateTargetPosition, animate, isAnimating]);

  // 🚫 DISABLED Server synchronization - position is maintained locally only
  // This prevents any teleporting/resetting of the reel position
  useEffect(() => {
    // Server sync is COMPLETELY DISABLED to prevent position resets
    // The reel position is now 100% locally controlled
    if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🚫 Server sync BLOCKED - maintaining local position:', Math.round(currentPosition));
      console.log('🚫 Would have synced to:', synchronizedPosition, 'but keeping current position');
    }
  }, [synchronizedPosition, currentPosition]);

  // 💾 Save position to localStorage whenever it changes (except during animation)
  useEffect(() => {
    if (!isAnimating) {
      localStorage.setItem('roulettePosition', currentPosition.toString());
      console.log('💾 Position saved locally:', Math.round(currentPosition));
    }
  }, [currentPosition, isAnimating]);

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