import React, { useState, useEffect } from 'react';

interface CoinFlipAnimationProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onAnimationComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function CoinFlipAnimation({ 
  isFlipping, 
  result, 
  onAnimationComplete, 
  size = 'large' 
}: CoinFlipAnimationProps) {
  const [currentRotation, setCurrentRotation] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'flipping' | 'landing' | 'complete'>('idle');

  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-16 h-16 text-2xl',
    large: 'w-32 h-32 text-4xl'
  };

  useEffect(() => {
    if (isFlipping && animationPhase === 'idle') {
      setAnimationPhase('flipping');
      setCurrentRotation(0);
      
      // Start the flipping animation
      const flipInterval = setInterval(() => {
        setCurrentRotation(prev => prev + 180);
      }, 100);

      // After 2 seconds, start landing animation
      setTimeout(() => {
        clearInterval(flipInterval);
        setAnimationPhase('landing');
        
        // Calculate final rotation to show correct result
        const targetRotation = result === 'heads' ? 0 : 180;
        const currentMod = currentRotation % 360;
        let finalRotation = targetRotation;
        
        if (Math.abs(currentMod - targetRotation) > 180) {
          finalRotation = targetRotation + (currentMod > targetRotation ? 360 : -360);
        } else {
          finalRotation = targetRotation;
        }
        
        setCurrentRotation(finalRotation);
        
        // Complete animation after landing
        setTimeout(() => {
          setAnimationPhase('complete');
          onAnimationComplete?.();
        }, 500);
      }, 1800);

      return () => clearInterval(flipInterval);
    }
  }, [isFlipping, result, animationPhase, currentRotation, onAnimationComplete]);

  useEffect(() => {
    if (!isFlipping && animationPhase !== 'idle') {
      setAnimationPhase('idle');
      setCurrentRotation(0);
    }
  }, [isFlipping]);

  const getCoinFace = (rotation: number) => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    return normalizedRotation > 90 && normalizedRotation < 270 ? 'tails' : 'heads';
  };

  const currentFace = animationPhase === 'complete' ? result : getCoinFace(currentRotation);

  return (
    <div className="flex justify-center items-center">
      <div className="relative">
        {/* Coin shadow */}
        <div className={`absolute top-2 ${sizeClasses[size]} rounded-full bg-black/20 blur-sm scale-75`} />
        
        {/* Main coin */}
        <div 
          className={`
            ${sizeClasses[size]} 
            rounded-full 
            gradient-primary 
            flex items-center justify-center 
            font-bold text-white 
            shadow-2xl 
            relative z-10
            transform-gpu
            ${animationPhase === 'flipping' ? 'animate-bounce' : ''}
            ${animationPhase === 'landing' ? 'transition-transform duration-500 ease-out' : ''}
            ${animationPhase === 'complete' ? 'shadow-glow' : ''}
          `}
          style={{
            transform: `rotateY(${currentRotation}deg) ${animationPhase === 'flipping' ? 'translateY(-10px)' : ''}`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Heads side */}
          <div 
            className="absolute inset-0 flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateY(0deg)' }}
          >
            👑
          </div>
          
          {/* Tails side */}
          <div 
            className="absolute inset-0 flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            ⚡
          </div>
        </div>

        {/* Glow effect when complete */}
        {animationPhase === 'complete' && (
          <div className={`
            absolute inset-0 ${sizeClasses[size]} 
            rounded-full 
            bg-primary/30 
            animate-pulse 
            blur-lg
          `} />
        )}
      </div>
    </div>
  );
}