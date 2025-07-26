import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
}

const REEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: '14x' },
  { slot: 1, color: 'red', multiplier: '2x' },
  { slot: 2, color: 'black', multiplier: '2x' },
  { slot: 3, color: 'red', multiplier: '2x' },
  { slot: 4, color: 'black', multiplier: '2x' },
  { slot: 5, color: 'red', multiplier: '2x' },
  { slot: 6, color: 'black', multiplier: '2x' },
  { slot: 7, color: 'red', multiplier: '2x' },
  { slot: 8, color: 'black', multiplier: '2x' },
  { slot: 9, color: 'red', multiplier: '2x' },
  { slot: 10, color: 'black', multiplier: '2x' },
  { slot: 11, color: 'red', multiplier: '2x' },
  { slot: 12, color: 'black', multiplier: '2x' },
  { slot: 13, color: 'red', multiplier: '2x' },
  { slot: 14, color: 'black', multiplier: '2x' }
];

export const RouletteReel = ({ isSpinning, winningSlot, showWinAnimation }: RouletteReelProps) => {
  const [position, setPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const spinningRef = useRef(false);
  const winningSlotRef = useRef<number | null>(null);

  const TILE_WIDTH = 120;

  // Update refs when props change
  useEffect(() => {
    spinningRef.current = isSpinning;
    winningSlotRef.current = winningSlot;
    console.log('🎰 Reel props updated:', { isSpinning, winningSlot, position: position.toFixed(0) });
  }, [isSpinning, winningSlot, position]);

  // Main animation function
  const runAnimation = () => {
    console.log('🎰 Starting reel animation');
    setIsAnimating(true);
    
    const SPIN_SPEED = 1800; // pixels per second - fast but controlled
    const LANDING_DURATION = 3000; // 3 seconds for smooth landing
    const startTime = performance.now();
    let landingStartTime: number | null = null;
    let landingStartPosition = 0;
    let finalPosition = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      
      // Check if we should start landing (result is available and we've been spinning for at least 1.5 seconds)
      if (winningSlotRef.current !== null && elapsed > 1500 && landingStartTime === null) {
        console.log('🎰 Starting landing sequence to slot:', winningSlotRef.current);
        landingStartTime = currentTime;
        landingStartPosition = position;
        
        // Calculate perfect center alignment
        const containerCenter = 360; // Center of visible area
        const totalCycles = 5; // Additional dramatic cycles
        const cycleDistance = REEL_SLOTS.length * TILE_WIDTH; // 15 * 120 = 1800px per cycle
        const totalAdditionalDistance = totalCycles * cycleDistance;
        const targetSlotOffset = winningSlotRef.current * TILE_WIDTH;
        
        finalPosition = landingStartPosition - totalAdditionalDistance - targetSlotOffset + containerCenter;
        
        console.log('🎰 Landing calculation:', {
          winningSlot: winningSlotRef.current,
          containerCenter,
          totalCycles,
          cycleDistance,
          totalAdditionalDistance,
          targetSlotOffset,
          landingStartPosition,
          finalPosition
        });
      }

      // Calculate position based on current phase
      if (landingStartTime === null) {
        // FAST SPINNING PHASE: Continuous movement
        const distance = (elapsed / 1000) * SPIN_SPEED;
        setPosition(-distance);
      } else {
        // LANDING PHASE: Smooth deceleration with realistic physics
        const landingElapsed = currentTime - landingStartTime;
        const landingProgress = Math.min(landingElapsed / LANDING_DURATION, 1);
        
        // Use cubic ease-out for very smooth, realistic deceleration
        const easeOut = 1 - Math.pow(1 - landingProgress, 3);
        const currentPos = landingStartPosition + (finalPosition - landingStartPosition) * easeOut;
        setPosition(currentPos);
        
        // Animation complete
        if (landingProgress >= 1) {
          console.log('🎰 Animation completed at position:', currentPos);
          setIsAnimating(false);
          return;
        }
      }

      // Continue animation if still spinning
      if (spinningRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        console.log('🎰 Spinning stopped, ending animation');
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Reset to initial state
  const resetReel = () => {
    console.log('🎰 Resetting reel');
    setPosition(0);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Main controller
  useEffect(() => {
    if (isSpinning && !isAnimating) {
      console.log('🎰 ✅ Starting animation');
      runAnimation();
    } else if (!isSpinning && isAnimating) {
      console.log('🎰 Stopping animation');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsAnimating(false);
      // Reset after delay
      setTimeout(resetReel, 3000);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, isAnimating]);

  const getTileColorClass = (color: string) => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-lg';
      case 'red': 
        return 'bg-gradient-to-br from-red-500 to-red-700 border-red-300 text-white shadow-lg';
      case 'black': 
        return 'bg-gradient-to-br from-gray-800 to-black border-gray-600 text-white shadow-lg';
      default: 
        return 'bg-gray-500 text-white';
    }
  };

  // Create seamless repeating tiles
  const tiles = [];
  const repeats = 25; // Enough tiles for long animation
  for (let repeat = 0; repeat < repeats; repeat++) {
    REEL_SLOTS.forEach((slot, index) => {
      tiles.push({
        ...slot,
        uniqueKey: `${repeat}-${index}`
      });
    });
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Reel Container */}
      <div className="relative h-32 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-4 border-yellow-500 overflow-hidden shadow-2xl">
        
        {/* Center Target Rectangle */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-32 z-30 pointer-events-none">
          {/* Arrows */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-yellow-500 drop-shadow-lg"></div>
          </div>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-500 drop-shadow-lg"></div>
          </div>
          
          {/* Center rectangle */}
          <div className="absolute inset-0 border-l-4 border-r-4 border-yellow-500 bg-yellow-500/15 backdrop-blur-sm rounded">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-500/90"></div>
          </div>
        </div>

        {/* Moving Tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${position}px)`,
            willChange: 'transform',
          }}
        >
          {tiles.map((tile) => {
            const isWinning = !isAnimating && showWinAnimation && tile.slot === winningSlot;
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-24 flex flex-col items-center justify-center border-r-2 border-gray-600 relative transition-all duration-500 ${getTileColorClass(tile.color)} ${
                  isWinning ? 'scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                {/* Number */}
                <div className={`text-2xl font-bold drop-shadow-lg transition-all duration-300 ${
                  isWinning ? 'text-yellow-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Multiplier */}
                <div className={`text-xs font-medium px-2 py-1 rounded-full bg-black/40 transition-all duration-300 ${
                  isWinning ? 'bg-yellow-400/40 text-yellow-200 scale-110' : 'text-white/80'
                }`}>
                  {tile.multiplier}
                </div>
                
                {/* Win effects */}
                {isWinning && (
                  <>
                    <div className="absolute inset-0 bg-yellow-400/20 animate-pulse rounded"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent animate-ping"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Motion Effects */}
        {isAnimating && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: '0.4s' }}></div>
            
            {/* Speed lines */}
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
          </>
        )}

        {/* Side fades */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none z-10"></div>
      </div>

      {/* Win Celebration */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in fade-in duration-700">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-4 rounded-2xl font-bold text-2xl shadow-2xl border-4 border-yellow-300 animate-bounce">
            🎯 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎯
          </div>
        </div>
      )}
      
      {/* Status */}
      <div className="text-center mt-6">
        <p className="text-xl font-semibold">
          {isAnimating ? (
            winningSlot !== null ? 
              <span className="text-orange-400 animate-pulse">🎯 Landing on result...</span> :
              <span className="text-cyan-400 animate-pulse">🎰 Spinning fast...</span>
          ) : winningSlot !== null ? (
            <span className="text-emerald-400">
              🏆 Winner: {REEL_SLOTS[winningSlot]?.color} {REEL_SLOTS[winningSlot]?.slot} ({REEL_SLOTS[winningSlot]?.multiplier})
            </span>
          ) : (
            <span className="text-gray-400">🎮 Ready to spin!</span>
          )}
        </p>
      </div>
    </div>
  );
};