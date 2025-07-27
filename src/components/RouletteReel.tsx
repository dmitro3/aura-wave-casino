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
    return saved ? parseFloat(saved) : 0;
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

  console.log('🎰 Roulette State:', {
    isSpinning,
    winningSlot,
    currentPosition: Math.round(currentPosition),
    isAnimating
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

  // 🎬 Smooth animation loop
  const animate = useCallback(() => {
    const now = performance.now();
    const elapsed = now - animationStartTime.current;
    
    // Frame rate control for smooth 60fps
    if (now - lastFrameTime.current < FRAME_TIME_MS) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = now;

    // Calculate animation progress (0 to 1)
    const progress = Math.min(elapsed / SPINNING_DURATION_MS, 1);
    
    if (progress >= 1) {
      // Animation complete - lock at exact target position
      const finalPosition = animationTargetPosition.current;
      setCurrentPosition(finalPosition);
      setIsAnimating(false);
      hasAnimationStarted.current = false;
      
      // Save position permanently
      localStorage.setItem('roulettePosition', finalPosition.toString());
      
      console.log('✅ Animation Complete:', {
        duration: Math.round(elapsed),
        finalPosition: Math.round(finalPosition),
        accuracy: Math.abs(finalPosition - animationTargetPosition.current)
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

    // Apply smooth easing to progress
    const easedProgress = easeOutQuart(progress);
    
    // Calculate current position
    const startPos = animationStartPosition.current;
    const targetPos = animationTargetPosition.current;
    const distance = targetPos - startPos;
    const newPosition = startPos + (easedProgress * distance);
    
    setCurrentPosition(newPosition);
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // 🚀 Start animation when spinning begins
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasAnimationStarted.current) {
      console.log('🚀 Starting 4-Second Roulette Animation');
      
      // Calculate target position from current position
      const targetPos = calculateTargetPosition(winningSlot, currentPosition);
      
      // Setup animation
      animationStartTime.current = performance.now();
      lastFrameTime.current = performance.now();
      animationStartPosition.current = currentPosition;
      animationTargetPosition.current = targetPos;
      hasAnimationStarted.current = true;
      setIsAnimating(true);
      setShowWinGlow(false);
      
      // Start animation
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Animation Started:', {
        startPosition: Math.round(currentPosition),
        targetPosition: Math.round(targetPos),
        totalDistance: Math.round(Math.abs(targetPos - currentPosition)),
        direction: 'RIGHT → LEFT',
        winningNumber: winningSlot
      });
    }
    // Reset flag when spinning stops
    else if (!isSpinning && hasAnimationStarted.current) {
      hasAnimationStarted.current = false;
    }
  }, [isSpinning, winningSlot, currentPosition, calculateTargetPosition, animate]);

  // 🔄 Server synchronization only when completely idle
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isSpinning && 
        !isAnimating && 
        !hasAnimationStarted.current) {
      
      console.log('🔄 Server sync position:', synchronizedPosition);
      setCurrentPosition(synchronizedPosition);
      localStorage.setItem('roulettePosition', synchronizedPosition.toString());
    }
  }, [synchronizedPosition, isSpinning, isAnimating]);

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

        {/* 🔧 DEBUG INFO */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs p-2 rounded">
            <div>Position: {Math.round(currentPosition)}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            <div>Animating: {isAnimating ? 'YES' : 'NO'}</div>
            <div>Winning: {winningSlot || 'N/A'}</div>
            <div>Rotations: {Math.round(Math.abs(currentPosition) / WHEEL_SIZE_PX)}</div>
          </div>
        )}
      </div>
    </div>
  );
}