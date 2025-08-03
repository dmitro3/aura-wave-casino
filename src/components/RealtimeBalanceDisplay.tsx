import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { Loader2 } from 'lucide-react';

interface RealtimeBalanceDisplayProps {
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function RealtimeBalanceDisplay({ 
  className = "", 
  prefix = "$", 
  suffix = "" 
}: RealtimeBalanceDisplayProps) {
  const { balance, loading } = useRealtimeBalance();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (balance === null) {
    return (
      <div className={className}>
        {prefix}0.00{suffix}
      </div>
    );
  }

  return (
    <div className={className}>
      {prefix}{balance.toFixed(2)}{suffix}
    </div>
  );
}