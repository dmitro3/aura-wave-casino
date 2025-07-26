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

// Animation configuration
const ANIMATION_CONFIG = {
  TOTAL_DURATION: 5000, // 5 seconds total
  ACCELERATION_PHASE: 0.2, // 20% of time accelerating
  FAST_PHASE: 0.6, // 60% of time at max speed
  DECELERATION_PHASE: 0.2, // 20% of time decelerating
  MAX_VELOCITY: 3000, // Maximum velocity in pixels per second
  MIN_ROTATIONS: 5, // Minimum number of full rotations
  BOUNCE_STRENGTH: 0.1, // Bounce effect strength
  MOTION_BLUR_THRESHOLD: 1000 // Velocity threshold for motion blur
};

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'accelerating' | 'fast' | 'decelerating' | 'stopped'>('idle');
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualCenterOffset, setActualCenterOffset] = useState(600);
  const startTimeRef = useRef<number>(0);
  const startPositionRef = useRef<number>(0);
  const targetPositionRef = useRef<number>(0);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition, animationPhase });

  // Measure actual container size for responsive design
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerOffset = rect.width / 2;
        setActualCenterOffset(centerOffset);
        console.log('📏 Container measured:', { width: rect.width, centerOffset });
      }
    };

    measureContainer();
    window.addEventListener('resize', measureContainer);
    
    return () => window.removeEventListener('resize', measureContainer);
  }, []);

  // Create a repeating loop of tiles (30 repetitions for smooth infinite scroll)
  const tiles = [];
  for (let repeat = 0; repeat < 30; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Physics-based easing functions
  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const easeOutBounce = (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  };

  // Calculate target position for winning slot
  const calculateTargetPosition = useCallback((winningSlot: number) => {
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
    if (slotIndex === -1) return 0;
    
    // Calculate position to center the winning slot under the indicator
    const winningSlotCenter = slotIndex * TILE_WIDTH + TILE_WIDTH / 2;
    const baseTargetPosition = actualCenterOffset - winningSlotCenter;
    
    // Add minimum rotations for dramatic effect
    const fullRotation = WHEEL_SLOTS.length * TILE_WIDTH;
    const rotations = ANIMATION_CONFIG.MIN_ROTATIONS;
    const finalTargetPosition = baseTargetPosition - (rotations * fullRotation);
    
    return finalTargetPosition;
  }, [actualCenterOffset]);

  // Main animation function with physics
  const animateWithPhysics = useCallback(() => {
    if (!isAnimating) return;

    const currentTime = Date.now();
    const elapsed = currentTime - startTimeRef.current;
    const totalDuration = ANIMATION_CONFIG.TOTAL_DURATION;
    const progress = Math.min(elapsed / totalDuration, 1);

    // Calculate current phase
    let currentPhase: typeof animationPhase = 'idle';
    let phaseProgress = 0;
    let velocity = 0;

    if (progress < ANIMATION_CONFIG.ACCELERATION_PHASE) {
      // Acceleration phase
      currentPhase = 'accelerating';
      phaseProgress = progress / ANIMATION_CONFIG.ACCELERATION_PHASE;
      velocity = ANIMATION_CONFIG.MAX_VELOCITY * easeInOutCubic(phaseProgress);
    } else if (progress < ANIMATION_CONFIG.ACCELERATION_PHASE + ANIMATION_CONFIG.FAST_PHASE) {
      // Fast phase
      currentPhase = 'fast';
      phaseProgress = (progress - ANIMATION_CONFIG.ACCELERATION_PHASE) / ANIMATION_CONFIG.FAST_PHASE;
      velocity = ANIMATION_CONFIG.MAX_VELOCITY;
    } else {
      // Deceleration phase
      currentPhase = 'decelerating';
      phaseProgress = (progress - ANIMATION_CONFIG.ACCELERATION_PHASE - ANIMATION_CONFIG.FAST_PHASE) / ANIMATION_CONFIG.DECELERATION_PHASE;
      
      // Use bounce easing for deceleration
      const easedProgress = easeOutBounce(phaseProgress);
      velocity = ANIMATION_CONFIG.MAX_VELOCITY * (1 - easedProgress);
    }

    // Calculate position based on velocity
    const distance = startPositionRef.current - targetPositionRef.current;
    const currentPosition = startPositionRef.current - (distance * progress);
    
    // Add bounce effect at the end
    if (currentPhase === 'decelerating' && phaseProgress > 0.8) {
      const bounceProgress = (phaseProgress - 0.8) / 0.2;
      const bounceOffset = Math.sin(bounceProgress * Math.PI * 4) * ANIMATION_CONFIG.BOUNCE_STRENGTH * distance;
      setTranslateX(currentPosition + bounceOffset);
    } else {
      setTranslateX(currentPosition);
    }

    setCurrentVelocity(velocity);
    setAnimationPhase(currentPhase);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateWithPhysics);
    } else {
      // Animation complete
      setTranslateX(targetPositionRef.current);
      setCurrentVelocity(0);
      setAnimationPhase('stopped');
      setIsAnimating(false);
      console.log('✅ Animation complete - landed on target');
    }
  }, [isAnimating]);

  // Start animation when spinning begins
  useEffect(() => {
    if (isSpinning && winningSlot !== null) {
      console.log('🚀 Starting physics-based animation to slot:', winningSlot);
      
      const targetPosition = calculateTargetPosition(winningSlot);
      const startPosition = translateX;
      
      startTimeRef.current = Date.now();
      startPositionRef.current = startPosition;
      targetPositionRef.current = targetPosition;
      
      console.log('🎯 Animation setup:', {
        winningSlot,
        startPosition,
        targetPosition,
        distance: Math.abs(targetPosition - startPosition)
      });

      setIsAnimating(true);
      setAnimationPhase('accelerating');
      
      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animateWithPhysics);
    }
  }, [isSpinning, winningSlot, calculateTargetPosition, translateX, animateWithPhysics]);

  // Clean up animation when round ends
  useEffect(() => {
    if (!isSpinning && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      setAnimationPhase('idle');
      setCurrentVelocity(0);
    }
  }, [isSpinning]);

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

  // Calculate motion blur and visual effects
  const getTileEffects = (tile: any) => {
    const tileCenter = translateX + (tile.index * TILE_WIDTH + TILE_WIDTH / 2);
    const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
    const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
    const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;
    const isExtendedWinningTile = extendedWinAnimation && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

    // Motion blur effect during fast phase
    const motionBlur = currentVelocity > ANIMATION_CONFIG.MOTION_BLUR_THRESHOLD && animationPhase === 'fast';
    
    // Scaling effect based on velocity
    const velocityScale = Math.min(currentVelocity / ANIMATION_CONFIG.MAX_VELOCITY, 1);
    const scale = isWinningTile ? 1.1 : (motionBlur ? 1 + velocityScale * 0.05 : 1);

    return {
      isNearCenter,
      isWinningTile,
      isExtendedWinningTile,
      motionBlur,
      scale,
      distanceFromCenter
    };
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Progress indicator */}
      {isAnimating && (
        <div className="absolute -top-8 left-0 right-0 z-40">
          <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-100"
              style={{ 
                width: `${(Date.now() - startTimeRef.current) / ANIMATION_CONFIG.TOTAL_DURATION * 100}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            {animationPhase === 'accelerating' && '🚀 Accelerating...'}
            {animationPhase === 'fast' && '⚡ High Speed...'}
            {animationPhase === 'decelerating' && '🛑 Decelerating...'}
          </div>
        </div>
      )}

      {/* Reel container */}
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50">
        
        {/* Center indicator line */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-lg"></div>
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
            const effects = getTileEffects(tile);

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-75
                  ${getTileColor(tile.color)}
                  ${effects.isWinningTile ? 'ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${effects.isExtendedWinningTile ? 'ring-8 ring-emerald-300 shadow-2xl shadow-emerald-300/70 z-30 animate-pulse' : ''}
                  ${effects.isNearCenter && isAnimating ? 'z-10' : ''}
                  ${effects.motionBlur ? 'blur-sm' : ''}
                `}
                style={{ 
                  width: `${TILE_WIDTH}px`,
                  transform: `scale(${effects.scale})`,
                  filter: effects.motionBlur ? 'blur(1px)' : 'none'
                }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  effects.isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Motion blur overlay during fast phase */}
                {effects.motionBlur && (
                  <div className="absolute inset-0 bg-white/10 blur-sm"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Velocity indicator */}
        {isAnimating && (
          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {Math.round(currentVelocity)} px/s
          </div>
        )}
      </div>
    </div>
  );
}