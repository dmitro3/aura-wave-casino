import { useEffect, useState, useRef, useMemo } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
}

// Roulette wheel configuration: 15 slots total in specific order
const WHEEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: '14x' },
  { slot: 11, color: 'black', multiplier: '2x' },
  { slot: 5, color: 'red', multiplier: '2x' },
  { slot: 10, color: 'black', multiplier: '2x' },
  { slot: 6, color: 'red', multiplier: '2x' },
  { slot: 9, color: 'black', multiplier: '2x' },
  { slot: 7, color: 'red', multiplier: '2x' },
  { slot: 8, color: 'black', multiplier: '2x' },
  { slot: 1, color: 'red', multiplier: '2x' },
  { slot: 14, color: 'black', multiplier: '2x' },
  { slot: 2, color: 'red', multiplier: '2x' },
  { slot: 13, color: 'black', multiplier: '2x' },
  { slot: 3, color: 'red', multiplier: '2x' },
  { slot: 12, color: 'black', multiplier: '2x' },
  { slot: 4, color: 'red', multiplier: '2x' }
];

// Core constants
const TILE_WIDTH = 120;
const CONTAINER_WIDTH = 1200;
const CENTER_X = CONTAINER_WIDTH / 2; // 600px - where winning slot must end up

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  // State
  const [reelPosition, setReelPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  console.log('🎰 RouletteReel render:', { isSpinning, winningSlot, synchronizedPosition, reelPosition });

  // Generate tiles once - never change
  const tiles = useMemo(() => {
    const allTiles = [];
    const repetitions = 25;
    
    for (let rep = 0; rep < repetitions; rep++) {
      for (let i = 0; i < WHEEL_SLOTS.length; i++) {
        allTiles.push({
          ...WHEEL_SLOTS[i],
          id: `tile-${rep}-${i}`,
          globalIndex: rep * WHEEL_SLOTS.length + i
        });
      }
    }
    
    console.log(`Generated ${allTiles.length} tiles`);
    return allTiles;
  }, []);

  // Container setup
  useEffect(() => {
    if (containerRef.current && !containerReady) {
      setContainerReady(true);
      console.log('Container ready');
    }
  }, [containerReady]);

  // Position sync (when not animating)
  useEffect(() => {
    if (synchronizedPosition !== null && synchronizedPosition !== undefined && !isAnimating) {
      console.log('Syncing position to:', synchronizedPosition);
      setReelPosition(synchronizedPosition);
    }
  }, [synchronizedPosition, isAnimating]);

  // BRAND NEW ANIMATION SYSTEM
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null) {
      console.log('🚀 STARTING FRESH ANIMATION');
      console.log('Target slot:', winningSlot);
      console.log('Target position:', synchronizedPosition);
      
      setIsAnimating(true);
      
      const startPos = reelPosition;
      const endPos = synchronizedPosition;
      
      // Calculate distance - always move left
      let finalPos = endPos;
      const oneFullRotation = WHEEL_SLOTS.length * TILE_WIDTH; // 15 * 120 = 1800px
      
      // Add rotations until we move left enough
      while (finalPos >= startPos - (5 * oneFullRotation)) {
        finalPos -= oneFullRotation;
      }
      
      const totalDistance = Math.abs(finalPos - startPos);
      
      console.log('Animation setup:', {
        start: startPos,
        end: endPos,
        final: finalPos,
        distance: totalDistance,
        rotations: (totalDistance / oneFullRotation).toFixed(1)
      });
      
      // Animation timing - YOUR SPECIFICATION
      const SPEED_UP_TIME = 500;    // 0.5s
      const FAST_TIME = 1000;       // 1.0s  
      const SLOW_DOWN_TIME = 1500;  // 1.5s
      const TOTAL_TIME = SPEED_UP_TIME + FAST_TIME + SLOW_DOWN_TIME; // 3.0s
      
      const startTime = Date.now();
      
      const runAnimation = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= TOTAL_TIME) {
          // Animation finished
          setReelPosition(finalPos);
          setIsAnimating(false);
          console.log('✅ Animation finished at position:', finalPos);
          
          // Verify landing
          verifyWinningSlotPosition(winningSlot, finalPos);
          
        } else {
          // Calculate progress
          let progress = 0;
          
          if (elapsed <= SPEED_UP_TIME) {
            // Speeding up phase
            const t = elapsed / SPEED_UP_TIME;
            progress = t * t * 0.2; // 0 to 20%
          } else if (elapsed <= SPEED_UP_TIME + FAST_TIME) {
            // Fast phase
            const t = (elapsed - SPEED_UP_TIME) / FAST_TIME;
            progress = 0.2 + (t * 0.6); // 20% to 80%
          } else {
            // Slowing down phase
            const t = (elapsed - SPEED_UP_TIME - FAST_TIME) / SLOW_DOWN_TIME;
            const easeOut = 1 - Math.pow(1 - t, 3);
            progress = 0.8 + (easeOut * 0.2); // 80% to 100%
          }
          
          const currentPos = startPos + (finalPos - startPos) * progress;
          setReelPosition(currentPos);
          
          animationFrameRef.current = requestAnimationFrame(runAnimation);
        }
      };
      
      // Start animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(runAnimation);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, reelPosition]);

  // Stop animation when round ends
  useEffect(() => {
    if (!isSpinning && isAnimating) {
      console.log('Round ended - stopping animation');
      setIsAnimating(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isSpinning, isAnimating]);

  // Verify winning slot lands at center
  const verifyWinningSlotPosition = (slot: number | null, position: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Find closest instance of winning slot to center
    let bestDistance = Infinity;
    let bestCenter = 0;
    
    for (let rep = 0; rep < 25; rep++) {
      const tileIndex = rep * WHEEL_SLOTS.length + slotIndex;
      const tileLeft = position + (tileIndex * TILE_WIDTH);
      const tileCenter = tileLeft + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenter - CENTER_X);
      
      if (distanceFromCenter < bestDistance) {
        bestDistance = distanceFromCenter;
        bestCenter = tileCenter;
      }
    }
    
    console.log('🎯 Landing check:', {
      slot,
      expectedCenter: CENTER_X,
      actualCenter: bestCenter,
      distance: bestDistance.toFixed(1) + 'px',
      accurate: bestDistance < 15 ? '✅' : '❌'
    });
  };

  // Tile styling
  const getTileStyle = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-700 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-800 to-black text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (!containerReady) {
    return (
      <div className="relative w-full max-w-7xl mx-auto">
        <div className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gray-800 flex items-center justify-center">
          <div className="text-white">Loading reel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl">
        
        {/* Center line - target for winning slot */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-emerald-400 z-30 shadow-lg">
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400"></div>
          </div>
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400"></div>
          </div>
        </div>

        {/* Reel tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${reelPosition}px)`,
          }}
        >
          {tiles.map((tile) => {
            const tileLeft = reelPosition + (tile.globalIndex * TILE_WIDTH);
            const tileCenter = tileLeft + (TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileCenter - CENTER_X);
            
            const isWinningAndCentered = tile.slot === winningSlot && 
                                       !isAnimating && 
                                       showWinAnimation && 
                                       distanceFromCenter < 60;
            
            return (
              <div
                key={tile.id}
                className={`flex-shrink-0 h-28 flex items-center justify-center border ${getTileStyle(tile.color)} ${
                  isWinningAndCentered ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl z-20' : ''
                }`}
                style={{ width: `${TILE_WIDTH}px` }}
              >
                <div className={`text-2xl font-bold ${isWinningAndCentered ? 'text-emerald-200' : ''}`}>
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