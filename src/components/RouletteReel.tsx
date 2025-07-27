import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

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

// Fixed configuration for truly device-independent positioning
const REEL_HEIGHT = 120; // Fixed reel height in pixels
const LOGICAL_TILE_SIZE = 100; // Fixed logical tile size (device-independent)
const VISIBLE_LOGICAL_TILES = 9; // Fixed number of visible logical tiles
const BUFFER_MULTIPLIER = 10; // 10x buffer for seamless looping

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [logicalTranslateX, setLogicalTranslateX] = useState(0); // Logical position (device-independent)
  const [isAnimating, setIsAnimating] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1); // Scale factor to convert logical to physical pixels
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpinningState = useRef<boolean>(false);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, logicalTranslateX, synchronizedPosition, isAnimating, scaleFactor });

  // Calculate scale factor based on container width to maintain consistent logical positioning
  const updateScaleFactor = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const visibleLogicalWidth = VISIBLE_LOGICAL_TILES * LOGICAL_TILE_SIZE;
      const newScaleFactor = containerWidth / visibleLogicalWidth;
      
      setScaleFactor(newScaleFactor);
      
      console.log('📱 Scale factor calculation:', {
        containerWidth,
        visibleLogicalWidth,
        newScaleFactor,
        logicalTileSize: LOGICAL_TILE_SIZE,
        visibleLogicalTiles: VISIBLE_LOGICAL_TILES,
        device: containerWidth < 768 ? 'mobile' : containerWidth < 1024 ? 'tablet' : 'desktop'
      });
    }
  }, []);

  // Update scale factor on mount and resize
  useEffect(() => {
    updateScaleFactor();
    
    const handleResize = () => {
      updateScaleFactor();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScaleFactor]);

  // Generate tiles array with buffer for seamless looping
  const tiles = useMemo(() => {
    const tilesArray = [];
    for (let i = 0; i < WHEEL_SLOTS.length * BUFFER_MULTIPLIER; i++) {
      const slotIndex = i % WHEEL_SLOTS.length;
      const slot = WHEEL_SLOTS[slotIndex];
      tilesArray.push({
        key: `tile-${i}`,
        index: i,
        slot: slot.slot,
        color: slot.color
      });
    }
    return tilesArray;
  }, []);

  // Calculate target logical position for winning slot to be centered
  const calculateTargetLogicalPosition = useCallback((slot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) {
      console.error('❌ Invalid slot:', slot);
      return 0;
    }
    
    // Find the center instance of the winning slot in the buffer
    const centerRepeat = Math.floor(BUFFER_MULTIPLIER / 2);
    const targetTileIndex = centerRepeat * WHEEL_SLOTS.length + slotIndex;
    const targetTileLogicalCenter = targetTileIndex * LOGICAL_TILE_SIZE + LOGICAL_TILE_SIZE / 2;
    
    // Calculate logical position so that the tile center aligns with logical center (0)
    const targetLogicalPosition = 0 - targetTileLogicalCenter;
    
    console.log('🎯 Target logical position calculation:', {
      winningSlot: slot,
      slotIndex,
      centerRepeat,
      targetTileIndex,
      targetTileLogicalCenter,
      logicalCenter: 0,
      targetLogicalPosition,
      logicalTileSize: LOGICAL_TILE_SIZE
    });
    
    return targetLogicalPosition;
  }, []);

  // Simple spinning animation using logical positioning
  const animate = useCallback(() => {
    if (isSpinning) {
      // Move the reel to the left (simulating spinning) using logical units
      setLogicalTranslateX(prev => {
        const newLogicalPosition = prev - (LOGICAL_TILE_SIZE * 0.125); // Fixed logical speed
        
        // Reset position when we've moved too far left to maintain infinite scrolling
        const totalLogicalWidth = WHEEL_SLOTS.length * LOGICAL_TILE_SIZE * BUFFER_MULTIPLIER;
        if (Math.abs(newLogicalPosition) > totalLogicalWidth / 2) {
          return newLogicalPosition + totalLogicalWidth / 2;
        }
        
        return newLogicalPosition;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (winningSlot !== null) {
      // Ensure the winning slot lands under the center line
      console.log('🎯 PROVABLY FAIR RESULT RECEIVED - Winning slot:', winningSlot);
      
      const startLogicalPosition = logicalTranslateX;
      const targetLogicalPosition = calculateTargetLogicalPosition(winningSlot);
      
      console.log('🎲 Starting deceleration animation:', {
        winningSlot,
        startLogicalPosition,
        targetLogicalPosition,
        distance: Math.abs(targetLogicalPosition - startLogicalPosition)
      });
      
      const duration = 2500; // 2.5 seconds for smooth deceleration
      const startTime = Date.now();
      
      const animateToResult = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth deceleration with emphasis on final precision
        let easeProgress;
        if (progress < 0.4) {
          // First 40%: Still moving at good speed
          const phaseProgress = progress / 0.4;
          easeProgress = phaseProgress * 0.6; // 0% to 60% distance
        } else if (progress < 0.8) {
          // 40%-80%: Slowing down significantly
          const phaseProgress = (progress - 0.4) / 0.4;
          easeProgress = 0.6 + phaseProgress * 0.3; // 60% to 90% distance
        } else {
          // Last 20%: Very slow final approach for precision
          const phaseProgress = (progress - 0.8) / 0.2;
          const smoothEaseOut = 1 - Math.pow(1 - phaseProgress, 5); // Quintic ease-out for precision
          easeProgress = 0.9 + smoothEaseOut * 0.1; // 90% to 100% distance
        }
        
        const newLogicalPosition = startLogicalPosition + (targetLogicalPosition - startLogicalPosition) * easeProgress;
        setLogicalTranslateX(newLogicalPosition);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateToResult);
        } else {
          setIsAnimating(false);
          console.log('✅ Animation complete - Winning slot:', winningSlot, 'at final logical position:', newLogicalPosition);
        }
      };
      
      animateToResult();
    }
  }, [isSpinning, winningSlot, synchronizedPosition, logicalTranslateX, calculateTargetLogicalPosition]);

  // Handle spinning state changes
  useEffect(() => {
    if (isSpinning !== lastSpinningState.current) {
      lastSpinningState.current = isSpinning;
      
      if (isSpinning) {
        setIsAnimating(true);
        animate();
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    }
  }, [isSpinning, animate]);

  // Reset position when round changes
  useEffect(() => {
    if (synchronizedPosition !== null && synchronizedPosition !== undefined) {
      setLogicalTranslateX(synchronizedPosition);
    }
  }, [synchronizedPosition]);

  // Get tile color class
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-green-500 to-green-600 border-green-400 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-500 text-white';
      default: return 'bg-gray-500 border-gray-400 text-white';
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container with fixed height */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"
        style={{ height: `${REEL_HEIGHT}px` }}
      >
        {/* Center indicator line - static and centered */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-emerald-400"></div>
          
          {/* Bottom arrow */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-400"></div>
          
          {/* Center line */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-emerald-400"></div>
          
          {/* Glow effect */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-emerald-400/20 blur-sm"></div>
        </div>

        {/* Horizontal scrolling tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${logicalTranslateX * scaleFactor}px)`,
            transition: 'none', // No CSS transitions, we control animation with JS
            willChange: 'transform'
          }}
        >
          {tiles.map((tile) => {
            const tileLogicalCenter = logicalTranslateX + (tile.index * LOGICAL_TILE_SIZE + LOGICAL_TILE_SIZE / 2);
            const distanceFromCenter = Math.abs(tileLogicalCenter - 0); // Logical center is always 0
            const isNearCenter = distanceFromCenter < LOGICAL_TILE_SIZE / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < LOGICAL_TILE_SIZE / 3;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-200
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${isNearCenter && isAnimating ? 'scale-105 z-10' : ''}
                `}
                style={{ 
                  width: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  height: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  minWidth: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  maxWidth: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  minHeight: `${LOGICAL_TILE_SIZE * scaleFactor}px`,
                  maxHeight: `${LOGICAL_TILE_SIZE * scaleFactor}px`
                }}
              >
                <div className={`text-lg font-bold drop-shadow-lg ${
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