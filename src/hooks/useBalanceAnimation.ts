import { useState, useCallback, useRef } from 'react';

interface BalanceIncrease {
  id: string;
  amount: number;
  timestamp: number;
}

export function useBalanceAnimation() {
  const [increases, setIncreases] = useState<BalanceIncrease[]>([]);
  const previousBalance = useRef<number | null>(null);

  const triggerIncrease = useCallback((newBalance: number, oldBalance?: number) => {
    // If we have a previous balance to compare with
    if (oldBalance !== undefined) {
      const difference = newBalance - oldBalance;
      if (difference > 0) {
        const increaseId = `${Date.now()}-${Math.random()}`;
        const newIncrease: BalanceIncrease = {
          id: increaseId,
          amount: difference,
          timestamp: Date.now()
        };

        setIncreases(prev => [...prev, newIncrease]);

        // Remove the animation after it completes (2 seconds)
        setTimeout(() => {
          setIncreases(prev => prev.filter(inc => inc.id !== increaseId));
        }, 2000);
      }
    }

    // Update previous balance reference
    previousBalance.current = newBalance;
  }, []);

  const checkBalanceChange = useCallback((newBalance: number) => {
    if (previousBalance.current !== null) {
      triggerIncrease(newBalance, previousBalance.current);
    } else {
      // First time setting balance, no animation
      previousBalance.current = newBalance;
    }
  }, [triggerIncrease]);

  return {
    increases,
    checkBalanceChange,
    triggerIncrease
  };
}