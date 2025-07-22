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
  const [animationState, setAnimationState] = useState<'idle' | 'flipping' | 'landing' | 'complete'>('idle');
  const [displayResult, setDisplayResult] = useState<'heads' | 'tails' | null>(null);

  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-16 h-16 text-2xl',
    large: 'w-32 h-32 text-4xl'
  };

  useEffect(() => {
    if (isFlipping && animationState === 'idle') {
      setAnimationState('flipping');
      setDisplayResult(null);
      
      // After 2 seconds of flipping, start landing sequence
      setTimeout(() => {
        setAnimationState('landing');
        setDisplayResult(result);
        
        // Complete animation after landing
        setTimeout(() => {
          setAnimationState('complete');
          onAnimationComplete?.();
        }, 600);
      }, 2000);
    }
  }, [isFlipping, result, animationState, onAnimationComplete]);

  useEffect(() => {
    if (!isFlipping && animationState !== 'idle') {
      setAnimationState('idle');
      setDisplayResult(null);
    }
  }, [isFlipping]);

  const getAnimationClass = () => {
    switch (animationState) {
      case 'flipping':
        return 'animate-coin-flip';
      case 'landing':
        return 'animate-pulse';
      case 'complete':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  const getCoinContent = () => {
    if (animationState === 'flipping') {
      return '🪙';
    }
    if (displayResult === 'heads') {
      return '👑';
    }
    if (displayResult === 'tails') {
      return '⚡';
    }
    return '🪙';
  };

  return (
    <div className="flex justify-center items-center perspective-1000">
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
            ${getAnimationClass()}
            ${animationState === 'complete' ? 'shadow-glow' : ''}
          `}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {getCoinContent()}
        </div>

        {/* Glow effect when complete */}
        {animationState === 'complete' && (
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