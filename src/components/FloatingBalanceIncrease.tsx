import React from 'react';

interface BalanceIncrease {
  id: string;
  amount: number;
  timestamp: number;
}

interface FloatingBalanceIncreaseProps {
  increases: BalanceIncrease[];
}

export function FloatingBalanceIncrease({ increases }: FloatingBalanceIncreaseProps) {
  if (increases.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {increases.map((increase) => (
        <div
          key={increase.id}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 animate-float-up"
          style={{
            animationDelay: '0ms',
            animationDuration: '2000ms',
            animationFillMode: 'forwards'
          }}
        >
          <div className="text-green-400 font-bold text-sm whitespace-nowrap drop-shadow-lg">
            +${increase.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}