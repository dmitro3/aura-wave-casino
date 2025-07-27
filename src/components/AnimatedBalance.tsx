import React, { useState, useEffect, useRef } from 'react';

interface AnimatedBalanceProps {
  balance: number;
  className?: string;
}

export function AnimatedBalance({ balance, className = "" }: AnimatedBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousBalance = useRef(balance);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (balance !== previousBalance.current) {
      const oldBalance = previousBalance.current;
      const newBalance = balance;
      
      // Only animate increases
      if (newBalance > oldBalance) {
        setIsAnimating(true);
        
        const startTime = Date.now();
        const duration = 1000; // 1 second animation
        const difference = newBalance - oldBalance;
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Ease-out animation curve
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentValue = oldBalance + (difference * easeOut);
          
          setDisplayBalance(currentValue);
          
          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            setDisplayBalance(newBalance);
            setIsAnimating(false);
          }
        };
        
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // For decreases, update immediately without animation
        setDisplayBalance(newBalance);
      }
      
      previousBalance.current = newBalance;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [balance]);

  return (
    <span className={`${className} ${isAnimating ? 'animate-balance-increase' : ''}`}>
      ${displayBalance.toFixed(2)}
    </span>
  );
}