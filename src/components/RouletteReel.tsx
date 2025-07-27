import { useEffect, useState, useRef, useCallback } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
}

// Roulette wheel configuration: 15 slots in order
const WHEEL_SLOTS = [
  { slot: 0, color: 'green', icon: Dice1 },
  { slot: 11, color: 'black', icon: Dice2 },
  { slot: 5, color: 'red', icon: Dice3 },
  { slot: 10, color: 'black', icon: Dice4 },
  { slot: 6, color: 'red', icon: Dice5 },
  { slot: 9, color: 'black', icon: Dice6 },
  { slot: 7, color: 'red', icon: Dice1 },
  { slot: 8, color: 'black', icon: Dice2 },
  { slot: 1, color: 'red', icon: Dice3 },
  { slot: 14, color: 'black', icon: Dice4 },
  { slot: 2, color: 'red', icon: Dice5 },
  { slot: 13, color: 'black', icon: Dice6 },
  { slot: 3, color: 'red', icon: Dice1 },
  { slot: 12, color: 'black', icon: Dice2 },
  { slot: 4, color: 'red', icon: Dice3 }
];

const TILE_WIDTH = 140; // Increased width for better visual impact
const CONTAINER_WIDTH = 1200;
const CENTER_OFFSET = CONTAINER_WIDTH / 2;
const BUFFER_MULTIPLIER = 5; // 5x buffer for seamless looping

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'spinning' | 'decelerating' | 'stopped'>('idle');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const targetPositionRef = useRef<number>(0);
  const initialPositionRef = useRef<number>(0);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition, animationPhase });

  // Physics-based easing functions
  const easeInQuad = (t: number) => t * t;
  const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  
  // Calculate target position for winning slot
  const calculateTargetPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return 0;
    
    // Find the center instance of the winning slot
    const centerRepeat = Math.floor(BUFFER_MULTIPLIER / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    const targetTileCenter = targetTileIndex * TILE_WIDTH + TILE_WIDTH / 2;
    
    return CENTER_OFFSET - targetTileCenter;
  }, []);

  // Animation loop with physics-based movement
  const animate = useCallback(() => {
    const currentTime = Date.now();
    const elapsed = currentTime - startTimeRef.current;
    
    if (animationPhase === 'accelerating') {
      // Acceleration phase: 0-2 seconds
      const accelerationDuration = 2000;
      const progress = Math.min(elapsed / accelerationDuration, 1);
      const easedProgress = easeInQuad(progress);
      
      const maxSpeed = 800; // pixels per second
      const currentSpeed = maxSpeed * easedProgress;
      setCurrentSpeed(currentSpeed);
      
      const newPosition = initialPositionRef.current - (currentSpeed * elapsed / 1000);
      setTranslateX(newPosition);
      
      if (progress >= 1) {
        setAnimationPhase('spinning');
        startTimeRef.current = currentTime;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else if (animationPhase === 'spinning') {
      // Full speed spinning phase
      const newPosition = translateX - currentSpeed * 0.016; // 60fps
      setTranslateX(newPosition);
      
      // Continue spinning until we get the result
      if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
        setAnimationPhase('decelerating');
        startTimeRef.current = currentTime;
        targetPositionRef.current = synchronizedPosition;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else if (animationPhase === 'decelerating') {
      // Deceleration phase: 2-3 seconds
      const decelerationDuration = 2000;
      const progress = Math.min(elapsed / decelerationDuration, 1);
      const easedProgress = easeOutQuart(progress);
      
      const distance = targetPositionRef.current - initialPositionRef.current;
      const newPosition = initialPositionRef.current + (distance * easedProgress);
      setTranslateX(newPosition);
      
      if (progress >= 1) {
        setAnimationPhase('stopped');
        setCurrentSpeed(0);
        
        // Add bounce effect
        setTimeout(() => {
          const bounceDistance = 20;
          setTranslateX(prev => prev + bounceDistance);
          setTimeout(() => {
            setTranslateX(prev => prev - bounceDistance);
          }, 100);
        }, 50);
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    }
  }, [animationPhase, translateX, synchronizedPosition, easeInQuad, easeOutQuart]);

  // Start animation when spinning begins
  useEffect(() => {
    if (isSpinning && animationPhase === 'idle') {
      console.log('🚀 Starting roulette animation');
      setAnimationPhase('accelerating');
      startTimeRef.current = Date.now();
      initialPositionRef.current = translateX;
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isSpinning, animationPhase, animate]);

  // Reset animation state when round ends
  useEffect(() => {
    if (!isSpinning && animationPhase !== 'idle') {
      setAnimationPhase('idle');
      setCurrentSpeed(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isSpinning, animationPhase]);

  // Create a repeating loop of tiles with buffer for seamless looping
  const tiles = [];
  for (let repeat = 0; repeat < BUFFER_MULTIPLIER; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Clean up animation when component unmounts
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Get tile color styling with enhanced visual effects
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-emerald-300 text-white shadow-lg shadow-emerald-500/20';
      case 'red':
        return 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-red-300 text-white shadow-lg shadow-red-500/20';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 border-gray-600 text-white shadow-lg shadow-gray-800/20';
      default:
        return 'bg-gray-500 text-white';
    }
  };



  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container */}
      <div ref={containerRef} className="relative h-40 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-gray-600">
        
        {/* Center indicator line - Result marker */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-10 border-r-10 border-b-10 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-10 border-r-10 border-t-10 border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Center line */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-emerald-400 shadow-emerald-400/50 shadow-2xl blur-sm"></div>
        </div>

        {/* Motion blur overlay during high speed */}
        {currentSpeed > 400 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-20 pointer-events-none animate-pulse"></div>
        )}

        {/* Horizontal scrolling tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none', // No CSS transitions, we control animation with JS
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            // Calculate if this tile is near the center for highlighting
            const tileCenter = translateX + (tile.index * TILE_WIDTH + TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileCenter - CENTER_OFFSET);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = animationPhase === 'stopped' && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;
            const isSpinningTile = (animationPhase === 'accelerating' || animationPhase === 'spinning') && distanceFromCenter < TILE_WIDTH / 2;
            const IconComponent = tile.icon;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-32 flex flex-col items-center justify-center relative
                  border-2 shadow-lg transition-all duration-300
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20 animate-bounce' : ''}
                  ${isSpinningTile ? 'scale-105 z-10' : ''}
                  ${isNearCenter ? 'ring-1 ring-white/20' : ''}
                `}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                {/* Slot number */}
                <div className={`text-3xl font-bold drop-shadow-lg mb-1 ${
                  isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Icon */}
                <IconComponent className={`w-6 h-6 drop-shadow-lg ${
                  isWinningTile ? 'text-emerald-200 scale-125' : 'text-white/80'
                }`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}