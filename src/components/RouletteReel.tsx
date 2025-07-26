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

const TILE_WIDTH = 120; // Width of each tile in pixels
const BACKEND_CONTAINER_WIDTH = 1200; // Backend's container width
const BACKEND_CENTER_OFFSET = 600; // Backend's center position

// Perfect Physics Animation Configuration
const PHYSICS_CONFIG = {
  // Timing (all users synchronized to millisecond precision)
  TOTAL_DURATION: 6000, // 6 seconds for perfect physics simulation
  ACCELERATION_TIME: 800, // 800ms acceleration phase
  FAST_TIME: 2800, // 2.8s fast movement phase
  DECELERATION_TIME: 2400, // 2.4s deceleration phase
  
  // Physics parameters
  INITIAL_VELOCITY: 0, // Start from rest
  MAX_VELOCITY: 2500, // Maximum velocity in pixels per second
  FRICTION_COEFFICIENT: 0.15, // Realistic friction
  GRAVITY: 9.8, // Standard gravity (for bounce calculations)
  BOUNCE_DAMPING: 0.4, // How much bounce energy is lost
  AIR_RESISTANCE: 0.02, // Air resistance coefficient
  
  // Precision settings
  POSITION_TOLERANCE: 0.5, // Sub-pixel precision
  VELOCITY_TOLERANCE: 0.1, // Velocity precision
  TIME_STEP: 16.67, // 60fps physics simulation (16.67ms)
  
  // Animation phases
  PHASES: {
    ACCELERATION: 'acceleration',
    FAST: 'fast',
    DECELERATION: 'deceleration',
    FINAL: 'final'
  }
};

// Advanced Physics Engine for Roulette Animation
class RoulettePhysicsEngine {
  private startTime: number = 0;
  private startPosition: number = 0;
  private targetPosition: number = 0;
  private currentPosition: number = 0;
  private currentVelocity: number = 0;
  private currentPhase: string = PHYSICS_CONFIG.PHASES.ACCELERATION;
  private animationId: number | null = null;
  private onUpdate: (position: number, velocity: number, phase: string) => void;
  private onComplete: (finalPosition: number) => void;

  constructor(
    onUpdate: (position: number, velocity: number, phase: string) => void,
    onComplete: (finalPosition: number) => void
  ) {
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
  }

  // Start physics simulation with exact target
  start(startPosition: number, targetPosition: number) {
    this.startTime = performance.now();
    this.startPosition = startPosition;
    this.targetPosition = targetPosition;
    this.currentPosition = startPosition;
    this.currentVelocity = PHYSICS_CONFIG.INITIAL_VELOCITY;
    this.currentPhase = PHYSICS_CONFIG.PHASES.ACCELERATION;

    console.log('🚀 Starting Perfect Physics Animation:', {
      startPosition,
      targetPosition,
      distance: Math.abs(targetPosition - startPosition),
      targetTime: PHYSICS_CONFIG.TOTAL_DURATION
    });

    this.simulate();
  }

  // Stop physics simulation
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Main physics simulation loop
  private simulate() {
    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / PHYSICS_CONFIG.TOTAL_DURATION, 1);

    // Calculate physics-based position and velocity
    const { position, velocity, phase } = this.calculatePhysics(elapsed, progress);
    
    this.currentPosition = position;
    this.currentVelocity = velocity;
    this.currentPhase = phase;

    // Update callback
    this.onUpdate(position, velocity, phase);

