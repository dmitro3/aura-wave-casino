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

// FIXED PIXEL-PERFECT DIMENSIONS - NO RESPONSIVE BEHAVIOR
const TILE_SIZE = 100; // Fixed 100px tiles
const VISIBLE_TILES = 15; // Always show exactly 15 tiles
const REEL_WIDTH = TILE_SIZE * VISIBLE_TILES; // 1500px fixed width
const REEL_HEIGHT = 120; // Fixed height
const CENTER_TILE_INDEX = Math.floor(VISIBLE_TILES / 2); // 7th tile (0-indexed)
const BUFFER_TILES = 50; // Extra tiles for smooth scrolling

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'fullSpeed' | 'decelerating' | 'stopped'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [decelerationStartTime, setDecelerationStartTime] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Refs
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation configuration
  const ACCELERATION_DURATION = 1000; // 1 second
  const FULL_SPEED_DURATION = 2000; // 2 seconds
  const DECELERATION_DURATION = 3000; // 3 seconds
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

  // Calculate target position for winning slot
  const calculateTargetPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }

    // Find the center instance of the winning slot
    const centerRepeat = Math.floor(BUFFER_TILES / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    
    // Calculate position so that the tile center aligns with the center marker
    const targetTileCenter = targetTileIndex * TILE_SIZE + TILE_SIZE / 2;
    const targetPosition = (REEL_WIDTH / 2) - targetTileCenter;

    console.log('🎯 TARGET CALCULATION:', {
      slot,
      slotIndex,
      centerRepeat,
      targetTileIndex,
      targetTileCenter,
      targetPosition: Math.round(targetPosition)
    });

    return Math.round(targetPosition);
  }, []);

  // Animation functions
  const animateAcceleration = useCallback(() => {
    if (animationPhase !== 'accelerating') return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / ACCELERATION_DURATION, 1);
    
    // Ease-in cubic acceleration
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Move from current position to full speed position
    const fullSpeedDistance = -TILE_SIZE * 20; // Move 20 tiles left during acceleration
    const currentPosition = easeProgress * fullSpeedDistance;
    
    setTranslateX(currentPosition);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateAcceleration);
    } else {
      console.log('🌀 ACCELERATION COMPLETE');
      setAnimationPhase('fullSpeed');
    }
  }, [animationPhase, startTime]);

  const animateFullSpeed = useCallback(() => {
    if (animationPhase !== 'fullSpeed') return;

    const elapsed = Date.now() - startTime - ACCELERATION_DURATION;
    const progress = Math.min(elapsed / FULL_SPEED_DURATION, 1);
    
    // Linear movement during full speed
    const accelerationDistance = -TILE_SIZE * 20;
    const fullSpeedDistance = -TILE_SIZE * 40; // Move 40 more tiles left
    const currentPosition = accelerationDistance + (fullSpeedDistance * progress);
    
    setTranslateX(currentPosition);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateFullSpeed);
    } else {
      console.log('🎯 FULL SPEED COMPLETE');
      setAnimationPhase('decelerating');
      setDecelerationStartTime(Date.now());
    }
  }, [animationPhase, startTime]);

  const animateDeceleration = useCallback(() => {
    if (animationPhase !== 'decelerating') return;

    const elapsed = Date.now() - decelerationStartTime;
    const progress = Math.min(elapsed / DECELERATION_DURATION, 1);
    
    // Multi-phase deceleration curve
    let easeProgress;
    if (progress < 0.6) {
      easeProgress = 1 - Math.pow(progress / 0.6, 2);
    } else if (progress < 0.9) {
      const phaseProgress = (progress - 0.6) / 0.3;
      easeProgress = 0.4 * (1 - Math.pow(phaseProgress, 1.5));
    } else {
      const finalProgress = (progress - 0.9) / 0.1;
      easeProgress = 0.4 * (1 - finalProgress) * 0.1;
    }
    
    // Move from full speed position to target position
    const fullSpeedEndPosition = -TILE_SIZE * 60; // End of full speed
    const remainingDistance = targetPosition - fullSpeedEndPosition;
    const currentPosition = fullSpeedEndPosition + (remainingDistance * easeProgress);
    
    setTranslateX(currentPosition);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateDeceleration);
    } else {
      // Animation complete - set exact target position
      setTranslateX(targetPosition);
      setAnimationPhase('stopped');
      setIsAnimating(false);
      
      console.log('✅ ANIMATION COMPLETE - Winning tile centered');
      
      // Start winning glow
      setShowWinningGlow(true);
      setTimeout(() => setShowWinningGlow(false), WINNING_GLOW_DURATION);
    }
  }, [animationPhase, decelerationStartTime, targetPosition]);

  // Main animation trigger
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null) {
      console.log('🚀 STARTING ANIMATION');
      
      const target = calculateTargetPosition(winningSlot);
      setTargetPosition(target);
      
      setIsAnimating(true);
      setAnimationPhase('accelerating');
      setStartTime(Date.now());
      setShowWinningGlow(false);
      
    } else if (!isSpinning && isAnimating) {
      console.log('🛑 STOPPING ANIMATION');
      setIsAnimating(false);
      setAnimationPhase('stopped');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else if (!isSpinning && !isAnimating) {
      setAnimationPhase('idle');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, winningSlot, isAnimating, calculateTargetPosition]);

  // Trigger animation phases
  useEffect(() => {
    if (animationPhase === 'accelerating') {
      animateAcceleration();
    } else if (animationPhase === 'fullSpeed') {
      animateFullSpeed();
    } else if (animationPhase === 'decelerating') {
      animateDeceleration();
    } else if (animationPhase === 'idle' || animationPhase === 'stopped') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [animationPhase, animateAcceleration, animateFullSpeed, animateDeceleration]);

  // Server synchronization
  useEffect(() => {
    if (synchronizedPosition !== null && synchronizedPosition !== undefined && !isAnimating) {
      console.log('🔄 Server sync:', synchronizedPosition);
      setTranslateX(synchronizedPosition);
    }
  }, [synchronizedPosition, isAnimating]);

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
      {/* Fixed-width container for pixel-perfect consistency */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        style={{ 
          width: `${REEL_WIDTH}px`,
          height: `${REEL_HEIGHT}px`
        }}
      >
        {/* Center marker - always at the same pixel position */}
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

        {/* Reel with tiles */}
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
            const reelCenter = REEL_WIDTH / 2;
            const distanceFromCenter = Math.abs(tileCenter + translateX - reelCenter);
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
                  height: `${TILE_SIZE}px`
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