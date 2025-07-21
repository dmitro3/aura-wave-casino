import { useEffect, useState } from 'react';

interface RouletteWheelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
}

const WHEEL_SLOTS = [
  { slot: 0, color: 'green' },
  { slot: 1, color: 'red' },
  { slot: 2, color: 'black' },
  { slot: 3, color: 'red' },
  { slot: 4, color: 'black' },
  { slot: 5, color: 'red' },
  { slot: 6, color: 'black' },
  { slot: 7, color: 'red' },
  { slot: 8, color: 'black' },
  { slot: 9, color: 'red' },
  { slot: 10, color: 'black' },
  { slot: 11, color: 'red' },
  { slot: 12, color: 'black' },
  { slot: 13, color: 'red' },
  { slot: 14, color: 'black' }
];

export const RouletteWheel = ({ isSpinning, winningSlot, showWinAnimation }: RouletteWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isSpinning && winningSlot !== null) {
      setIsAnimating(true);
      
      // Calculate target rotation based on winning slot
      const slotAngle = 360 / 15; // 15 slots
      const targetAngle = winningSlot * slotAngle;
      const spins = 5; // Number of full rotations
      const finalRotation = spins * 360 + (360 - targetAngle); // Reverse direction since wheel spins opposite
      
      setRotation(finalRotation);
      
      // Stop animation after spin completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 4000);
    }
  }, [isSpinning, winningSlot]);

  const getSlotColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-900';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Wheel Container */}
      <div className="relative w-80 h-80 mx-auto">
        {/* Pointer */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400"></div>
        </div>
        
        {/* Wheel */}
        <div 
          className={`w-full h-full rounded-full border-4 border-yellow-400 relative overflow-hidden shadow-2xl ${
            isAnimating ? 'transition-transform duration-[4s] ease-out' : ''
          } ${showWinAnimation ? 'animate-pulse glow-effect' : ''}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            background: 'conic-gradient(from 0deg, ' + 
              WHEEL_SLOTS.map((slot, index) => {
                const startAngle = (index * 24) + 'deg';
                const endAngle = ((index + 1) * 24) + 'deg';
                const color = slot.color === 'green' ? '#10b981' : 
                             slot.color === 'red' ? '#ef4444' : '#1f2937';
                return `${color} ${startAngle}, ${color} ${endAngle}`;
              }).join(', ') + ')'
          }}
        >
          {/* Slot Numbers */}
          {WHEEL_SLOTS.map((slot, index) => {
            const angle = (index * 24) + 12; // Center of each slot
            const radius = 120;
            const x = Math.cos((angle - 90) * Math.PI / 180) * radius + 160;
            const y = Math.sin((angle - 90) * Math.PI / 180) * radius + 160;
            
            return (
              <div
                key={slot.slot}
                className="absolute text-white font-bold text-sm transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`
                }}
              >
                {slot.slot}
              </div>
            );
          })}
          
          {/* Center Circle */}
          <div className="absolute inset-1/2 w-8 h-8 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-yellow-500 shadow-lg"></div>
        </div>
        
        {/* Spinning Effect Overlay */}
        {isAnimating && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin"></div>
        )}
      </div>
      
      {/* Win Animation */}
      {showWinAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-6xl font-bold text-yellow-400 animate-bounce drop-shadow-2xl">
            🎉 WIN! 🎉
          </div>
        </div>
      )}
      
      {/* Status Text */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-lg font-medium">
          {isAnimating ? 'Spinning...' : winningSlot !== null ? `Result: ${winningSlot}` : 'Place your bets!'}
        </p>
      </div>
    </div>
  );
};