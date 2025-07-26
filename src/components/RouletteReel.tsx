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
  const initialPositionRef = useRef<number>(0);
  const targetPositionRef = useRef<number>(0);

  const SLOT_WIDTH = 120;
  const TOTAL_SLOTS = REEL_SLOTS.length;
  const ANIMATION_DURATION = 4000; // 4 seconds
  const SPIN_CYCLES = 4; // Number of full rotations before stopping

  // Easing function for realistic deceleration (ease-out-cubic)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Reset reel position
  const resetPosition = () => {
    setPosition(0);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Start the spinning animation
  const startAnimation = (targetSlot: number) => {
    if (isAnimating) return;

    console.log('🎰 Starting reel animation to slot:', targetSlot);
    
    // Calculate the exact position where the target slot should be centered
    const containerCenterX = window.innerWidth > 1024 ? 240 : 180; // Adjust based on screen size
    const targetSlotPosition = targetSlot * SLOT_WIDTH;
    const totalSpinDistance = SPIN_CYCLES * TOTAL_SLOTS * SLOT_WIDTH;
    const finalPosition = -(totalSpinDistance + targetSlotPosition - containerCenterX);

    console.log('🎰 Animation params:', {
      targetSlot,
      targetSlotPosition,
      totalSpinDistance,
      containerCenterX,
      finalPosition,
      currentPosition: position
    });

    setIsAnimating(true);
    initialPositionRef.current = position;
    targetPositionRef.current = finalPosition;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Apply easing for realistic deceleration
      const easedProgress = easeOutCubic(progress);
      
      // Calculate current position
      const currentPosition = initialPositionRef.current + 
        (targetPositionRef.current - initialPositionRef.current) * easedProgress;
      
      setPosition(currentPosition);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        console.log('🎰 Animation completed, final position:', currentPosition);
        setIsAnimating(false);
        // Ensure exact final position
        setPosition(targetPositionRef.current);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle spinning state changes
  useEffect(() => {
    console.log('🎰 Reel state:', { isSpinning, winningSlot, isAnimating });

    if (isSpinning && winningSlot !== null && !isAnimating) {
      startAnimation(winningSlot);
    } else if (!isSpinning && !showWinAnimation) {
      // Reset after some delay when round is completely over
      const timer = setTimeout(() => {
        resetPosition();
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, winningSlot, showWinAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const getSlotColorClass = (color: string) => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-emerald-300 shadow-lg shadow-emerald-500/30';
      case 'red': 
        return 'bg-gradient-to-b from-red-400 to-red-600 text-white border-red-300 shadow-lg shadow-red-500/30';
      case 'black': 
        return 'bg-gradient-to-b from-gray-700 to-gray-900 text-white border-gray-500 shadow-lg shadow-gray-500/30';
      default: 
        return 'bg-gray-500 text-white';
    }
  };

  // Create extended slots for seamless scrolling
  const extendedSlots = [];
  for (let cycle = 0; cycle < 8; cycle++) {
    extendedSlots.push(...REEL_SLOTS.map((slot, index) => ({
      ...slot,
      uniqueKey: `${cycle}-${index}`
    })));
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Reel Container */}
      <div className="relative h-32 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-4 border-yellow-400 overflow-hidden shadow-2xl">
        
        {/* Center Selection Indicator */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-32 z-20 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
          </div>
          
          {/* Center highlight area */}
          <div className="absolute inset-y-0 inset-x-0 border-l-2 border-r-2 border-yellow-400 bg-yellow-400/10 backdrop-blur-sm">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-400/80"></div>
          </div>
        </div>

        {/* Rolling Reel */}
        <div 
          className="flex h-full relative"
          style={{
            transform: `translateX(${position}px)`,
            willChange: isAnimating ? 'transform' : 'auto',
          }}
        >
          {extendedSlots.map((slot, index) => {
            const isWinningSlot = !isAnimating && showWinAnimation && slot.slot === winningSlot;
            return (
              <div
                key={slot.uniqueKey}
                className={`flex-shrink-0 h-full flex flex-col items-center justify-center border-r border-gray-600 relative transition-all duration-300 ${getSlotColorClass(slot.color)} ${
                  isWinningSlot ? 'scale-110 z-10 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50' : ''
                }`}
                style={{ width: `${SLOT_WIDTH}px` }}
              >
                {/* Slot number */}
                <div className={`text-3xl font-bold mb-1 drop-shadow-lg transition-transform duration-300 ${
                  isWinningSlot ? 'scale-110 text-yellow-200' : ''
                }`}>
                  {slot.slot}
                </div>
                
                {/* Multiplier */}
                <div className={`text-xs font-semibold px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm transition-all duration-300 ${
                  isWinningSlot ? 'bg-yellow-400/30 text-yellow-200 scale-110' : 'text-white/90'
                }`}>
                  {slot.multiplier}
                </div>
                
                {/* Winning glow effect */}
                {isWinningSlot && (
                  <>
                    <div className="absolute inset-0 bg-yellow-400/20 animate-pulse rounded-lg"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-ping"></div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Motion blur effect during animation */}
        {isAnimating && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent animate-pulse pointer-events-none" style={{ animationDuration: '0.5s' }}></div>
          </>
        )}

        {/* Side vignette for depth */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-900/90 to-transparent pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-900/90 to-transparent pointer-events-none"></div>
      </div>

      {/* Win Celebration */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-8 py-4 rounded-2xl font-bold text-2xl shadow-2xl border-4 border-yellow-300 animate-bounce">
            🎉 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎉
          </div>
        </div>
      )}
      
      {/* Status Display */}
      <div className="text-center mt-6 space-y-2">
        <p className="text-xl font-semibold">
          {isAnimating ? (
            <span className="text-blue-400 animate-pulse">🎰 Spinning the reel...</span>
          ) : winningSlot !== null ? (
            <span className="text-emerald-400">
              🎯 Result: {REEL_SLOTS[winningSlot]?.color} {REEL_SLOTS[winningSlot]?.slot} ({REEL_SLOTS[winningSlot]?.multiplier})
            </span>
          ) : (
            <span className="text-gray-400">🎮 Place your bets and watch the reel spin!</span>
          )}
        </p>
        
        {isAnimating && (
          <p className="text-sm text-gray-500 animate-pulse">
            Watch the reel slow down and land on the winning number...
          </p>
        )}
      </div>
    </div>
  );
};