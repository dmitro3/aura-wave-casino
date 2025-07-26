import { useEffect, useState, useRef, useCallback } from 'react';

interface EnhancedRouletteReelProps {
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

const TILE_WIDTH = 120;
const BACKEND_CONTAINER_WIDTH = 1200;
const BACKEND_CENTER_OFFSET = 600;

// Physics constants for animation
const ACCELERATION_DURATION = 800; // ms for acceleration phase
const MAX_SPEED_DURATION = 2000; // ms for max speed phase
const DECELERATION_DURATION = 2000; // ms for deceleration phase
const TOTAL_ANIMATION_DURATION = ACCELERATION_DURATION + MAX_SPEED_DURATION + DECELERATION_DURATION;

// Easing functions
const easeInQuad = (t: number): number => t * t;
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function EnhancedRouletteReel({ 
  isSpinning, 
  winningSlot, 
  showWinAnimation, 
  synchronizedPosition, 
  extendedWinAnimation 
}: EnhancedRouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'max-speed' | 'decelerating' | 'stopped'>('idle');
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualContainerWidth, setActualContainerWidth] = useState(BACKEND_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(BACKEND_CENTER_OFFSET);
  const [showBounceEffect, setShowBounceEffect] = useState(false);

  console.log('🎰 EnhancedRouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition, animationPhase });

  // Measure actual container size for responsive design
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || BACKEND_CONTAINER_WIDTH;
        const centerOffset = width / 2;
        
        setActualContainerWidth(width);
        setActualCenterOffset(centerOffset);
        
        console.log('📏 Container measured:', { width, centerOffset });
      }
    };

    measureContainer();
    window.addEventListener('resize', measureContainer);
    
