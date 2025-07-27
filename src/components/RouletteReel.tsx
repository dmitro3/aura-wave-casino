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

// 🎡 DIMENSIONS
const TILE_SIZE_PX = 100;
const VISIBLE_TILE_COUNT = 15;
const REEL_VIEWPORT_WIDTH_PX = TILE_SIZE_PX * VISIBLE_TILE_COUNT; // 1500px
const REEL_HEIGHT_PX = 120;
const CENTER_POSITION_PX = REEL_VIEWPORT_WIDTH_PX / 2; // 750px - vertical line position
const BUFFER_TILES_COUNT = 300; // More tiles for longer spinning

// 🎰 ROULETTE ANIMATION SETTINGS - 4 SECONDS TOTAL
const TOTAL_ANIMATION_DURATION_MS = 4000; // 4 seconds for each spin
const ACCELERATION_PHASE_MS = 600; // 0.6 seconds to speed up
const FAST_SPIN_PHASE_MS = 2800; // 2.8 seconds of fast spinning
const DECELERATION_PHASE_MS = 600; // 0.6 seconds to slow down and stop

// Minimum rotations during fast spin phase for realistic effect
const MIN_ROTATIONS_DURING_FAST_SPIN = 40; // 40+ full wheel rotations in 4 seconds
const WHEEL_CIRCUMFERENCE_PX = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px per rotation

