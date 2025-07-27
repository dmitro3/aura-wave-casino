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

// IMMUTABLE PIXEL-PERFECT DIMENSIONS - NEVER CHANGE
const TILE_SIZE = 80; // Fixed 80px tiles
const VISIBLE_TILES = 11; // Always show exactly 11 tiles
const REEL_VIEWPORT_WIDTH = TILE_SIZE * VISIBLE_TILES; // 880px fixed viewport
const REEL_HEIGHT = 100; // Fixed height
const CENTER_TILE_INDEX = Math.floor(VISIBLE_TILES / 2); // 5th tile (0-indexed)
const BUFFER_TILES = 100; // Extra tiles for smooth scrolling

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(() => {
    // Initialize from localStorage or default to 0
    const savedPosition = localStorage.getItem('rouletteReelPosition');
    return savedPosition ? parseInt(savedPosition, 10) : 0;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'fullSpeed' | 'decelerating' | 'stopped'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [decelerationStartTime, setDecelerationStartTime] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Refs
  const animationRef = useRef<number>();
  const hasStartedAnimation = useRef<boolean>(false);
  const currentSpinningPhase = useRef<string>('');
  const hasCompletedAnimation = useRef<boolean>(false);

  // Animation configuration - EXACT MATCH TO SERVER
  const SPINNING_PHASE_DURATION = 4000; // 4 seconds (matches server SPINNING_DURATION exactly)
  const ACCELERATION_DURATION = 800; // 0.8 seconds acceleration
  const FAST_ROLL_DURATION = 2000; // 2 seconds fast rolling
  const DECELERATION_DURATION = 1200; // 1.2 seconds deceleration
  const WINNING_GLOW_DURATION = 2000; // 2 seconds

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, isAnimating, animationPhase });

  // Generate tiles array with buffer
  const tiles = [];
  for (let i = 0; i < WHEEL_SLOTS.length * BUFFER_TILES; i++) {
    const slotIndex = i % WHEEL_SLOTS.length;
    const slot = WHEEL_SLOTS[slotIndex];
    tiles.push({
      key: `tile-${i}`,
      index: i,
      slot: slot.slot,
      color: slot.color
    });
  }

  // SIMPLE target position calculation - ensures winning tile is under vertical line
  const calculateTargetPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }

    // Find the center instance of the winning slot
    const centerRepeat = Math.floor(BUFFER_TILES / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    
    // Calculate the position where the winning tile is under the vertical line
    const targetTileLeft = targetTileIndex * TILE_SIZE;
    const viewportCenter = REEL_VIEWPORT_WIDTH / 2;
    
    // Ensure the winning tile is under the vertical line
    // The vertical line should be somewhere on the winning tile (not necessarily centered)
    const randomOffset = (Math.random() - 0.5) * TILE_SIZE * 0.8; // ±40% of tile width
    const targetPosition = viewportCenter - targetTileLeft - randomOffset;

    // Verify the calculation ensures the tile is under the line
    const finalTileLeft = targetTileLeft + targetPosition;
    const finalTileRight = finalTileLeft + TILE_SIZE;
    const isUnderLine = finalTileLeft <= viewportCenter && finalTileRight >= viewportCenter;

    console.log('🎯 ACCURATE TARGET CALCULATION:', {
      slot,
      slotIndex,
      targetTileIndex,
      targetTileLeft,
      viewportCenter,
      randomOffset: Math.round(randomOffset),
      targetPosition: Math.round(targetPosition),
      verification: {
        finalTileLeft: Math.round(finalTileLeft),
        finalTileRight: Math.round(finalTileRight),
        viewportCenter: Math.round(viewportCenter),
        isUnderLine,
        tileWidth: TILE_SIZE
      }
    });

    if (!isUnderLine) {
      console.error('❌ TARGET CALCULATION ERROR: Winning tile will not be under vertical line!');
      // Fallback: center the tile
      return Math.round(viewportCenter - targetTileLeft - TILE_SIZE / 2);
    }

    return Math.round(targetPosition);
  }, []);

  // THREE-PHASE ANIMATION FUNCTION - MATCHES 4-SECOND SERVER TIMING
  const animate = useCallback(() => {
    if (animationPhase !== 'accelerating') return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / SPINNING_PHASE_DURATION, 1);
    
    // THREE-PHASE ANIMATION: Acceleration, Fast Roll, Deceleration
    // Use progress-based approach to ensure full duration
    let easeProgress;
    
    if (progress < 0.2) {
      // ACCELERATION PHASE (0-20% of total time = 0-800ms)
      const accelProgress = progress / 0.2;
      easeProgress = Math.pow(accelProgress, 2) * 0.2; // Smooth acceleration to 20%
      
    } else if (progress < 0.7) {
      // FAST ROLL PHASE (20-70% of total time = 800-2800ms)
      const fastRollProgress = (progress - 0.2) / 0.5;
      easeProgress = 0.2 + (fastRollProgress * 0.5); // Linear from 20% to 70%
      
    } else {
      // DECELERATION PHASE (70-100% of total time = 2800-4000ms)
      const decelProgress = (progress - 0.7) / 0.3;
      easeProgress = 0.7 + Math.pow(decelProgress, 3) * 0.3; // Smooth deceleration to 100%
    }
    
    // Calculate the total distance to travel from current position to target
    const totalDistance = targetPosition - translateX;
    
    // Apply easing to the distance
    const currentPosition = translateX + (easeProgress * totalDistance);
    
    setTranslateX(currentPosition);

    // CRITICAL: Continue animation until we reach the EXACT full duration
    // Use elapsed time comparison to ensure we don't complete early
    if (elapsed < SPINNING_PHASE_DURATION) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete - set exact target position
      setTranslateX(targetPosition);
      setAnimationPhase('stopped');
      setIsAnimating(false);
      hasCompletedAnimation.current = true; // Mark animation as completed
      
      // Save the final position to localStorage for persistence
      localStorage.setItem('rouletteReelPosition', targetPosition.toString());
      
      console.log('✅ ANIMATION COMPLETE - 4-SECOND DURATION:', {
        targetPosition,
        finalPosition: targetPosition,
        winningSlot,
        totalDuration: elapsed,
        expectedDuration: SPINNING_PHASE_DURATION,
        accuracy: Math.abs(elapsed - SPINNING_PHASE_DURATION),
        phases: {
          acceleration: '0-800ms (0-20%)',
          fastRoll: '800-2800ms (20-70%)',
          deceleration: '2800-4000ms (70-100%)'
        },
        savedToStorage: true
      });
      
      // Verify final position
      const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
      const centerRepeat = Math.floor(BUFFER_TILES / 2);
      const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
      const targetTileLeft = targetTileIndex * TILE_SIZE;
      const finalTileLeft = targetTileLeft + targetPosition;
      const finalTileRight = finalTileLeft + TILE_SIZE;
      const viewportCenter = REEL_VIEWPORT_WIDTH / 2;
      const isUnderLine = finalTileLeft <= viewportCenter && finalTileRight >= viewportCenter;
      
      console.log('🎯 FINAL POSITION VERIFICATION:', {
        finalTileLeft: Math.round(finalTileLeft),
        finalTileRight: Math.round(finalTileRight),
        viewportCenter: Math.round(viewportCenter),
        isUnderLine,
        success: isUnderLine
      });
      
      // Start winning glow
      setShowWinningGlow(true);
      setTimeout(() => setShowWinningGlow(false), WINNING_GLOW_DURATION);
    }
  }, [animationPhase, startTime, targetPosition, translateX, SPINNING_PHASE_DURATION, winningSlot]);

  // Main animation trigger - STRICT SINGLE ANIMATION
  useEffect(() => {
    // Create a unique identifier for this spinning phase
    const spinningPhaseId = `${isSpinning}-${winningSlot}`;
    
    // Only start animation if we haven't started one for this phase
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 STARTING SINGLE ANIMATION - New spinning phase detected');
      
      // Mark that we've started animation for this phase - NEVER RESET DURING SPINNING
      hasStartedAnimation.current = true;
      hasCompletedAnimation.current = false; // Reset completion flag
      currentSpinningPhase.current = spinningPhaseId;
      
      const target = calculateTargetPosition(winningSlot);
      setTargetPosition(target);
      
      setIsAnimating(true);
      setAnimationPhase('accelerating');
      setStartTime(Date.now());
      setShowWinningGlow(false);
      
    } else if (!isSpinning && isAnimating) {
      console.log('🛑 SPINNING PHASE ENDED - Animation should be complete');
      setIsAnimating(false);
      setAnimationPhase('stopped');
      // DO NOT reset hasStartedAnimation here - keep it true until next round
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else if (!isSpinning && !isAnimating) {
      setAnimationPhase('idle');
      // Only reset animation flags when we're completely idle AND animation completed
      if (hasCompletedAnimation.current) {
        console.log('🔄 RESETTING ANIMATION FLAGS - Ready for next round');
        hasStartedAnimation.current = false; // Reset for next phase
        hasCompletedAnimation.current = false; // Reset completion flag
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, winningSlot, isAnimating, calculateTargetPosition]);

  // Trigger animation phases
  useEffect(() => {
    if (animationPhase === 'accelerating') {
      animate();
    } else if (animationPhase === 'idle' || animationPhase === 'stopped') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [animationPhase, animate]);

  // Server synchronization - PREVENT TELEPORTATION AFTER SUCCESSFUL ANIMATION
  useEffect(() => {
    // Only sync if we haven't completed a successful animation
    if (synchronizedPosition !== null && synchronizedPosition !== undefined && !isAnimating && !hasCompletedAnimation.current) {
      console.log('🔄 Server sync:', synchronizedPosition);
      setTranslateX(synchronizedPosition);
      // Save server position to localStorage
      localStorage.setItem('rouletteReelPosition', synchronizedPosition.toString());
    } else if (synchronizedPosition !== null && synchronizedPosition !== undefined && hasCompletedAnimation.current) {
      console.log('🚫 PREVENTING SERVER SYNC - Animation completed successfully, keeping winning position');
    }
  }, [synchronizedPosition, isAnimating]);

  // Ensure position is saved whenever it changes (except during animation)
  useEffect(() => {
    if (!isAnimating && animationPhase !== 'accelerating') {
      localStorage.setItem('rouletteReelPosition', translateX.toString());
    }
  }, [translateX, isAnimating, animationPhase]);

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
    <div className="flex justify-center w-full">
      {/* IMMUTABLE FIXED-WIDTH CONTAINER - NEVER CHANGES */}
      <div 
        className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        style={{ 
          width: `${REEL_VIEWPORT_WIDTH}px`,
          height: `${REEL_HEIGHT}px`,
          minWidth: `${REEL_VIEWPORT_WIDTH}px`,
          maxWidth: `${REEL_VIEWPORT_WIDTH}px`
        }}
      >
        {/* Center marker - ALWAYS at the same pixel position */}
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

        {/* Reel with tiles - IMMUTABLE TILE SIZES */}
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
            const tileLeft = tile.index * TILE_SIZE;
            const tileCenter = tileLeft + TILE_SIZE / 2;
            const viewportCenter = REEL_VIEWPORT_WIDTH / 2;
            const distanceFromCenter = Math.abs(tileCenter + translateX - viewportCenter);
            const isUnderCenter = distanceFromCenter < TILE_SIZE / 3;
            const isWinningTile = tile.slot === winningSlot && isUnderCenter && !isAnimating;
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
                  width: `${TILE_SIZE}px`,
                  height: `${TILE_SIZE}px`,
                  minWidth: `${TILE_SIZE}px`,
                  maxWidth: `${TILE_SIZE}px`,
                  minHeight: `${TILE_SIZE}px`,
                  maxHeight: `${TILE_SIZE}px`
                }}
              >
                <div className={`text-lg font-bold drop-shadow-lg transition-all duration-200 ${
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
      </div>
    </div>
  );
}