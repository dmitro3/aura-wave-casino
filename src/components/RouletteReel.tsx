import { useEffect, useState, useRef, useCallback } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
  roundId?: string;
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

// Animation phases
enum AnimationPhase {
  IDLE = 'idle',
  ACCELERATION = 'acceleration',
  FULL_SPEED = 'full_speed',
  DECELERATION = 'deceleration',
  STOPPED = 'stopped'
}

interface AnimationKeyframe {
  frame: number;
  elapsed: number;
  progress: number;
  position: number;
  phase: AnimationPhase;
  velocity: number;
}

interface ServerAnimationData {
  winningSlot: number;
  winningColor: string;
  slotIndex: number;
  baseTargetPosition: number;
  finalTargetPosition: number;
  totalDistance: number;
  keyframes: AnimationKeyframe[];
  timing: {
    ACCELERATION_DURATION: number;
    FULL_SPEED_DURATION: number;
    DECELERATION_DURATION: number;
    TOTAL_DURATION: number;
  };
  configuration: {
    tileWidth: number;
    containerWidth: number;
    centerOffset: number;
    fullRotation: number;
    totalRotations: number;
    tileRepetitions: number;
  };
}

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation, roundId }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>(AnimationPhase.IDLE);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [serverAnimationData, setServerAnimationData] = useState<ServerAnimationData | null>(null);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualCenterOffset, setActualCenterOffset] = useState(600);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  console.log('🎰 RouletteReel:', { 
    isSpinning, 
    winningSlot, 
    translateX, 
    synchronizedPosition, 
    animationPhase,
    currentVelocity,
    roundId,
    hasServerData: !!serverAnimationData
  });

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

  // Fetch server-side animation data when spinning starts
  useEffect(() => {
    if (isSpinning && roundId && !serverAnimationData) {
      fetchServerAnimationData(roundId);
    }
  }, [isSpinning, roundId, serverAnimationData]);

  // Fetch animation data from server
  const fetchServerAnimationData = async (roundId: string) => {
    try {
      console.log('🎰 Fetching server animation data for round:', roundId);
      
      const response = await fetch('/api/roulette-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_animation_data',
          roundId: roundId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎰 Server animation data received:', data);
      
      setServerAnimationData(data);
      
      // Start the synchronized animation
      if (data.keyframes && data.keyframes.length > 0) {
        startSynchronizedAnimation(data);
      }
      
    } catch (error) {
      console.error('❌ Error fetching server animation data:', error);
      // Fallback to local animation if server data fails
      startLocalAnimation();
    }
  };

  // Start synchronized animation using server data
  const startSynchronizedAnimation = useCallback((animationData: ServerAnimationData) => {
    console.log('🎰 Starting synchronized animation with server data');
    
    const startTime = performance.now();
    startTimeRef.current = startTime;
    lastFrameTimeRef.current = startTime;
    
    setIsAnimating(true);
    setAnimationPhase(AnimationPhase.ACCELERATION);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const totalProgress = Math.min(elapsed / animationData.timing.TOTAL_DURATION, 1);
      
      // Find the appropriate keyframe for this time
      const frameIndex = Math.floor(totalProgress * (animationData.keyframes.length - 1));
      const keyframe = animationData.keyframes[frameIndex];
      
      if (keyframe) {
        // Use server-calculated position for perfect synchronization
        setTranslateX(keyframe.position);
        setAnimationPhase(keyframe.phase);
        setCurrentVelocity(keyframe.velocity);
        
        console.log(`🎬 Frame ${frameIndex}/${animationData.keyframes.length}:`, {
          elapsed: Math.round(elapsed),
          progress: Math.round(totalProgress * 100),
          position: Math.round(keyframe.position),
          phase: keyframe.phase,
          velocity: Math.round(keyframe.velocity)
        });
      }
      
      if (totalProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact landing
        console.log('✅ Synchronized animation complete');
        setTranslateX(animationData.finalTargetPosition);
        setIsAnimating(false);
        setAnimationPhase(AnimationPhase.STOPPED);
        setCurrentVelocity(0);
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Fallback local animation (if server data fails)
  const startLocalAnimation = useCallback(() => {
    console.log('🎰 Starting fallback local animation');
    
    if (!winningSlot) {
      console.error('❌ No winning slot for local animation');
      return;
    }
    
    // Find the winning slot in our wheel configuration
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
    if (slotIndex === -1) {
      console.error('❌ Winning slot not found:', winningSlot);
      return;
    }
    
    // Calculate the exact position to center the winning slot under the indicator
    const winningSlotCenter = slotIndex * TILE_WIDTH + TILE_WIDTH / 2;
    const baseTargetPosition = actualCenterOffset - winningSlotCenter;
    
    // Add multiple full rotations for dramatic effect
    const fullRotation = WHEEL_SLOTS.length * TILE_WIDTH;
    const rotations = 12; // 12 full rotations for dramatic effect
    const finalTargetPosition = baseTargetPosition - (rotations * fullRotation);
    
    console.log('🎯 Local animation setup:', {
      winningSlot,
      slotIndex,
      winningSlotCenter,
      baseTargetPosition,
      finalTargetPosition,
      currentPosition: translateX,
      rotations,
      distance: Math.abs(finalTargetPosition - translateX)
    });

    // Start the local animation
    animateLocalRolling(translateX, finalTargetPosition);
  }, [winningSlot, actualCenterOffset, translateX]);

  // Local rolling animation (fallback)
  const animateLocalRolling = useCallback((startPosition: number, targetPosition: number) => {
    const startTime = performance.now();
    const totalDuration = 4000; // 4 seconds total
    
    startTimeRef.current = startTime;
    lastFrameTimeRef.current = startTime;
    
    console.log('🚀 Starting local rolling animation:', {
      startPosition,
      targetPosition,
      distance: Math.abs(targetPosition - startPosition),
      totalDuration
    });

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const totalProgress = Math.min(elapsed / totalDuration, 1);
      
      // Calculate smooth position based on elapsed time with proper movement
      let currentPosition: number;
      let phase: AnimationPhase;
      let velocity: number;
      
      if (elapsed < 800) {
        // ACCELERATION PHASE (0-0.8s) - Rapid acceleration from right to left
        const phaseProgress = elapsed / 800;
        // Use easeInQuad for momentum buildup
        const easedProgress = phaseProgress * phaseProgress;
        // Move tiles from right to left (decreasing translateX)
        const accelerationDistance = (targetPosition - startPosition) * 0.3;
        currentPosition = startPosition + (accelerationDistance * easedProgress);
        phase = AnimationPhase.ACCELERATION;
        velocity = easedProgress * 100;
      } else if (elapsed < 3200) {
        // FULL SPEED PHASE (0.8s-3.2s) - Constant high-speed spinning
        const phaseProgress = (elapsed - 800) / 2400;
        const accelerationDistance = (targetPosition - startPosition) * 0.3;
        const fullSpeedDistance = (targetPosition - startPosition) * 0.6;
        // Continue moving tiles from right to left
        currentPosition = startPosition + accelerationDistance + (fullSpeedDistance * phaseProgress);
        phase = AnimationPhase.FULL_SPEED;
        velocity = 100;
      } else {
        // DECELERATION PHASE (3.2s-4.0s) - Controlled slowdown to target
        const phaseProgress = (elapsed - 3200) / 800;
        // Use easeOutQuart for realistic deceleration
        const easedProgress = 1 - Math.pow(1 - phaseProgress, 4);
        const previousDistance = (targetPosition - startPosition) * 0.9;
        const decelerationDistance = (targetPosition - startPosition) * 0.1;
        // Final movement to target position
        currentPosition = startPosition + previousDistance + (decelerationDistance * easedProgress);
        phase = AnimationPhase.DECELERATION;
        velocity = (1 - easedProgress) * 100;
      }
      
      // Apply bounce effect at the very end
      if (phase === AnimationPhase.DECELERATION && totalProgress > 0.98) {
        const bounceProgress = (totalProgress - 0.98) / 0.02;
        const bounceOffset = Math.sin(bounceProgress * Math.PI * 3) * 5;
        currentPosition += bounceOffset;
      }
      
      // Update state with smooth movement - this is the key to visible rolling
      setTranslateX(currentPosition);
      setAnimationPhase(phase);
      setCurrentVelocity(velocity);

      if (totalProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact landing
        console.log('✅ Local rolling animation complete');
        setTranslateX(targetPosition);
        setIsAnimating(false);
        setAnimationPhase(AnimationPhase.STOPPED);
        setCurrentVelocity(0);
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsAnimating(true);
    setAnimationPhase(AnimationPhase.ACCELERATION);
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Clean up animation when round ends
  useEffect(() => {
    if (!isSpinning && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      setAnimationPhase(AnimationPhase.IDLE);
      setCurrentVelocity(0);
      setServerAnimationData(null);
    }
  }, [isSpinning]);

  // Create a repeating loop of tiles (150 repetitions for ultra-smooth infinite scroll)
  const tiles = [];
  for (let repeat = 0; repeat < 150; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Get tile color styling
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-lg shadow-emerald-500/25';
      case 'red':
        return 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white shadow-lg shadow-red-500/25';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600 text-white shadow-lg shadow-gray-500/25';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get tile effects based on animation phase and velocity
  const getTileEffects = (tileIndex: number) => {
    if (!isAnimating) return '';
    
    const tileCenter = translateX + (tileIndex * TILE_WIDTH + TILE_WIDTH / 2);
    const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
    const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
    
    if (animationPhase === AnimationPhase.FULL_SPEED && isNearCenter) {
      // Motion blur effect during full speed
      return 'blur-[0.8px] scale-90 opacity-80';
    } else if (animationPhase === AnimationPhase.ACCELERATION && isNearCenter) {
      // Subtle blur during acceleration
      return 'blur-[0.3px] scale-95';
    } else if (animationPhase === AnimationPhase.DECELERATION && isNearCenter) {
      // Glow effect during deceleration
      return 'shadow-lg shadow-emerald-400/40 scale-105';
    }
    
    return '';
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Animation phase indicator */}
      <div className="absolute top-2 left-2 z-40">
        <div className="bg-black/70 text-white px-3 py-1 rounded-lg text-sm font-mono">
          Phase: {animationPhase.replace('_', ' ').toUpperCase()}
          {isAnimating && (
            <div className="text-xs text-emerald-400">
              Velocity: {Math.round(currentVelocity)}%
            </div>
          )}
          {serverAnimationData && (
            <div className="text-xs text-blue-400">
              Server Sync: ✅
            </div>
          )}
        </div>
      </div>

      {/* Reel container */}
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50">
        
        {/* Center indicator line with enhanced styling */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Center line with enhanced glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          
          {/* Enhanced glow effect */}
          <div className="absolute inset-0 bg-emerald-400 shadow-emerald-400/50 shadow-2xl blur-sm animate-pulse"></div>
          
          {/* Additional glow layers for depth */}
          <div className="absolute inset-0 bg-emerald-300/30 shadow-emerald-300/20 shadow-xl blur-md"></div>
        </div>

        {/* Horizontal scrolling tiles - this is where the real rolling happens */}
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
            const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;
            const isExtendedWinningTile = extendedWinAnimation && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-75
                  ${getTileColor(tile.color)}
                  ${getTileEffects(tile.index)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20 animate-pulse' : ''}
                  ${isExtendedWinningTile ? 'scale-125 ring-8 ring-emerald-300 shadow-2xl shadow-emerald-300/70 z-30 animate-pulse' : ''}
                  ${isNearCenter && isAnimating ? 'z-10' : ''}
                `}
                style={{ 
                  width: `${TILE_WIDTH}px`
                }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
                
                {/* Subtle inner glow for depth */}
                <div className="absolute inset-0 bg-white/5 rounded-lg pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}