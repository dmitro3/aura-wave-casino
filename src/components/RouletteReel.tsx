import { useEffect, useState, useRef, useCallback } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
}

// Roulette wheel configuration: 15 slots in order
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

const TILE_WIDTH = 120; // Width of each tile in pixels
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
      
      const newPosition = translateX - (currentSpeed * 0.016); // Move left (negative)
      setTranslateX(newPosition);
      
      if (progress >= 1) {
        setAnimationPhase('spinning');
        startTimeRef.current = currentTime;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else if (animationPhase === 'spinning') {
      // Full speed spinning phase - continuous movement
      const newPosition = translateX - currentSpeed * 0.016; // Move left continuously
      setTranslateX(newPosition);
      
      // Continue spinning until we get the result
      if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
        setAnimationPhase('decelerating');
        startTimeRef.current = currentTime;
        initialPositionRef.current = translateX;
        targetPositionRef.current = synchronizedPosition;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else if (animationPhase === 'decelerating') {
      // Deceleration phase: 2 seconds
      const decelerationDuration = 2000;
      const progress = Math.min(elapsed / decelerationDuration, 1);
      const easedProgress = easeOutQuart(progress);
      
      const distance = targetPositionRef.current - initialPositionRef.current;
      const newPosition = initialPositionRef.current + (distance * easedProgress);
      setTranslateX(newPosition);
      
      if (progress >= 1) {
        setAnimationPhase('stopped');
        setCurrentSpeed(0);
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

  // Get tile color styling
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white';
      case 'red':
        return 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };



  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container */}
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
        
        {/* Center indicator line */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400"></div>
          </div>
          
          {/* Center line */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-emerald-400 shadow-emerald-400/50 shadow-2xl blur-sm animate-pulse"></div>
        </div>

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

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-200
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${isNearCenter && animationPhase !== 'idle' ? 'scale-105 z-10' : ''}
                `}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}