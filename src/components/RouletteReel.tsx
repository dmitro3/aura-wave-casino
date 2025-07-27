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
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'fullSpeed' | 'decelerating' | 'stopped'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [decelerationStartTime, setDecelerationStartTime] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Refs
  const animationRef = useRef<number>();

  // Animation configuration - SIMPLIFIED FOR SMOOTHNESS
  const ANIMATION_DURATION = 4000; // 4 seconds total
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

  // SIMPLIFIED AND PRECISE target position calculation
  const calculateTargetPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }

    // Find the center instance of the winning slot
    const centerRepeat = Math.floor(BUFFER_TILES / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    
    // Calculate the exact position where the winning tile center aligns with viewport center
    const targetTileLeft = targetTileIndex * TILE_SIZE;
    const targetTileCenter = targetTileLeft + TILE_SIZE / 2;
    const viewportCenter = REEL_VIEWPORT_WIDTH / 2;
    
    // The target position is the offset needed to move the tile center to viewport center
    const targetPosition = viewportCenter - targetTileCenter;

    console.log('🎯 PRECISE TARGET CALCULATION:', {
      slot,
      slotIndex,
      targetTileIndex,
      targetTileLeft,
      targetTileCenter,
      viewportCenter,
      targetPosition: Math.round(targetPosition),
      verification: {
        finalTileCenter: targetTileCenter + targetPosition,
        shouldEqual: viewportCenter,
        difference: Math.abs((targetTileCenter + targetPosition) - viewportCenter)
      }
    });

    return Math.round(targetPosition);
  }, []);

  // SINGLE SMOOTH ANIMATION FUNCTION
  const animate = useCallback(() => {
    if (animationPhase !== 'accelerating') return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    
    // Smooth easing curve: start fast, slow down at the end
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Calculate the total distance to travel
    const totalDistance = targetPosition - 0; // From current position (0) to target
    
    // Apply easing to the distance
    const currentPosition = easeProgress * totalDistance;
    
    setTranslateX(currentPosition);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete - set exact target position
      setTranslateX(targetPosition);
      setAnimationPhase('stopped');
      setIsAnimating(false);
      
      console.log('✅ ANIMATION COMPLETE:', {
        targetPosition,
        finalPosition: targetPosition,
        winningSlot
      });
      
      // Verify the winning tile is centered
      const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
      const centerRepeat = Math.floor(BUFFER_TILES / 2);
      const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
      const targetTileLeft = targetTileIndex * TILE_SIZE;
      const targetTileCenter = targetTileLeft + TILE_SIZE / 2;
      const actualCenter = targetPosition + targetTileCenter;
      const centerOffset = Math.abs(actualCenter - (REEL_VIEWPORT_WIDTH / 2));
      
      console.log('🎯 WINNING TILE VERIFICATION:', {
        targetTileIndex,
        targetTileCenter,
        actualCenter,
        expectedCenter: REEL_VIEWPORT_WIDTH / 2,
        centerOffset: centerOffset.toFixed(2),
        isCentered: centerOffset < 1
      });
      
      // Start winning glow
      setShowWinningGlow(true);
      setTimeout(() => setShowWinningGlow(false), WINNING_GLOW_DURATION);
    }
  }, [animationPhase, startTime, targetPosition, winningSlot]);

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
      animate();
    } else if (animationPhase === 'idle' || animationPhase === 'stopped') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [animationPhase, animate]);

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