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

// 🎡 IMMUTABLE PIXEL-PERFECT DIMENSIONS
const TILE_SIZE_PX = 100;
const VISIBLE_TILE_COUNT = 15;
const REEL_VIEWPORT_WIDTH_PX = TILE_SIZE_PX * VISIBLE_TILE_COUNT; // 1500px
const REEL_HEIGHT_PX = 120;
const CENTER_POSITION_PX = REEL_VIEWPORT_WIDTH_PX / 2; // 750px - where vertical line is
const BUFFER_TILES_COUNT = 200;

// ⏱️ ANIMATION TIMING - EXACTLY 4 SECONDS
const ANIMATION_DURATION_MS = 4000;

// 🎯 Easing function for smooth animation
const easeInOutCubic = (t: number): number => {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State management
  const [translateX, setTranslateX] = useState(() => {
    const savedPosition = localStorage.getItem('rouletteReelPosition');
    return savedPosition ? parseFloat(savedPosition) : 0;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinningGlow, setShowWinningGlow] = useState(false);

  // Animation refs
  const animationRef = useRef<number>();
  const animationStartTime = useRef<number>(0);
  const animationStartPosition = useRef<number>(0);
  const animationEndPosition = useRef<number>(0);
  const hasStartedAnimation = useRef<boolean>(false);

  console.log('🎰 RouletteReel:', { 
    isSpinning, 
    winningSlot, 
    translateX: Math.round(translateX), 
    isAnimating
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

  // 🧮 Calculate EXACT final position where winning tile is perfectly centered under vertical line
  const calculateWinningPosition = useCallback((winningNumber: number, currentPosition: number): number => {
    // Find the slot index for the winning number
    const slotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningNumber);
    if (slotIndex === -1) {
      console.error('❌ Invalid winning number:', winningNumber);
      return currentPosition;
    }

    // We need to find a tile instance that will be visible after spinning left
    // Calculate minimum spin distance (at least 30 full wheel rotations to the left)
    const wheelCircumference = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px
    const minSpinDistance = 30 * wheelCircumference; // Minimum leftward distance
    
    // Target area: current position minus minimum spin distance
    const targetAreaStart = currentPosition - minSpinDistance;
    
    // Find the winning tile closest to our target area
    let bestTileIndex = -1;
    let bestDistance = Infinity;
    
    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
      const tile = tiles[tileIndex];
      if (tile.slot === winningNumber) {
        // Calculate where this tile's center would be
        const tileCenterX = tileIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
        
        // Calculate the translateX needed to put this tile center under the vertical line
        const neededTranslateX = CENTER_POSITION_PX - tileCenterX;
        
        // Check if this position is in our target area (left of current position)
        if (neededTranslateX <= targetAreaStart) {
          const distanceFromTarget = Math.abs(neededTranslateX - targetAreaStart);
          if (distanceFromTarget < bestDistance) {
            bestDistance = distanceFromTarget;
            bestTileIndex = tileIndex;
          }
        }
      }
    }
    
    if (bestTileIndex === -1) {
      console.error('❌ Could not find suitable winning tile position');
      return currentPosition - minSpinDistance;
    }
    
    // Calculate the exact final position
    const winningTileCenterX = bestTileIndex * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
    const finalPosition = CENTER_POSITION_PX - winningTileCenterX;
    
    console.log('🎯 Winning Position Calculated:', {
      winningNumber,
      currentPosition: Math.round(currentPosition),
      finalPosition: Math.round(finalPosition),
      spinDistance: Math.round(Math.abs(finalPosition - currentPosition)),
      wheelRotations: Math.round(Math.abs(finalPosition - currentPosition) / wheelCircumference),
      direction: 'RIGHT → LEFT'
    });
    
    return finalPosition;
  }, [tiles]);

  // 🎬 Smooth animation function - simple and reliable
  const animate = useCallback(() => {
    const currentTime = performance.now();
    const elapsed = currentTime - animationStartTime.current;
    const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
    
    if (progress >= 1) {
      // Animation complete - set exact final position
      setTranslateX(animationEndPosition.current);
      setIsAnimating(false);
      hasStartedAnimation.current = false;
      
      // Save position
      localStorage.setItem('rouletteReelPosition', animationEndPosition.current.toString());
      
      console.log('✅ Animation Complete:', {
        duration: Math.round(elapsed),
        finalPosition: Math.round(animationEndPosition.current),
        targetPosition: Math.round(animationEndPosition.current)
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
    
    // Apply smooth easing for natural acceleration/deceleration
    const easedProgress = easeInOutCubic(progress);
    
    // Calculate current position
    const totalDistance = animationEndPosition.current - animationStartPosition.current;
    const currentPosition = animationStartPosition.current + (easedProgress * totalDistance);
    
    setTranslateX(currentPosition);
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // 🚀 Animation trigger - ONE ANIMATION PER SPIN
  useEffect(() => {
    if (isSpinning && !isAnimating && winningSlot !== null && !hasStartedAnimation.current) {
      console.log('🚀 Starting RIGHT-TO-LEFT Spin Animation');
      
      // Calculate exact final position
      const finalPosition = calculateWinningPosition(winningSlot, translateX);
      
      // Set up animation
      animationStartTime.current = performance.now();
      animationStartPosition.current = translateX;
      animationEndPosition.current = finalPosition;
      hasStartedAnimation.current = true;
      setIsAnimating(true);
      setShowWinningGlow(false);
      
      // Start animation
      animationRef.current = requestAnimationFrame(animate);
      
      console.log('🎯 Animation Started:', {
        startPosition: Math.round(translateX),
        endPosition: Math.round(finalPosition),
        totalDistance: Math.round(Math.abs(finalPosition - translateX)),
        duration: `${ANIMATION_DURATION_MS}ms`,
        winningSlot
      });
    }
    // Clean up when spinning stops
    else if (!isSpinning && hasStartedAnimation.current) {
      hasStartedAnimation.current = false;
    }
  }, [isSpinning, winningSlot, translateX, calculateWinningPosition, animate]);

  // 🔄 Server synchronization - only when idle
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isSpinning && 
        !isAnimating && 
        !hasStartedAnimation.current) {
      
      console.log('🔄 Server sync:', synchronizedPosition);
      setTranslateX(synchronizedPosition);
      localStorage.setItem('rouletteReelPosition', synchronizedPosition.toString());
    }
  }, [synchronizedPosition, isSpinning, isAnimating]);

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
      {/* 🧱 FIXED-WIDTH CONTAINER */}
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
        {/* 🎯 VERTICAL LINE - FIXED AT CENTER */}
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
          ></div>
          
          <div 
            className="absolute bottom-0 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-400"
            style={{ left: '-4px' }}
          ></div>
          
          <div className="absolute inset-y-0 w-0.5 bg-emerald-400"></div>
          
          <div className="absolute inset-y-0 w-1 bg-emerald-400/20 blur-sm" style={{ left: '-2px' }}></div>
        </div>

        {/* 🎞️ REEL - MOVES RIGHT TO LEFT */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none',
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Calculate if this tile is under the vertical line
            const tileCenterX = tile.index * TILE_SIZE_PX + (TILE_SIZE_PX / 2);
            const tileCenterOnScreen = tileCenterX + translateX;
            const distanceFromCenter = Math.abs(tileCenterOnScreen - CENTER_POSITION_PX);
            const isUnderCenter = distanceFromCenter < TILE_SIZE_PX / 3;
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

        {/* 📐 Debug overlay */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
            <div>Position: {Math.round(translateX)}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            <div>Animating: {isAnimating ? 'YES' : 'NO'}</div>
            <div>Winning: {winningSlot}</div>
            <div>Direction: RIGHT → LEFT</div>
            <div className={`font-bold ${!isSpinning && !isAnimating ? 'text-green-400' : 'text-yellow-400'}`}>
              Status: {!isSpinning && !isAnimating ? 'STOPPED' : 'SPINNING'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}