    return () => window.removeEventListener('resize', measureContainer);
  }, []);

  // Sync position when not animating (cross-user synchronization)
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isAnimating && 
        animationPhase === 'idle') {
      
      console.log('🔄 Syncing to backend position:', synchronizedPosition);
      
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const adjustedPosition = synchronizedPosition + centerDifference;
      
      console.log('📍 Position sync:', {
        backend: synchronizedPosition,
        centerDifference,
        adjusted: adjustedPosition
      });
      
      setTranslateX(adjustedPosition);
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset, animationPhase]);

  // Create a repeating loop of tiles (25 repetitions for smooth infinite scroll)
  const tiles = [];
  for (let repeat = 0; repeat < 25; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Enhanced physics-based animation with multiple phases
  const startPhysicsBasedAnimation = useCallback((targetPosition: number) => {
    console.log('🚀 Starting physics-based animation to position:', targetPosition);
    
    setIsAnimating(true);
    setAnimationPhase('accelerating');
    
    const startPosition = translateX;
    const startTime = Date.now();
    
    // Calculate total distance - ensure we spin at least 5 full rotations
    const minSpinDistance = 5 * WHEEL_SLOTS.length * TILE_WIDTH;
    const directDistance = Math.abs(targetPosition - startPosition);
    const totalDistance = minSpinDistance + directDistance;
    
    // Calculate intermediate positions for each phase
    const accelerationDistance = totalDistance * 0.2; // 20% during acceleration
    const maxSpeedDistance = totalDistance * 0.6; // 60% during max speed
    const decelerationDistance = totalDistance * 0.2; // 20% during deceleration
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / TOTAL_ANIMATION_DURATION, 1);
      
      let currentPosition = startPosition;
      let currentPhase: typeof animationPhase = 'accelerating';
      
      if (elapsed < ACCELERATION_DURATION) {
        // Phase 1: Acceleration with easeInQuad
        currentPhase = 'accelerating';
        const phaseProgress = elapsed / ACCELERATION_DURATION;
        const easedProgress = easeInQuad(phaseProgress);
        currentPosition = startPosition - (accelerationDistance * easedProgress);
      } else if (elapsed < ACCELERATION_DURATION + MAX_SPEED_DURATION) {
        // Phase 2: Maximum speed with linear movement
        currentPhase = 'max-speed';
        const phaseProgress = (elapsed - ACCELERATION_DURATION) / MAX_SPEED_DURATION;
        currentPosition = startPosition - accelerationDistance - (maxSpeedDistance * phaseProgress);
      } else {
        // Phase 3: Deceleration with easeOutQuart to exact target
        currentPhase = 'decelerating';
        const phaseProgress = Math.min((elapsed - ACCELERATION_DURATION - MAX_SPEED_DURATION) / DECELERATION_DURATION, 1);
        const easedProgress = easeOutQuart(phaseProgress);
        
        const decelerationStart = startPosition - accelerationDistance - maxSpeedDistance;
        const remainingDistance = targetPosition - decelerationStart;
        currentPosition = decelerationStart + (remainingDistance * easedProgress);
      }
      
      setAnimationPhase(currentPhase);
      setTranslateX(currentPosition);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - add bounce effect
        console.log('✅ Physics animation complete at position:', currentPosition);
        setIsAnimating(false);
        setAnimationPhase('stopped');
        
        // Add subtle bounce effect
        setShowBounceEffect(true);
        setTimeout(() => {
          setShowBounceEffect(false);
          setAnimationPhase('idle');
        }, 300);
        
        // Verify the provably fair result landed correctly
        verifyProvablyFairLanding(winningSlot, currentPosition);
      }
    };
    
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [translateX, winningSlot, actualCenterOffset]);

  // Enhanced animation trigger
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🎯 Triggering enhanced animation for slot:', winningSlot, 'at position:', synchronizedPosition);
      
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const exactTargetPosition = synchronizedPosition + centerDifference;
      
      startPhysicsBasedAnimation(exactTargetPosition);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, actualCenterOffset, startPhysicsBasedAnimation]);

  // Verify that the provably fair result landed exactly under the center line
  const verifyProvablyFairLanding = (slot: number | null, finalPosition: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileCenter = 0;
    
    for (let repeat = 0; repeat < 25; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalPosition + (tileGlobalIndex * TILE_WIDTH);
      const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileCenter = tileCenterPosition;
      }
    }
    
    const isAccurate = closestDistance < 5; // Very strict tolerance
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      expectedSlot: slot,
      expectedCenter: actualCenterOffset,
      actualTileCenter: closestTileCenter,
      distanceOff: closestDistance.toFixed(2) + 'px',
      result: isAccurate ? '✅ PERFECT LANDING' : '❌ LANDING ERROR',
      tolerance: '5px'
    });
  };

  // Clean up animation when round ends
  useEffect(() => {
    if (!isSpinning && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      if (animationPhase !== 'idle') {
        setAnimationPhase('idle');
      }
    }
  }, [isSpinning, animationPhase]);

  // Get tile color styling with enhanced gradients
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-emerald-300 text-white shadow-emerald-500/50';
      case 'red':
        return 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-red-300 text-white shadow-red-500/50';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 border-gray-600 text-white shadow-gray-800/50';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get animation speed indicator
  const getSpeedIndicator = () => {
    switch (animationPhase) {
      case 'accelerating':
        return 'Accelerating...';
      case 'max-speed':
        return 'Full Speed!';
      case 'decelerating':
        return 'Slowing Down...';
      case 'stopped':
        return 'Stopped!';
      default:
        return isSpinning ? 'Spinning...' : winningSlot !== null ? `Result: ${winningSlot}` : 'Place your bets!';
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container with enhanced shadows and lighting */}
      <div 
        ref={containerRef} 
        className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"
        style={{
          boxShadow: isAnimating 
            ? '0 0 50px rgba(16, 185, 129, 0.3), inset 0 0 50px rgba(0, 0, 0, 0.5)'
            : '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 0 50px rgba(0, 0, 0, 0.3)'
        }}
      >
        
        {/* Enhanced center indicator with glow effects */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow with glow */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-10 border-r-10 border-b-10 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-lg"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-300"></div>
          </div>
          
          {/* Bottom arrow with glow */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-10 border-r-10 border-t-10 border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-lg"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-300"></div>
          </div>
          
          {/* Center line with enhanced glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          
          {/* Animated glow effect */}
          <div className={`absolute inset-0 bg-emerald-400 shadow-2xl ${
            isAnimating ? 'animate-pulse shadow-emerald-400/70' : 'shadow-emerald-400/50'
          } blur-sm`}></div>
          
          {/* Result highlight when stopped */}
          {showWinAnimation && (
            <div className="absolute inset-0 bg-yellow-400 shadow-yellow-400/80 shadow-2xl blur-md animate-pulse"></div>
          )}
        </div>

        {/* Speed lines for visual effect during animation */}
        {isAnimating && animationPhase !== 'decelerating' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse"
                style={{
                  left: `${20 + i * 15}%`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '0.3s'
                }}
              />
            ))}
          </div>
        )}

        {/* Horizontal scrolling tiles with enhanced effects */}
        <div 
          className="flex h-full items-center transition-none"
          style={{
            transform: `translateX(${translateX}px)`,
            willChange: 'transform',
            filter: animationPhase === 'max-speed' ? 'blur(0.5px)' : 'none'
          }}
        >
          {tiles.map((tile) => {
            const tileCenter = translateX + (tile.index * TILE_WIDTH + TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-300
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-20' : ''}
                  ${isNearCenter && isAnimating ? 'scale-105 z-10' : ''}
                  ${showBounceEffect && isWinningTile ? 'animate-bounce' : ''}
                `}
                style={{ 
                  width: `${TILE_WIDTH}px`,
                  boxShadow: isWinningTile 
                    ? '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)'
                    : undefined
                }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg transition-all duration-300 ${
                  isWinningTile ? 'text-yellow-200 scale-125 drop-shadow-2xl' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Winning tile sparkle effect */}
                {isWinningTile && showWinAnimation && (
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75"
                        style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${i * 200}ms`,
                          animationDuration: '1s'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Motion blur overlay during high speed */}
        {animationPhase === 'max-speed' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-25"></div>
        )}
      </div>

      {/* Enhanced status display */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className={`text-lg font-medium transition-all duration-300 ${
          isAnimating ? 'text-emerald-400 animate-pulse' : ''
        }`}>
          {getSpeedIndicator()}
        </p>
        
        {/* Animation phase indicator */}
        {isAnimating && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              animationPhase === 'accelerating' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
            }`}></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              animationPhase === 'max-speed' ? 'bg-red-400 animate-pulse' : 'bg-gray-500'
            }`}></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              animationPhase === 'decelerating' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
            }`}></div>
          </div>
        )}
      </div>
    </div>
  );
}