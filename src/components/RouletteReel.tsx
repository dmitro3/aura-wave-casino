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
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'spinning' | 'landing' | 'complete'>('idle');
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const TILE_WIDTH = 120;
  const FAST_SPIN_DURATION = 3000; // 3 seconds of fast spinning
  const LANDING_DURATION = 2000; // 2 seconds to land on result

  // Debug logging
  useEffect(() => {
    console.log('🎰 RouletteReel Props:', { 
      isSpinning, 
      winningSlot, 
      showWinAnimation, 
      isAnimating,
      currentPhase,
      position: position.toFixed(0)
    });
  }, [isSpinning, winningSlot, showWinAnimation, isAnimating, currentPhase, position]);

  // Calculate center position of the container
  const getCenterPosition = () => {
    if (containerRef.current) {
      return containerRef.current.offsetWidth / 2 - TILE_WIDTH / 2;
    }
    return 300; // fallback
  };

  // Start continuous spinning animation
  const startFastSpin = () => {
    console.log('🎰 Starting fast spin phase');
    setCurrentPhase('spinning');
    setIsAnimating(true);
    
    const spinSpeed = 2000; // pixels per second
    const startTime = performance.now();
    
    const continuousSpin = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const distance = (elapsed / 1000) * spinSpeed;
      setPosition(-distance);
      
      // Continue spinning if still in spin phase and no result yet
      if (currentPhase === 'spinning' && isSpinning) {
        animationRef.current = requestAnimationFrame(continuousSpin);
      }
    };
    
    animationRef.current = requestAnimationFrame(continuousSpin);
  };

  // Land on the winning slot with precise positioning
  const landOnResult = (targetSlot: number) => {
    console.log('🎰 Starting landing phase on slot:', targetSlot);
    setCurrentPhase('landing');
    
    // Calculate exact position for perfect center alignment
    const centerPos = getCenterPosition();
    const currentPos = position;
    
    // Add full cycles for dramatic effect
    const additionalCycles = 3;
    const cycleDistance = REEL_SLOTS.length * TILE_WIDTH;
    const totalAdditionalDistance = additionalCycles * cycleDistance;
    
    // Calculate target position to center the winning slot
    const targetSlotPosition = targetSlot * TILE_WIDTH;
    const finalPosition = currentPos - totalAdditionalDistance - targetSlotPosition + centerPos;
    
    console.log('🎰 Landing calculation:', {
      targetSlot,
      centerPos,
      currentPos,
      totalAdditionalDistance,
      targetSlotPosition,
      finalPosition
    });

    // Smooth transition to final position
    setPosition(finalPosition);
    
    // Animation complete after landing duration
    setTimeout(() => {
      console.log('🎰 Animation complete');
      setIsAnimating(false);
      setCurrentPhase('complete');
    }, LANDING_DURATION);
  };

  // Reset reel to initial state
  const resetReel = () => {
    console.log('🎰 Resetting reel');
    setPosition(0);
    setIsAnimating(false);
    setCurrentPhase('idle');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Main animation controller
  useEffect(() => {
    console.log('🎰 Animation controller triggered');
    
    if (isSpinning && currentPhase === 'idle') {
      // Start fast spinning immediately when isSpinning becomes true
      console.log('🎰 Starting animation - fast spin phase');
      startFastSpin();
    } else if (isSpinning && currentPhase === 'spinning' && winningSlot !== null) {
      // Switch to landing phase when result is available
      console.log('🎰 Switching to landing phase');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      landOnResult(winningSlot);
    } else if (!isSpinning && currentPhase !== 'idle') {
      // Reset when round ends
      console.log('🎰 Round ended, will reset in 3 seconds');
      setTimeout(resetReel, 3000);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, winningSlot, currentPhase]);

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

  // Create repeating tiles for seamless scrolling
  const tiles = [];
  const repeats = 20; // More repeats for longer seamless animation
  for (let repeat = 0; repeat < repeats; repeat++) {
    REEL_SLOTS.forEach((slot, index) => {
      tiles.push({
        ...slot,
        uniqueKey: `${repeat}-${index}`
      });
    });
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      
      {/* Debug Info */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-sm text-white grid grid-cols-2 gap-2">
        <div>isSpinning: <span className="text-green-400">{String(isSpinning)}</span></div>
        <div>winningSlot: <span className="text-blue-400">{winningSlot ?? 'null'}</span></div>
        <div>isAnimating: <span className="text-yellow-400">{String(isAnimating)}</span></div>
        <div>currentPhase: <span className="text-purple-400">{currentPhase}</span></div>
        <div>position: <span className="text-cyan-400">{position.toFixed(0)}px</span></div>
        <div>showWinAnimation: <span className="text-pink-400">{String(showWinAnimation)}</span></div>
      </div>

      {/* Main Reel Container */}
      <div 
        ref={containerRef}
        className="relative h-32 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-4 border-yellow-500 overflow-hidden shadow-2xl"
      >
        
        {/* Center Selection Rectangle */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-32 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-yellow-500 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-500 drop-shadow-lg"></div>
          </div>
          
          {/* Center highlight rectangle */}
          <div className="absolute inset-0 border-l-3 border-r-3 border-yellow-500 bg-yellow-500/10 backdrop-blur-sm rounded">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-500/80"></div>
          </div>
        </div>

        {/* Rolling Tiles */}
        <div 
          className={`flex h-full items-center ${
            currentPhase === 'landing' ? 'transition-transform duration-[2000ms] ease-out' : 'transition-none'
          }`}
          style={{
            transform: `translateX(${position}px)`,
            willChange: isAnimating ? 'transform' : 'auto',
          }}
        >
          {tiles.map((tile) => {
            const isWinning = currentPhase === 'complete' && showWinAnimation && tile.slot === winningSlot;
            return (
              <div
                key={tile.uniqueKey}
                className={`flex-shrink-0 h-24 flex flex-col items-center justify-center border-r-2 border-gray-600 relative transition-all duration-500 ${getTileColorClass(tile.color)} ${
                  isWinning ? 'scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                {/* Slot Number */}
                <div className={`text-2xl font-bold drop-shadow-lg transition-all duration-300 ${
                  isWinning ? 'text-yellow-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Multiplier */}
                <div className={`text-xs font-medium px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm transition-all duration-300 ${
                  isWinning ? 'bg-yellow-400/40 text-yellow-200 scale-110' : 'text-white/80'
                }`}>
                  {tile.multiplier}
                </div>
                
                {/* Winning Effects */}
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
        {currentPhase === 'spinning' && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: '0.3s' }}></div>
            
            {/* Speed lines */}
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </>
        )}

        {/* Side Gradients */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none z-10"></div>
      </div>

      {/* Win Celebration */}
      {showWinAnimation && winningSlot !== null && currentPhase === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in fade-in duration-700">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-4 rounded-2xl font-bold text-2xl shadow-2xl border-4 border-yellow-300 animate-bounce">
            🎯 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎯
          </div>
        </div>
      )}
      
      {/* Status */}
      <div className="text-center mt-6">
        <p className="text-xl font-semibold">
          {currentPhase === 'spinning' ? (
            <span className="text-cyan-400 animate-pulse">🎰 Spinning at high speed...</span>
          ) : currentPhase === 'landing' ? (
            <span className="text-orange-400 animate-pulse">🎯 Landing on result...</span>
          ) : winningSlot !== null ? (
            <span className="text-emerald-400">
              🏆 Result: {REEL_SLOTS[winningSlot]?.color} {REEL_SLOTS[winningSlot]?.slot} ({REEL_SLOTS[winningSlot]?.multiplier})
            </span>
          ) : (
            <span className="text-gray-400">🎮 Ready to spin!</span>
          )}
        </p>
      </div>
    </div>
  );
};