import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  extendedWinAnimation?: boolean;
}

// 🎰 ROULETTE WHEEL CONFIGURATION
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

// 🎯 FIXED DIMENSIONS - PIXEL PERFECT
const TILE_SIZE_PX = 100;           // Each tile is exactly 100px × 100px
const VISIBLE_TILES = 15;           // Always show exactly 15 tiles
const REEL_WIDTH_PX = VISIBLE_TILES * TILE_SIZE_PX; // 1500px viewport
const REEL_HEIGHT_PX = 120;         // Fixed height
const CENTER_INDEX = Math.floor(VISIBLE_TILES / 2); // 7 (middle tile)
const CENTER_MARKER_PX = CENTER_INDEX * TILE_SIZE_PX + (TILE_SIZE_PX / 2); // 750px

// 🔄 TILE DUPLICATION - For seamless infinite looping
const TILE_REPEATS = 50;            // Duplicate the 15-slot sequence 50 times
const TOTAL_TILES = WHEEL_SLOTS.length * TILE_REPEATS; // 750 total tiles
const TOTAL_REEL_WIDTH_PX = TOTAL_TILES * TILE_SIZE_PX; // 75,000px

// ⏱️ ANIMATION CONFIGURATION
const SPIN_DURATION_MS = 4000;      // Exactly 4 seconds
const MIN_SPIN_DISTANCE = 40 * WHEEL_SLOTS.length * TILE_SIZE_PX; // Minimum 40 full rotations

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, extendedWinAnimation }: RouletteReelProps) {
  const [currentTranslateX, setCurrentTranslateX] = useState(() => {
    // Load initial position from localStorage or start at 0
    const saved = localStorage.getItem('roulettePosition');
    return saved ? parseFloat(saved) : 0;
  });
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinGlow, setShowWinGlow] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();

  // 🎨 Get tile styling based on color
  const getTileStyle = (color: string): string => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-emerald-500/30';
      case 'red': 
        return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white shadow-red-500/30';
      case 'black': 
        return 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500 text-white shadow-gray-700/30';
      default: 
        return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  // 🧮 Calculate final position for winning slot
  const calculateWinningPosition = (winningNumber: number, startPosition: number): number => {
    // Find the slot index in our 15-slot wheel
    const slotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningNumber);
    if (slotIndex === -1) {
      console.error('Invalid winning number:', winningNumber);
      return startPosition;
    }

    // Calculate minimum spin distance from current position
    const minFinalPosition = startPosition - MIN_SPIN_DISTANCE;
    
    // Find the best winning tile position near our target area
    let bestPosition = minFinalPosition;
    let bestDistance = Infinity;
    
    // Check all duplicated instances of the winning slot
    for (let repeat = 0; repeat < TILE_REPEATS; repeat++) {
      const tileIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = tileIndex * TILE_SIZE_PX;
      const tileCenterX = tileLeftEdge + (TILE_SIZE_PX / 2);
      
      // Calculate the translateX needed to center this tile under the marker
      const requiredTranslateX = CENTER_MARKER_PX - tileCenterX;
      
      // Only consider positions that are to the left (negative direction)
      if (requiredTranslateX <= minFinalPosition) {
        const distance = Math.abs(requiredTranslateX - minFinalPosition);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPosition = requiredTranslateX;
        }
      }
    }

    console.log('🎯 Winning Position Calculated:', {
      winningNumber,
      startPosition: Math.round(startPosition),
      finalPosition: Math.round(bestPosition),
      spinDistance: Math.round(Math.abs(bestPosition - startPosition)),
      fullRotations: Math.round(Math.abs(bestPosition - startPosition) / (WHEEL_SLOTS.length * TILE_SIZE_PX))
    });

    return bestPosition;
  };

  // 🎬 Start spin animation
  useEffect(() => {
    if (isSpinning && winningSlot !== null && !isAnimating) {
      console.log('🚀 Starting CSS Transition Roulette Spin');
      
      const startPosition = currentTranslateX;
      const targetPosition = calculateWinningPosition(winningSlot, startPosition);
      
      if (!reelRef.current) return;
      
      // Apply CSS transition for smooth 4-second animation
      const reel = reelRef.current;
      reel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
      reel.style.transform = `translateX(${targetPosition}px)`;
      
      setIsAnimating(true);
      setShowWinGlow(false);
      
      // Clear any existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Set timeout to complete animation after exactly 4 seconds
      animationTimeoutRef.current = setTimeout(() => {
        setCurrentTranslateX(targetPosition);
        setIsAnimating(false);
        setShowWinGlow(true);
        
        // Save final position
        localStorage.setItem('roulettePosition', targetPosition.toString());
        
        // Remove transition for instant position updates
        if (reelRef.current) {
          reelRef.current.style.transition = 'none';
        }
        
        console.log('✅ Animation Complete - Position Locked:', {
          finalPosition: Math.round(targetPosition),
          duration: SPIN_DURATION_MS,
          winningNumber: winningSlot
        });
        
        // Hide win glow after 2 seconds
        setTimeout(() => setShowWinGlow(false), 2000);
      }, SPIN_DURATION_MS);
      
      console.log('🎯 CSS Animation Started:', {
        startPosition: Math.round(startPosition),
        targetPosition: Math.round(targetPosition),
        distance: Math.round(Math.abs(targetPosition - startPosition)),
        duration: `${SPIN_DURATION_MS}ms`,
        winningNumber: winningSlot
      });
    }
  }, [isSpinning, winningSlot, currentTranslateX, isAnimating]);

  // 🧹 Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // 🎲 Generate all tiles (duplicated sequences for infinite loop)
  const allTiles = [];
  for (let repeat = 0; repeat < TILE_REPEATS; repeat++) {
    for (let slotIndex = 0; slotIndex < WHEEL_SLOTS.length; slotIndex++) {
      const slot = WHEEL_SLOTS[slotIndex];
      const globalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      
      allTiles.push({
        id: `tile-${globalIndex}`,
        slot: slot.slot,
        color: slot.color,
        index: globalIndex
      });
    }
  }

  return (
    <div className="flex justify-center w-full">
      {/* 🎰 ROULETTE CONTAINER - Fixed 1500px width */}
      <div 
        className="relative bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          width: `${REEL_WIDTH_PX}px`,
          height: `${REEL_HEIGHT_PX}px`
        }}
      >
        {/* 🎯 FIXED CENTER MARKER */}
        <div 
          className={`absolute inset-y-0 z-30 pointer-events-none transition-all duration-300 ${
            showWinGlow ? 'bg-yellow-400 shadow-yellow-400/50' : 'bg-emerald-400'
          }`}
          style={{ 
            left: `${CENTER_MARKER_PX}px`,
            width: '3px',
            transform: 'translateX(-1.5px)',
            boxShadow: showWinGlow ? '0 0 20px rgba(255, 255, 0, 0.8)' : '0 0 10px rgba(16, 185, 129, 0.5)'
          }}
        >
          {/* Top Triangle */}
          <div 
            className={`absolute -top-2 left-1/2 transform -translate-x-1/2 transition-colors duration-300 ${
              showWinGlow ? 'border-yellow-400' : 'border-emerald-400'
            }`}
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid currentColor'
            }}
          />
          
          {/* Bottom Triangle */}
          <div 
            className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 transition-colors duration-300 ${
              showWinGlow ? 'border-yellow-400' : 'border-emerald-400'
            }`}
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid currentColor'
            }}
          />
        </div>

        {/* 🎡 REEL - Horizontal scrolling tile container */}
        <div 
          ref={reelRef}
          className="flex h-full will-change-transform"
          style={{ 
            width: `${TOTAL_REEL_WIDTH_PX}px`,
            transform: `translateX(${currentTranslateX}px)`,
            transition: isAnimating ? undefined : 'none' // CSS handles transition during animation
          }}
        >
          {allTiles.map((tile, index) => {
            // Check if this tile is currently under the center marker
            const tileLeftEdge = index * TILE_SIZE_PX;
            const tileRightEdge = tileLeftEdge + TILE_SIZE_PX;
            const tileScreenLeft = tileLeftEdge + currentTranslateX;
            const tileScreenRight = tileRightEdge + currentTranslateX;
            const isUnderMarker = tileScreenLeft <= CENTER_MARKER_PX && tileScreenRight >= CENTER_MARKER_PX;
            
            return (
              <div
                key={tile.id}
                className={`
                  flex-shrink-0 flex items-center justify-center text-xl font-bold border-2 
                  transition-all duration-200 relative
                  ${getTileStyle(tile.color)}
                  ${isUnderMarker && showWinGlow ? 'ring-4 ring-yellow-400 ring-opacity-75 scale-105' : ''}
                  ${isUnderMarker ? 'border-white border-opacity-80' : ''}
                `}
                style={{ 
                  width: `${TILE_SIZE_PX}px`,
                  height: `${TILE_SIZE_PX}px`,
                  zIndex: isUnderMarker ? 20 : 10
                }}
              >
                {tile.slot}
                
                {/* Win effect overlay */}
                {isUnderMarker && showWinGlow && (
                  <div className="absolute inset-0 bg-yellow-400 bg-opacity-20 animate-pulse rounded" />
                )}
              </div>
            );
          })}
        </div>

        {/* 🎮 Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 text-xs text-white bg-black bg-opacity-50 p-2 rounded z-40">
            <div>Position: {Math.round(currentTranslateX)}px</div>
            <div>Animating: {isAnimating ? 'YES' : 'NO'}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            {winningSlot !== null && <div>Winning: {winningSlot}</div>}
          </div>
        )}
      </div>
    </div>
  );
}