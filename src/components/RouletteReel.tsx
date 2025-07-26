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
  const startTimeRef = useRef<number>();

  const TILE_WIDTH = 100;
  const TOTAL_TILES = REEL_SLOTS.length;
  const TOTAL_ANIMATION_DURATION = 5000; // 5 seconds total
  const ACCELERATION_PHASE = 800; // 0.8 seconds to reach max speed
  const DECELERATION_PHASE = 3200; // 3.2 seconds to slow down
  const HIGH_SPEED_PHASE = TOTAL_ANIMATION_DURATION - ACCELERATION_PHASE - DECELERATION_PHASE; // 1 second at max speed

  // Physics-inspired easing functions
  const easeInQuart = (t: number): number => t * t * t * t; // Rapid acceleration
  const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4); // Natural deceleration with friction
  
  const resetReel = () => {
    console.log('🎰 Resetting reel to initial position');
    setPosition(0);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const startReelAnimation = (targetSlot: number) => {
    if (isAnimating) return;
    
    console.log('🎰 Starting physics-based reel animation to slot:', targetSlot);
    
    setIsAnimating(true);
    startTimeRef.current = performance.now();
    
    // Calculate distances and speeds for realistic physics
    const containerCenter = 300; // Center of visible area
    const singleCycleDistance = TOTAL_TILES * TILE_WIDTH;
    const totalCycles = 8; // More cycles for dramatic effect
    const totalSpinDistance = totalCycles * singleCycleDistance;
    const targetTilePosition = targetSlot * TILE_WIDTH;
    const finalTargetPosition = -(totalSpinDistance + targetTilePosition - containerCenter);
    
    console.log('🎰 Physics calculation:', {
      targetSlot,
      containerCenter,
      singleCycleDistance,
      totalCycles,
      totalSpinDistance,
      targetTilePosition,
      finalTargetPosition
    });

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / TOTAL_ANIMATION_DURATION, 1);
      
      let currentPosition = 0;
      
      if (elapsed <= ACCELERATION_PHASE) {
        // Phase 1: Rapid acceleration (ease-in-quart)
        const accelerationProgress = elapsed / ACCELERATION_PHASE;
        const accelerationEase = easeInQuart(accelerationProgress);
        const accelerationDistance = (totalSpinDistance * 0.15) * accelerationEase; // 15% of total distance during acceleration
        currentPosition = -accelerationDistance;
        
      } else if (elapsed <= ACCELERATION_PHASE + HIGH_SPEED_PHASE) {
        // Phase 2: High-speed constant momentum
        const accelerationDistance = totalSpinDistance * 0.15;
        const highSpeedProgress = (elapsed - ACCELERATION_PHASE) / HIGH_SPEED_PHASE;
        const highSpeedDistance = (totalSpinDistance * 0.35) * highSpeedProgress; // 35% at constant high speed
        currentPosition = -(accelerationDistance + highSpeedDistance);
        
      } else {
        // Phase 3: Realistic deceleration with friction (ease-out-quart)
        const accelerationDistance = totalSpinDistance * 0.15;
        const highSpeedDistance = totalSpinDistance * 0.35;
        const decelerationProgress = (elapsed - ACCELERATION_PHASE - HIGH_SPEED_PHASE) / DECELERATION_PHASE;
        const decelerationEase = easeOutQuart(decelerationProgress);
        
        // Remaining 50% distance during deceleration, ending at exact target
        const remainingDistance = finalTargetPosition + accelerationDistance + highSpeedDistance;
        const decelerationDistance = remainingDistance * decelerationEase;
        
        currentPosition = -(accelerationDistance + highSpeedDistance + decelerationDistance);
      }
      
      setPosition(currentPosition);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact final position
        console.log('🎰 Animation completed! Final position:', finalTargetPosition);
        setPosition(finalTargetPosition);
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle state changes
  useEffect(() => {
    console.log('🎰 Reel state change:', { isSpinning, winningSlot, isAnimating });

    if (isSpinning && winningSlot !== null && !isAnimating) {
      startReelAnimation(winningSlot);
    } else if (!isSpinning && !showWinAnimation) {
      // Reset after round ends
      setTimeout(resetReel, 2000);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, winningSlot, showWinAnimation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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

  // Create seamless repeating tiles for smooth scrolling
  const seamlessTiles = [];
  const totalRepeats = 12; // More repeats for longer seamless animation
  for (let repeat = 0; repeat < totalRepeats; repeat++) {
    REEL_SLOTS.forEach((slot, index) => {
      seamlessTiles.push({
        ...slot,
        uniqueKey: `${repeat}-${index}`
      });
    });
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      
      {/* Main Reel Container */}
      <div className="relative h-24 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-3 border-yellow-500 overflow-hidden shadow-2xl">
        
        {/* Static Center Highlight Frame */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-24 z-30 pointer-events-none">
          {/* Top indicator */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>
          
          {/* Bottom indicator */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-yellow-500"></div>
          </div>
          
          {/* Center frame */}
          <div className="absolute inset-0 border-l-2 border-r-2 border-yellow-500 bg-yellow-500/5 backdrop-blur-sm">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-500/60"></div>
          </div>
        </div>

        {/* Horizontal Rolling Tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${position}px)`,
            willChange: isAnimating ? 'transform' : 'auto',
          }}
        >
          {seamlessTiles.map((tile) => {
            const isWinningTile = !isAnimating && showWinAnimation && tile.slot === winningSlot;
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-16 flex flex-col items-center justify-center border-r border-gray-700 relative transition-all duration-500 ${getTileColorClass(tile.color)} ${
                  isWinningTile ? 'scale-110 ring-3 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                {/* Tile Number */}
                <div className={`text-xl font-bold drop-shadow-md transition-all duration-300 ${
                  isWinningTile ? 'text-yellow-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Multiplier Badge */}
                <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-300 ${
                  isWinningTile ? 'bg-yellow-400/40 text-yellow-200 scale-110' : 'text-white/80'
                }`}>
                  {tile.multiplier}
                </div>
                
                {/* Winning Glow Effects */}
                {isWinningTile && (
                  <>
                    <div className="absolute inset-0 bg-yellow-400/15 animate-pulse rounded"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-ping"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* High-Speed Motion Effects */}
        {isAnimating && (
          <>
            {/* Speed blur lines */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/8 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: '0.4s' }}></div>
            
            {/* Motion streaks */}
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          </>
        )}

        {/* Side fade gradients for infinite effect */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none z-10"></div>
      </div>

      {/* Win Celebration Overlay */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in fade-in duration-700">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl font-bold text-xl shadow-2xl border-3 border-yellow-300 animate-bounce">
            🎯 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎯
          </div>
        </div>
      )}
      
      {/* Status Information */}
      <div className="text-center mt-4 space-y-1">
        <p className="text-lg font-semibold">
          {isAnimating ? (
            <span className="text-cyan-400 animate-pulse">🎰 Rolling at high speed...</span>
          ) : winningSlot !== null ? (
            <span className="text-emerald-400">
              🏆 Winner: {REEL_SLOTS[winningSlot]?.color} {REEL_SLOTS[winningSlot]?.slot} ({REEL_SLOTS[winningSlot]?.multiplier})
            </span>
          ) : (
            <span className="text-gray-400">🎮 Ready to spin! Place your bets...</span>
          )}
        </p>
        
        {isAnimating && (
          <p className="text-sm text-gray-500 animate-pulse">
            Building momentum... watch it slow down naturally...
          </p>
        )}
      </div>
    </div>
  );
};