    // Continue simulation or complete
    if (progress < 1) {
      this.animationId = requestAnimationFrame(() => this.simulate());
    } else {
      // Ensure exact landing
      this.currentPosition = this.targetPosition;
      this.currentVelocity = 0;
      this.onUpdate(this.targetPosition, 0, PHYSICS_CONFIG.PHASES.FINAL);
      this.onComplete(this.targetPosition);
    }
  }

  // Advanced physics calculations with realistic mechanics
  private calculatePhysics(elapsed: number, progress: number) {
    const distance = this.targetPosition - this.startPosition;
    const direction = Math.sign(distance);

    if (elapsed < PHYSICS_CONFIG.ACCELERATION_TIME) {
      // Phase 1: Acceleration (0-800ms)
      const phaseProgress = elapsed / PHYSICS_CONFIG.ACCELERATION_TIME;
      const acceleration = this.calculateAcceleration(phaseProgress);
      
      // Apply acceleration with realistic physics
      const velocity = acceleration * elapsed;
      const position = this.startPosition + (0.5 * acceleration * elapsed * elapsed);
      
      return {
        position: this.clampPosition(position),
        velocity: Math.min(velocity, PHYSICS_CONFIG.MAX_VELOCITY),
        phase: PHYSICS_CONFIG.PHASES.ACCELERATION
      };

    } else if (elapsed < PHYSICS_CONFIG.ACCELERATION_TIME + PHYSICS_CONFIG.FAST_TIME) {
      // Phase 2: Fast movement (800-3600ms)
      const fastElapsed = elapsed - PHYSICS_CONFIG.ACCELERATION_TIME;
      const fastProgress = fastElapsed / PHYSICS_CONFIG.FAST_TIME;
      
      // Maintain high velocity with slight variations
      const baseVelocity = PHYSICS_CONFIG.MAX_VELOCITY * 0.95;
      const velocityVariation = Math.sin(fastElapsed * 0.01) * 50; // Subtle mechanical variation
      const velocity = baseVelocity + velocityVariation;
      
      // Calculate position with mechanical precision
      const accelerationDistance = 0.5 * PHYSICS_CONFIG.MAX_VELOCITY * PHYSICS_CONFIG.ACCELERATION_TIME;
      const fastDistance = velocity * fastElapsed;
      const position = this.startPosition + accelerationDistance + fastDistance;
      
      return {
        position: this.clampPosition(position),
        velocity: Math.max(velocity, PHYSICS_CONFIG.MAX_VELOCITY * 0.8),
        phase: PHYSICS_CONFIG.PHASES.FAST
      };

    } else {
      // Phase 3: Deceleration (3600-6000ms)
      const decelElapsed = elapsed - PHYSICS_CONFIG.ACCELERATION_TIME - PHYSICS_CONFIG.FAST_TIME;
      const decelProgress = decelElapsed / PHYSICS_CONFIG.DECELERATION_TIME;
      
      // Advanced deceleration with bounce simulation
      const { position, velocity } = this.calculateDeceleration(decelProgress, distance);
      
      return {
        position: this.clampPosition(position),
        velocity: Math.max(velocity, 0),
        phase: PHYSICS_CONFIG.PHASES.DECELERATION
      };
    }
  }

  // Calculate realistic acceleration curve
  private calculateAcceleration(progress: number): number {
    // Use cubic ease-in for natural acceleration
    const easedProgress = progress * progress * progress;
    const maxAcceleration = PHYSICS_CONFIG.MAX_VELOCITY / PHYSICS_CONFIG.ACCELERATION_TIME;
    return maxAcceleration * easedProgress;
  }

  // Calculate advanced deceleration with bounce effects
  private calculateDeceleration(progress: number, totalDistance: number): { position: number, velocity: number } {
    // Exponential decay for natural deceleration
    const decayRate = 3.5;
    const decay = Math.exp(-progress * decayRate);
    
    // Calculate remaining distance to target
    const remainingDistance = totalDistance * (1 - progress);
    
    // Add realistic bounce effect that diminishes over time
    const bounceFrequency = 8; // Number of bounces
    const bounceDecay = Math.exp(-progress * 4);
    const bounce = Math.sin(progress * Math.PI * bounceFrequency) * bounceDecay * 0.05;
    
    // Calculate final position with bounce
    const basePosition = this.targetPosition - (remainingDistance * decay);
    const bounceOffset = totalDistance * bounce;
    const position = basePosition + bounceOffset;
    
    // Calculate velocity based on position change
    const velocity = Math.abs(totalDistance * decayRate * decay) * (1 + bounce);
    
    return { position, velocity };
  }

  // Ensure position stays within reasonable bounds
  private clampPosition(position: number): number {
    const minPosition = this.targetPosition - Math.abs(this.targetPosition - this.startPosition) * 1.5;
    const maxPosition = this.targetPosition + Math.abs(this.targetPosition - this.startPosition) * 1.5;
    return Math.max(minPosition, Math.min(maxPosition, position));
  }
}

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualContainerWidth, setActualContainerWidth] = useState(BACKEND_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(BACKEND_CENTER_OFFSET);
  const physicsEngineRef = useRef<RoulettePhysicsEngine | null>(null);
  const animationStartTimeRef = useRef<number>(0);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition, currentPhase });

  // Create physics engine instance
  const physicsEngine = useMemo(() => {
    if (!physicsEngineRef.current) {
      physicsEngineRef.current = new RoulettePhysicsEngine(
        (position, velocity, phase) => {
          setTranslateX(position);
          setCurrentVelocity(velocity);
          setCurrentPhase(phase);
        },
        (finalPosition) => {
          console.log('✅ Perfect Physics Animation Complete');
          setTranslateX(finalPosition);
          setCurrentVelocity(0);
          setCurrentPhase(PHYSICS_CONFIG.PHASES.FINAL);
          setIsAnimating(false);
          
          // Verify perfect landing
          verifyPerfectLanding(winningSlot, finalPosition);
        }
      );
    }
    return physicsEngineRef.current;
  }, [winningSlot]);

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
        !isAnimating) {
      
      console.log('🔄 Syncing to backend position:', synchronizedPosition);
      
      // Adjust backend position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const adjustedPosition = synchronizedPosition + centerDifference;
      
      console.log('📍 Position sync:', {
        backend: synchronizedPosition,
        centerDifference,
        adjusted: adjustedPosition
      });
      
      setTranslateX(adjustedPosition);
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset]);

  // Create a repeating loop of tiles (30 repetitions for ultra-smooth infinite scroll)
  const tiles = useMemo(() => {
    const tileArray = [];
    for (let repeat = 0; repeat < 30; repeat++) {
      for (let i = 0; i < WHEEL_SLOTS.length; i++) {
        tileArray.push({
          ...WHEEL_SLOTS[i],
          key: `${repeat}-${i}`,
          index: repeat * WHEEL_SLOTS.length + i
        });
      }
    }
    return tileArray;
  }, []);

  // Perfect physics animation with exact synchronization
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🚀 Starting Perfect Physics Animation to slot:', winningSlot, 'at position:', synchronizedPosition);
      
      // Use the EXACT position calculated by the provably fair backend
      const startPosition = translateX;
      
      // Adjust backend position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const exactTargetPosition = synchronizedPosition + centerDifference;
      
      console.log('🎯 Perfect Physics Animation Setup:', {
        winningSlot,
        startPosition,
        backendPosition: synchronizedPosition,
        centerDifference,
        exactTarget: exactTargetPosition,
        distance: Math.abs(exactTargetPosition - startPosition),
        startTime: Date.now()
      });

      // Record animation start time for synchronization
      animationStartTimeRef.current = Date.now();
      
      // Start perfect physics animation
      setIsAnimating(true);
      physicsEngine.start(startPosition, exactTargetPosition);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, translateX, actualCenterOffset, physicsEngine]);

  // Verify perfect landing with sub-pixel precision
  const verifyPerfectLanding = useCallback((slot: number | null, finalPosition: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileCenter = 0;
    
    for (let repeat = 0; repeat < 30; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalPosition + (tileGlobalIndex * TILE_WIDTH);
      const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileCenter = tileCenterPosition;
      }
    }
    
    const isPerfect = closestDistance < PHYSICS_CONFIG.POSITION_TOLERANCE;
    
    console.log('🎯 PERFECT LANDING VERIFICATION:', {
      expectedSlot: slot,
      expectedCenter: actualCenterOffset,
      actualTileCenter: closestTileCenter,
      distanceOff: closestDistance.toFixed(3) + 'px',
      result: isPerfect ? '✅ PERFECT LANDING' : '❌ LANDING ERROR',
      tolerance: PHYSICS_CONFIG.POSITION_TOLERANCE + 'px',
      animationTime: Date.now() - animationStartTimeRef.current + 'ms'
    });
    
    if (!isPerfect) {
      console.error(`❌ PERFECT PHYSICS ERROR: Slot ${slot} missed center by ${closestDistance.toFixed(3)}px!`);
    } else {
      console.log(`✅ PERFECT PHYSICS SUCCESS: Slot ${slot} landed with sub-pixel precision!`);
    }
  }, [actualCenterOffset]);

  // Clean up physics engine when round ends
  useEffect(() => {
    if (!isSpinning && physicsEngine) {
      physicsEngine.stop();
      setIsAnimating(false);
      setCurrentVelocity(0);
      setCurrentPhase('');
    }
  }, [isSpinning, physicsEngine]);

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

  // Calculate advanced visual effects based on physics
  const getVisualEffects = (tile: { slot: number, color: string }, distanceFromCenter: number) => {
    const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
    const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;
    const isExtendedWinningTile = extendedWinAnimation && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

    // Physics-based visual effects
    const velocityEffect = isAnimating ? Math.abs(currentVelocity) / 1000 : 0;
    const scaleEffect = isNearCenter && isAnimating ? 1 + (velocityEffect * 0.03) : 1;
    
    // Advanced motion blur based on velocity and phase
    let motionBlur = 0;
    if (isAnimating) {
      if (currentPhase === PHYSICS_CONFIG.PHASES.FAST) {
        motionBlur = Math.min(velocityEffect * 0.4, 2.0);
      } else if (currentPhase === PHYSICS_CONFIG.PHASES.DECELERATION) {
        motionBlur = Math.min(velocityEffect * 0.2, 1.0);
      }
    }
    
    // Subtle rotation effect during fast movement
    const rotationEffect = isAnimating && velocityEffect > 0.8 ? Math.sin(Date.now() * 0.015) * 0.3 : 0;

    return {
      isNearCenter,
      isWinningTile,
      isExtendedWinningTile,
      scaleEffect,
      motionBlur,
      rotationEffect,
      velocityEffect
    };
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container */}
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50">
        
        {/* Perfect center indicator line */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow with enhanced styling */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow with enhanced styling */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Perfect center line with multiple layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-200 opacity-50"></div>
          
          {/* Enhanced glow effect with phase-based animation */}
          <div className={`absolute inset-0 bg-emerald-400 shadow-emerald-400/50 shadow-2xl blur-sm ${
            isAnimating ? 'animate-pulse' : 'animate-pulse'
          }`}></div>
          
          {/* Phase-based sparkle effect */}
          {isAnimating && (
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-emerald-300/30 to-transparent ${
              currentPhase === PHYSICS_CONFIG.PHASES.FAST ? 'animate-pulse' : 'animate-pulse'
            }`}></div>
          )}
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
          
          {/* Physics-based animation overlay */}
          {isAnimating && (
            <div className="absolute inset-0 pointer-events-none z-40">
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent ${
                currentPhase === PHYSICS_CONFIG.PHASES.FAST ? 'animate-pulse' : 'animate-pulse'
              }`}></div>
            </div>
          )}
          
          {tiles.map((tile) => {
            // Calculate tile position and effects
            const tileCenter = translateX + (tile.index * TILE_WIDTH + TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
            const effects = getVisualEffects(tile, distanceFromCenter);

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-75
                  ${getTileColor(tile.color)}
                  ${effects.isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${effects.isExtendedWinningTile ? 'scale-125 ring-8 ring-emerald-300 shadow-2xl shadow-emerald-300/70 z-30 animate-pulse' : ''}
                  ${effects.isNearCenter && isAnimating ? 'z-10' : ''}
                `}
                style={{ 
                  width: `${TILE_WIDTH}px`,
                  transform: `scale(${effects.scaleEffect}) rotate(${effects.rotationEffect}deg)`,
                  filter: isAnimating ? `blur(${effects.motionBlur}px)` : 'blur(0px)',
                  opacity: isAnimating && effects.velocityEffect > 1.5 ? 0.85 + (effects.velocityEffect * 0.05) : 1
                }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  effects.isWinningTile ? 'text-emerald-200 scale-125' : ''
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