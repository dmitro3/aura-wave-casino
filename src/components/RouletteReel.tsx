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
    console.log('🎰 Reel state change:', { isSpinning, winningSlot, showWinAnimation });
    
    if (isSpinning && winningSlot !== null && !isAnimating) {
      console.log('🎰 Starting reel animation for slot:', winningSlot);
      setIsAnimating(true);
      setAnimationKey(prev => prev + 1); // Force re-render for animation
      
      // Calculate target position based on winning slot
      const slotWidth = 120; // Width of each slot
      const totalSlots = REEL_SLOTS.length; // 15 slots
      const cycles = 4; // Number of full cycles before stopping
      
      // Calculate the final position to land on the winning slot
      // We need to position the winning slot at the center of the viewport
      const viewportCenter = 0; // Center position
      const targetSlotPosition = winningSlot * slotWidth;
      const totalDistance = cycles * totalSlots * slotWidth + targetSlotPosition;
      const finalPosition = -(totalDistance);
      
      console.log('🎰 Animation params:', {
        slotWidth,
        totalSlots,
        cycles,
        winningSlot,
        targetSlotPosition,
        totalDistance,
        finalPosition
      });
      
      // Start animation immediately
      setTimeout(() => {
        setTranslateX(finalPosition);
      }, 100);
      
      // Stop animation after spin completes
      setTimeout(() => {
        setIsAnimating(false);
        console.log('🎰 Animation completed');
      }, 4000);
    } else if (!isSpinning && winningSlot === null) {
      // Reset position when starting fresh
      console.log('🎰 Resetting reel position');
      setTranslateX(0);
      setIsAnimating(false);
    }
  }, [isSpinning, winningSlot]);

  const getSlotColorClass = (color: string) => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-b from-green-400 to-green-600 text-white border-green-300';
      case 'red': 
        return 'bg-gradient-to-b from-red-400 to-red-600 text-white border-red-300';
      case 'black': 
        return 'bg-gradient-to-b from-gray-700 to-gray-900 text-white border-gray-600';
      default: 
        return 'bg-gray-500 text-white';
    }
  };

  // Create multiple cycles of slots for smooth animation
  const extendedSlots = [];
  for (let cycle = 0; cycle < 6; cycle++) { // Increased cycles for longer animation
    extendedSlots.push(...REEL_SLOTS.map((slot, index) => ({
      ...slot,
      uniqueKey: `${cycle}-${index}`
    })));
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Reel Container */}
      <div className="relative h-32 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-xl border-4 border-yellow-400 overflow-hidden shadow-2xl">
        {/* Selection Indicator */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-32 border-l-4 border-r-4 border-yellow-400 bg-yellow-400/20 z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-yellow-400"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-yellow-400"></div>
        </div>

        {/* Rolling Reel */}
        <div 
          key={animationKey} // Force re-render for animation
          className={`flex h-full ${
            isAnimating ? 'transition-transform duration-[4000ms] ease-out' : 'transition-none'
          }`}
          style={{
            transform: `translateX(${translateX}px)`,
            willChange: isAnimating ? 'transform' : 'auto'
          }}
        >
          {extendedSlots.map((slot, index) => (
            <div
              key={slot.uniqueKey}
              className={`flex-shrink-0 h-full flex flex-col items-center justify-center border-r-2 border-gray-600 ${getSlotColorClass(slot.color)} ${
                showWinAnimation && slot.slot === winningSlot && !isAnimating ? 'animate-pulse shadow-2xl ring-4 ring-yellow-400' : ''
              }`}
              style={{ width: '120px' }}
            >
              <div className="text-3xl font-bold mb-1">
                {slot.slot}
              </div>
              <div className="text-xs font-medium opacity-80">
                {slot.multiplier}
              </div>
            </div>
          ))}
        </div>

        {/* Spinning Effect Overlay */}
        {isAnimating && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-ping"></div>
          </>
        )}
      </div>

      {/* Win Animation */}
      {showWinAnimation && winningSlot !== null && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-4xl font-bold text-yellow-400 animate-bounce drop-shadow-2xl bg-black/50 px-6 py-3 rounded-xl">
            🎉 {REEL_SLOTS[winningSlot]?.color.toUpperCase()} {REEL_SLOTS[winningSlot]?.slot} WINS! 🎉
          </div>
        </div>
      )}
      
      {/* Status Text */}
      <div className="text-center mt-4">
        <p className="text-lg font-medium">
          {isAnimating ? 
            '🎰 Rolling...' : 
            winningSlot !== null ? 
              `🎯 Result: ${REEL_SLOTS[winningSlot]?.color} ${REEL_SLOTS[winningSlot]?.slot} (${REEL_SLOTS[winningSlot]?.multiplier})` : 
              '🎮 Place your bets!'
          }
        </p>
        {isAnimating && (
          <p className="text-sm text-muted-foreground mt-1">
            The reel is spinning to determine the winner...
          </p>
        )}
      </div>
    </div>
  );
};