// 🎯 Optimized easing functions for 60fps smooth animation
const easeInCubic = (t: number): number => t * t * t;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(() => {
    const savedPosition = localStorage.getItem('rouletteReelPosition');
    return savedPosition ? parseFloat(savedPosition) : 0;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'accelerating' | 'spinning' | 'decelerating' | 'stopped'>('idle');
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Animation refs for smooth performance
  const animationRef = useRef<number>();
  const animationStartTime = useRef<number>(0);
  const startPosition = useRef<number>(0);
  const finalTargetPosition = useRef<number>(0);
  const hasStartedAnimation = useRef<boolean>(false);
  const lastFrameTime = useRef<number>(0);

  console.log('🎰 RouletteReel:', { 
    isSpinning, 
    winningSlot, 
    translateX: Math.round(translateX), 
    isAnimating,
    phase: currentPhase
  });

  // Generate tiles array with extended buffer for long spinning
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

  // 🧮 Calculate where the winning tile should end up (perfectly centered under vertical line)
  const calculateFinalPosition = useCallback((winningNumber: number, currentPos: number): number => {
    const slotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningNumber);
    if (slotIndex === -1) {
      console.error('❌ Invalid winning number:', winningNumber);
      return currentPos;
    }

    // Calculate total distance to travel during fast spin phase
    const fastSpinDistance = MIN_ROTATIONS_DURING_FAST_SPIN * WHEEL_CIRCUMFERENCE_PX;
    
    // Target area after fast spinning (far to the left)
    const roughTargetArea = currentPos - fastSpinDistance;
    
    // Find the best winning tile instance in that area
    let bestTileIndex = -1;
    let bestDistance = Infinity;
    
    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
      const tile = tiles[tileIndex];
      if (tile.slot === winningNumber) {
        const tileCenterX = tileIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
        const neededTranslateX = CENTER_POSITION_PX - tileCenterX;
        
        // Look for tiles in the target area (must be to the left of current position)
        if (neededTranslateX <= roughTargetArea) {
          const distanceFromTarget = Math.abs(neededTranslateX - roughTargetArea);
          if (distanceFromTarget < bestDistance) {
            bestDistance = distanceFromTarget;
            bestTileIndex = tileIndex;
          }
        }
      }
    }
    
    if (bestTileIndex === -1) {
      console.error('❌ Could not find suitable winning tile');
      return currentPos - fastSpinDistance;
    }
    
    // Calculate exact final position
    const winningTileCenterX = bestTileIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
    const finalPosition = CENTER_POSITION_PX - winningTileCenterX;
    
    console.log('🎯 Final Position Calculated:', {
      winningNumber,
      currentPosition: Math.round(currentPos),
      finalPosition: Math.round(finalPosition),
      totalSpinDistance: Math.round(Math.abs(finalPosition - currentPos)),
      rotations: Math.round(Math.abs(finalPosition - currentPos) / WHEEL_CIRCUMFERENCE_PX)
    });
    
    return finalPosition;
  }, [tiles]);

  // 🎬 OPTIMIZED 4-second roulette animation - super smooth 60fps
  const animate = useCallback(() => {
    const currentTime = performance.now();
    const elapsed = currentTime - animationStartTime.current;
    
    // Frame rate optimization - smooth 60fps without stuttering
    if (currentTime - lastFrameTime.current < 16.67) { // ~60fps cap for smoothness
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;
    
    let newPosition = startPosition.current;
    
    // Phase 1: Acceleration (0-600ms) - Start slow, speed up
    if (elapsed <= ACCELERATION_PHASE_MS) {
      if (currentPhase !== 'accelerating') {
        setCurrentPhase('accelerating');
      }
      
      const progress = Math.min(elapsed / ACCELERATION_PHASE_MS, 1);
      const easedProgress = easeInCubic(progress); // Smooth acceleration
      
      // During acceleration, move small distance smoothly
      const accelerationDistance = WHEEL_CIRCUMFERENCE_PX * 2; // 2 rotations during acceleration
      newPosition = startPosition.current - (easedProgress * accelerationDistance);
    }
    
    // Phase 2: Fast Spinning (600-3400ms) - Spin fast with many rotations
    else if (elapsed <= ACCELERATION_PHASE_MS + FAST_SPIN_PHASE_MS) {
      if (currentPhase !== 'spinning') {
        setCurrentPhase('spinning');
      }
      
      const phaseElapsed = elapsed - ACCELERATION_PHASE_MS;
      const progress = Math.min(phaseElapsed / FAST_SPIN_PHASE_MS, 1);
      
      // Linear fast movement during this phase for smoothness
      const accelerationEndPosition = startPosition.current - (WHEEL_CIRCUMFERENCE_PX * 2);
      const fastSpinDistance = MIN_ROTATIONS_DURING_FAST_SPIN * WHEEL_CIRCUMFERENCE_PX;
      
      newPosition = accelerationEndPosition - (progress * fastSpinDistance);
    }
    
    // Phase 3: Deceleration (3400-4000ms) - Smooth slow down to exact target
    else if (elapsed <= TOTAL_ANIMATION_DURATION_MS) {
      if (currentPhase !== 'decelerating') {
        setCurrentPhase('decelerating');
      }
      
      const phaseElapsed = elapsed - ACCELERATION_PHASE_MS - FAST_SPIN_PHASE_MS;
      const progress = Math.min(phaseElapsed / DECELERATION_PHASE_MS, 1);
      const easedProgress = easeOutCubic(progress); // Smooth deceleration
      
      // Calculate where deceleration phase starts
      const decelerationStartPosition = startPosition.current - (WHEEL_CIRCUMFERENCE_PX * 2) - (MIN_ROTATIONS_DURING_FAST_SPIN * WHEEL_CIRCUMFERENCE_PX);
      
      // Smooth deceleration to exact final target
      const remainingDistance = finalTargetPosition.current - decelerationStartPosition;
      newPosition = decelerationStartPosition + (easedProgress * remainingDistance);
    }
    
    // Animation complete - LOCK POSITION PERMANENTLY
    else {
      newPosition = finalTargetPosition.current;
      setCurrentPhase('stopped');
      setIsAnimating(false);
      hasStartedAnimation.current = false;
      
      // PERMANENTLY save final position - NEVER RESET
      localStorage.setItem('rouletteReelPosition', newPosition.toString());
      
      console.log('✅ 4-Second Roulette Animation Complete:', {
        totalDuration: Math.round(elapsed),
        finalPosition: Math.round(newPosition),
        accuracy: Math.abs(newPosition - finalTargetPosition.current),
        totalRotations: Math.round(Math.abs(newPosition - startPosition.current) / WHEEL_CIRCUMFERENCE_PX),
        positionLocked: true,
        willNeverReset: true
      });
      
      // Show winning glow
      setShowWinningGlow(true);
      setTimeout(() => setShowWinningGlow(false), 2500);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }
    
    // Update position with sub-pixel precision for smoothness
    setTranslateX(newPosition);
    
    // Continue smooth animation
    animationRef.current = requestAnimationFrame(animate);
  }, [currentPhase]);

  // 🚀 Start animation when spinning begins - NEVER RESET POSITION
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 Starting 4-Second Smooth Roulette Animation');
      
      // Calculate final target position from CURRENT position (never reset)
      const finalPos = calculateFinalPosition(winningSlot, translateX);
      
      // Set up animation from exact current position
      animationStartTime.current = performance.now();
      lastFrameTime.current = performance.now();
      startPosition.current = translateX; // Start from EXACT current position
      finalTargetPosition.current = finalPos;
      hasStartedAnimation.current = true;
      setIsAnimating(true);
      setCurrentPhase('accelerating');
      setShowWinningGlow(false);
      
      // Start smooth animation
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Smooth 4-Second Spin Started:', {
        startPosition: Math.round(translateX),
        targetPosition: Math.round(finalPos),
        estimatedRotations: Math.round(Math.abs(finalPos - translateX) / WHEEL_CIRCUMFERENCE_PX),
        duration: '4000ms',
        winningNumber: winningSlot,
        continuousFromPreviousRound: true
      });
    }
    // Clean up when spinning ends - NEVER TOUCH POSITION
    else if (!isSpinning && hasStartedAnimation.current) {
      console.log('🛑 Spinning ended - position PERMANENTLY maintained');
      hasStartedAnimation.current = false;
    }
    // Reset to idle when not spinning - POSITION STAYS LOCKED
    else if (!isSpinning && !isAnimating) {
      setCurrentPhase('idle');
    }
  }, [isSpinning, winningSlot, translateX, calculateFinalPosition, animate]);

  // 🚫 DISABLED Server synchronization to prevent position resets
  // Position is now 100% controlled locally and never reset
  useEffect(() => {
    // Server sync is COMPLETELY DISABLED to prevent position resets
    // The reel position is now permanently maintained between rounds
    if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🚫 Server sync BLOCKED - Position maintained locally');
    }
  }, [synchronizedPosition]);

  // Cleanup
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
      {/* 🧱 ROULETTE CONTAINER */}
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
        {/* 🎯 VERTICAL LINE MARKER - FIXED CENTER */}
        <div 
          className="absolute inset-y-0 z-30 pointer-events-none"
          style={{ 
            left: `${CENTER_POSITION_PX}px`,
            transform: 'translateX(-0.5px)',
            width: '1px'
          }}
        >
          <div 
            className="absolute top-0 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-emerald-400"
            style={{ left: '-4px' }}
          />
          
          <div 
            className="absolute bottom-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-400"
            style={{ left: '-4px' }}
          />
          
          <div className="absolute inset-y-0 w-0.5 bg-emerald-400" />
          
          <div className="absolute inset-y-0 w-1 bg-emerald-400/20 blur-sm" style={{ left: '-2px' }} />
        </div>

        {/* 🎡 SPINNING REEL */}
        <div 
          className={`flex h-full items-center transition-none ${
            currentPhase === 'spinning' ? 'blur-[0.5px]' : ''
          }`}
          style={{
            transform: `translateX(${translateX}px)`,
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Calculate if tile is under vertical line
            const tileCenterX = tile.index * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
            const tileCenterOnScreen = tileCenterX + translateX;
            const distanceFromCenter = Math.abs(tileCenterOnScreen - CENTER_POSITION_PX);
            const isUnderCenter = distanceFromCenter < TILE_SIZE_PX / 2;
            const isWinningTile = tile.slot === winningSlot && isUnderCenter && currentPhase === 'stopped';
            const isWinningGlow = isWinningTile && showWinningGlow;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 flex items-center justify-center
                  border-2 shadow-lg transition-all duration-300
                  ${getTileColor(tile.color)}
                  ${isUnderCenter && currentPhase === 'stopped' ? 'scale-110 z-10' : ''}
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
                <div className={`text-xl font-bold drop-shadow-lg transition-all duration-300 ${
                  isWinningGlow ? 'text-emerald-200 scale-125' : 
                  isWinningTile ? 'text-emerald-200 scale-110' : 
                  isUnderCenter && currentPhase === 'stopped' ? 'scale-110' : ''
                }`}>
                  {tile.slot}
                </div>
              </div>
            );
          })}
        </div>

        {/* 📊 SPINNING PHASE INDICATOR */}
        <div className="absolute top-2 right-2 z-40">
          {currentPhase === 'idle' && (
            <div className="bg-green-500/20 border border-green-400 text-green-400 px-3 py-1 rounded text-sm font-bold">
              READY
            </div>
          )}
          {currentPhase === 'accelerating' && (
            <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-400 px-3 py-1 rounded text-sm font-bold animate-pulse">
              ACCELERATING...
            </div>
          )}
          {currentPhase === 'spinning' && (
            <div className="bg-red-500/20 border border-red-400 text-red-400 px-3 py-1 rounded text-sm font-bold animate-spin">
              SPINNING FAST
            </div>
          )}
          {currentPhase === 'decelerating' && (
            <div className="bg-blue-500/20 border border-blue-400 text-blue-400 px-3 py-1 rounded text-sm font-bold">
              SLOWING DOWN...
            </div>
          )}
          {currentPhase === 'stopped' && (
            <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-400 px-3 py-1 rounded text-sm font-bold">
              RESULT LOCKED
            </div>
          )}
        </div>

        {/* 📐 Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
            <div>Phase: {currentPhase}</div>
            <div>Position: {Math.round(translateX)}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            <div>Winning: {winningSlot}</div>
            <div>Rotations: {Math.round(Math.abs(translateX) / WHEEL_CIRCUMFERENCE_PX)}</div>
          </div>
        )}
      </div>
    </div>
  );
}