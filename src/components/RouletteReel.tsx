import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  extendedWinAnimation?: boolean;
}

// 🎰 EXACT WHEEL CONFIGURATION - Must match backend provably fair system
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

// 🎯 FIXED DIMENSIONS - PIXEL PERFECT (Match backend calculations)
const TILE_SIZE_PX = 100;                              // Each tile is exactly 100px × 100px  
const VISIBLE_TILES = 15;                              // Always show exactly 15 tiles
const REEL_WIDTH_PX = VISIBLE_TILES * TILE_SIZE_PX;    // 1500px viewport width
const REEL_HEIGHT_PX = 120;                            // Fixed height
const CENTER_MARKER_PX = REEL_WIDTH_PX / 2;            // 750px - fixed center marker

// 🔄 INFINITE LOOPING SYSTEM - Duplicated sequences for seamless scrolling
const TILE_REPEATS = 100;                              // Generate 100 copies of the 15-slot sequence
const TOTAL_TILES = WHEEL_SLOTS.length * TILE_REPEATS; // 1500 total tiles
const TOTAL_REEL_WIDTH_PX = TOTAL_TILES * TILE_SIZE_PX; // 150,000px total width

// ⏱️ ANIMATION CONFIGURATION - Exactly 4 seconds
const SPIN_DURATION_MS = 4000;

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, extendedWinAnimation }: RouletteReelProps) {
  // 🎲 Reel position state - starts from localStorage or 0
  const [currentPosition, setCurrentPosition] = useState(() => {
    const saved = localStorage.getItem('rouletteReelPosition');
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
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg';
      case 'red': 
        return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white shadow-lg';
      case 'black': 
        return 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500 text-white shadow-lg';
      default: 
        return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  // 🧮 Calculate winning position using PROVABLY FAIR system algorithm
  const calculateWinningPosition = (winningNumber: number, startPosition: number): number => {
    console.log('🎯 Calculating provably fair winning position...');
    
    // Find the index of the winning slot in our WHEEL_SLOTS array (PROVABLY FAIR STEP 1)
    const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningNumber);
    if (winningSlotIndex === -1) {
      console.error('❌ Invalid winning slot:', winningNumber);
      return startPosition;
    }
    
    console.log(`📍 Winning slot ${winningNumber} found at index ${winningSlotIndex} in wheel`);
    
    // PROVABLY FAIR CALCULATION (matches backend exactly):
    // Goal: Make winning slot center align with CENTER_MARKER_PX (750px)
    // Formula: position = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX/2)
    const idealPosition = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
    
    console.log(`🧮 Ideal position calculation: ${CENTER_MARKER_PX} - (${winningSlotIndex} * ${TILE_SIZE_PX} + ${TILE_SIZE_PX/2}) = ${idealPosition}`);
    
    // Ensure we spin left (negative direction) with sufficient distance
    const minSpinDistance = 50 * WHEEL_SLOTS.length * TILE_SIZE_PX; // 50 full wheel rotations minimum
    const minFinalPosition = startPosition - minSpinDistance;
    
    // Find the best position that satisfies both ideal alignment AND minimum spin distance
    let bestPosition = idealPosition;
    
    // If ideal position doesn't spin far enough, adjust by full wheel cycles
    while (bestPosition > minFinalPosition) {
      bestPosition -= WHEEL_SLOTS.length * TILE_SIZE_PX; // Move back by one full wheel cycle (1500px)
    }
    
    // Verification: Where will the winning slot center actually be?
    const verificationSlotCenter = bestPosition + (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
    const alignmentAccuracy = Math.abs(verificationSlotCenter - CENTER_MARKER_PX);
    
    console.log('✅ PROVABLY FAIR Position Calculated:', {
      winningSlot: winningNumber,
      winningSlotIndex,
      startPosition: Math.round(startPosition),
      idealPosition: Math.round(idealPosition),
      finalPosition: Math.round(bestPosition),
      spinDistance: Math.round(Math.abs(bestPosition - startPosition)),
      fullWheelRotations: Math.round(Math.abs(bestPosition - startPosition) / (WHEEL_SLOTS.length * TILE_SIZE_PX)),
      verification: {
        winningSlotCenterWillBeAt: Math.round(verificationSlotCenter),
        shouldBeAt: CENTER_MARKER_PX,
        pixelAccuracy: Math.round(alignmentAccuracy),
        isPerfect: alignmentAccuracy < 1
      }
    });
    
    return bestPosition;
  };

  // 🎬 Start CSS transition animation when spinning begins
  useEffect(() => {
    if (isSpinning && winningSlot !== null && !isAnimating) {
      console.log('🚀 Starting PROVABLY FAIR Roulette Animation');
      
      const startPosition = currentPosition;
      const targetPosition = calculateWinningPosition(winningSlot, startPosition);
      
      if (!reelRef.current) return;
      
      // Apply smooth CSS transition with realistic easing
      const reel = reelRef.current;
      reel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
      reel.style.transform = `translateX(${targetPosition}px)`;
      
      setIsAnimating(true);
      setShowWinGlow(false);
      
      // Clear any existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Complete animation after exactly 4 seconds
      animationTimeoutRef.current = setTimeout(() => {
        setCurrentPosition(targetPosition);
        setIsAnimating(false);
        setShowWinGlow(true);
        
        // Save final position for next round
        localStorage.setItem('rouletteReelPosition', targetPosition.toString());
        
        // Remove transition for instant updates after animation
        if (reelRef.current) {
          reelRef.current.style.transition = 'none';
        }
        
        console.log('✅ PROVABLY FAIR Animation Complete:', {
          finalPosition: Math.round(targetPosition),
          duration: `${SPIN_DURATION_MS}ms`,
          winningSlot,
          positionSaved: true
        });
        
        // Hide win glow after 2 seconds
        setTimeout(() => setShowWinGlow(false), 2000);
      }, SPIN_DURATION_MS);
      
      console.log('🎯 CSS Animation Started:', {
        from: Math.round(startPosition),
        to: Math.round(targetPosition),
        distance: Math.round(Math.abs(targetPosition - startPosition)),
        duration: `${SPIN_DURATION_MS}ms`,
        winningSlot
      });
    }
  }, [isSpinning, winningSlot, currentPosition, isAnimating]);

  // 🧹 Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // 🎲 Generate all tiles (duplicated sequences for infinite scrolling)
  const allTiles = [];
  for (let repeat = 0; repeat < TILE_REPEATS; repeat++) {
    for (let slotIndex = 0; slotIndex < WHEEL_SLOTS.length; slotIndex++) {
      const slot = WHEEL_SLOTS[slotIndex];
      const globalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      
      allTiles.push({
        id: `tile-${globalIndex}`,
        slot: slot.slot,
        color: slot.color,
        index: globalIndex,
        leftPosition: globalIndex * TILE_SIZE_PX
      });
    }
  }

  return (
    <div className="flex justify-center w-full">
      {/* 🎰 ROULETTE CONTAINER - Fixed 1500px width, 120px height */}
      <div 
        className="relative bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          width: `${REEL_WIDTH_PX}px`,
          height: `${REEL_HEIGHT_PX}px`
        }}
      >
        {/* 🎯 FIXED CENTER MARKER - Never moves, always at 750px */}
        <div 
          className={`absolute inset-y-0 z-30 pointer-events-none transition-all duration-300 ${
            showWinGlow ? 'bg-yellow-400 shadow-yellow-400/60' : 'bg-emerald-400 shadow-emerald-400/40'
          }`}
          style={{ 
            left: `${CENTER_MARKER_PX}px`,
            width: '4px',
            transform: 'translateX(-2px)',
            boxShadow: showWinGlow ? '0 0 20px rgba(255, 255, 0, 0.8)' : '0 0 15px rgba(16, 185, 129, 0.6)'
          }}
        >
          {/* Top triangle pointer */}
          <div 
            className={`absolute -top-3 left-1/2 transform -translate-x-1/2 transition-colors duration-300`}
            style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: `10px solid ${showWinGlow ? '#fbbf24' : '#10b981'}`
            }}
          />
          
          {/* Bottom triangle pointer */}
          <div 
            className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 transition-colors duration-300`}
            style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `10px solid ${showWinGlow ? '#fbbf24' : '#10b981'}`
            }}
          />
        </div>

        {/* 🎡 REEL - Horizontal scrolling tile container */}
        <div 
          ref={reelRef}
          className="flex h-full will-change-transform"
          style={{ 
            width: `${TOTAL_REEL_WIDTH_PX}px`,
            transform: `translateX(${currentPosition}px)`,
            transition: isAnimating ? undefined : 'none' // CSS handles transition during animation
          }}
        >
          {allTiles.map((tile) => {
            // Calculate if this tile is currently under the center marker
            const tileScreenLeft = tile.leftPosition + currentPosition;
            const tileScreenRight = tileScreenLeft + TILE_SIZE_PX;
            const isUnderMarker = tileScreenLeft <= CENTER_MARKER_PX && tileScreenRight >= CENTER_MARKER_PX;
            const isWinningTile = isUnderMarker && tile.slot === winningSlot && showWinGlow;
            
            return (
              <div
                key={tile.id}
                className={`
                  flex-shrink-0 flex items-center justify-center text-xl font-bold border-2 
                  transition-all duration-200 relative select-none
                  ${getTileStyle(tile.color)}
                  ${isUnderMarker ? 'border-white border-opacity-90 z-20' : 'border-opacity-60 z-10'}
                  ${isWinningTile ? 'ring-4 ring-yellow-400 ring-opacity-80 scale-105' : ''}
                `}
                style={{ 
                  width: `${TILE_SIZE_PX}px`,
                  height: `${TILE_SIZE_PX}px`
                }}
              >
                {tile.slot}
                
                {/* Winning effect overlay */}
                {isWinningTile && (
                  <div className="absolute inset-0 bg-yellow-400 bg-opacity-25 animate-pulse rounded-sm" />
                )}
              </div>
            );
          })}
        </div>

        {/* 🎮 DEBUG INFO - Development only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 text-xs text-white bg-black bg-opacity-70 p-2 rounded-md z-40 font-mono">
            <div>Position: {Math.round(currentPosition)}px</div>
            <div>Animating: {isAnimating ? 'YES' : 'NO'}</div>
            <div>Spinning: {isSpinning ? 'YES' : 'NO'}</div>
            {winningSlot !== null && <div>Winning Slot: {winningSlot}</div>}
            <div>Full Rotations: {Math.round(Math.abs(currentPosition) / (WHEEL_SLOTS.length * TILE_SIZE_PX))}</div>
          </div>
        )}

        {/* 📊 STATUS INDICATOR */}
        <div className="absolute top-2 right-2 z-40">
          {isSpinning && isAnimating && (
            <div className="bg-red-500/20 border border-red-400 text-red-400 px-3 py-1 rounded-md text-sm font-bold animate-pulse">
              SPINNING...
            </div>
          )}
          {!isSpinning && !isAnimating && (
            <div className="bg-green-500/20 border border-green-400 text-green-400 px-3 py-1 rounded-md text-sm font-bold">
              READY
            </div>
          )}
        </div>
      </div>
    </div>
  );
}