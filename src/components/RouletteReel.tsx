import { useEffect, useState } from 'react';

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
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    console.log('🎰 Reel state change:', { isSpinning, winningSlot, showWinAnimation, isAnimating });
    
    // Start animation when spinning begins
    if (isSpinning && !isAnimating) {
      console.log('🎰 Starting smooth reel animation');
      setIsAnimating(true);
      setAnimationKey(prev => prev + 1);
      
      const slotWidth = 120;
      const totalSlots = REEL_SLOTS.length; // 15 slots
      const containerWidth = 4 * slotWidth; // Approximate visible container width
      const centerOffset = containerWidth / 2 - slotWidth / 2; // Perfect center positioning
      
      if (winningSlot !== null) {
        // Calculate precise final position to center the winning slot perfectly
        const fullCycles = 5; // Dramatic effect with 5 full cycles
        const totalCycleDistance = fullCycles * totalSlots * slotWidth;
        const winningSlotOffset = winningSlot * slotWidth;
        const finalPosition = -(totalCycleDistance + winningSlotOffset - centerOffset);
        
        console.log('🎰 Animation calculation:', {
          slotWidth,
          totalSlots,
          winningSlot,
          fullCycles,
          totalCycleDistance,
          winningSlotOffset,
          centerOffset,
          finalPosition
        });
        
        // Start animation with a slight delay for smoothness
        setTimeout(() => {
          setTranslateX(finalPosition);
        }, 50);
        
        // Stop animation state after duration
        setTimeout(() => {
          setIsAnimating(false);
          console.log('🎰 Animation completed, landed on slot:', winningSlot);
        }, 4500); // Slightly longer to account for easing
        
      } else {
        console.log('🎰 No winning slot yet, starting continuous spin');
        // Start a continuous high-speed animation
        setTimeout(() => {
          setTranslateX(-(5 * totalSlots * slotWidth));
        }, 50);
      }
    }
    
    // Reset when not spinning and no win animation
    else if (!isSpinning && !showWinAnimation && translateX !== 0) {
      console.log('🎰 Resetting reel position');
      setTranslateX(0);
      setIsAnimating(false);
    }
  }, [isSpinning, winningSlot, showWinAnimation]);

  const getSlotColorClass = (color: string) => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-b from-green-400 to-green-600 text-white border-green-300 shadow-green-400/50';
      case 'red': 
        return 'bg-gradient-to-b from-red-400 to-red-600 text-white border-red-300 shadow-red-400/50';
      case 'black': 
        return 'bg-gradient-to-b from-gray-700 to-gray-900 text-white border-gray-600 shadow-gray-400/50';
      default: 
        return 'bg-gray-500 text-white';
    }
  };

  // Create multiple cycles of slots for smooth animation
  const extendedSlots = [];
  for (let cycle = 0; cycle < 8; cycle++) { // More cycles for longer animation
    extendedSlots.push(...REEL_SLOTS.map((slot, index) => ({
      ...slot,
      uniqueKey: `${cycle}-${index}`
    })));
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Reel Container */}
      <div className="relative h-32 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-xl border-4 border-yellow-400 overflow-hidden shadow-2xl">
        {/* Selection Indicator - Center positioned */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-32 border-l-4 border-r-4 border-yellow-400 bg-yellow-400/20 z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
          {/* Center highlight line */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-0.5 w-1 bg-yellow-400/60"></div>
        </div>

        {/* Rolling Reel */}
        <div 
          key={animationKey}
          className={`flex h-full ${
            isAnimating 
              ? 'transition-transform duration-[4500ms]' 
              : 'transition-none'
          }`}
          style={{
            transform: `translateX(${translateX}px)`,
            willChange: isAnimating ? 'transform' : 'auto',
            transitionTimingFunction: isAnimating 
              ? 'cubic-bezier(0.15, 0.0, 0.25, 1.0)' // Custom easing: fast start, smooth slow end
              : 'none'
          }}
        >
          {extendedSlots.map((slot, index) => (
            <div
              key={slot.uniqueKey}
              className={`flex-shrink-0 h-full flex flex-col items-center justify-center border-r-2 border-gray-600 relative ${getSlotColorClass(slot.color)} ${
                showWinAnimation && slot.slot === winningSlot && !isAnimating 
                  ? 'animate-pulse shadow-2xl ring-4 ring-yellow-400 scale-105 z-20' 
                  : ''
              }`}
              style={{ width: '120px' }}
            >
              {/* Slot number */}
              <div className="text-3xl font-bold mb-1 drop-shadow-lg">
                {slot.slot}
              </div>
              {/* Multiplier */}
              <div className="text-xs font-medium opacity-90 bg-black/20 px-2 py-0.5 rounded">
                {slot.multiplier}
              </div>
              
              {/* Winning glow effect */}
              {showWinAnimation && slot.slot === winningSlot && !isAnimating && (
                <div className="absolute inset-0 bg-yellow-400/30 animate-pulse rounded"></div>
              )}
            </div>
          ))}
        </div>

        {/* Spinning Effect Overlays */}
        {isAnimating && (
          <>
            {/* Speed lines effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-ping"></div>
            
            {/* Motion blur effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-pulse" 
                 style={{ animationDuration: '0.3s' }}></div>
          </>
        )}

        {/* Side gradients for depth */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-gray-900/80 to-transparent pointer-events-none z-5"></div>
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-gray-900/80 to-transparent pointer-events-none z-5"></div>
      </div>

      {/* Win Animation */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-4xl font-bold text-yellow-400 animate-bounce drop-shadow-2xl bg-black/80 px-6 py-3 rounded-xl border-2 border-yellow-400">
            🎉 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎉
          </div>
        </div>
      )}
      
      {/* Status Text */}
      <div className="text-center mt-4">
        <p className="text-lg font-medium">
          {isAnimating ? 
            '🎰 Rolling the reel...' : 
            winningSlot !== null ? 
              `🎯 Landed on: ${REEL_SLOTS[winningSlot]?.color} ${REEL_SLOTS[winningSlot]?.slot} (${REEL_SLOTS[winningSlot]?.multiplier})` : 
              '🎮 Place your bets and watch the reel roll!'
          }
        </p>
        {isAnimating && (
          <p className="text-sm text-muted-foreground mt-1 animate-pulse">
            The reel is spinning... watch it slow down and land on the winning number!
          </p>
        )}
      </div>
    </div>
  );
};