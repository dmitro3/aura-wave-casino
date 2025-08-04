import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface RealtimeBalanceContextType {
  realtimeBalance: number;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  refreshBalanceForBet: () => Promise<number>;
}

const RealtimeBalanceContext = createContext<RealtimeBalanceContextType | undefined>(undefined);

export function RealtimeBalanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [realtimeBalance, setRealtimeBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch initial balance
  const fetchBalance = async () => {
    if (!user?.id) {
      setRealtimeBalance(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching balance:', error);
        return;
      }

      setRealtimeBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh balance manually
  const refreshBalance = async () => {
    await fetchBalance();
  };

  // Refresh balance before bet validation
  const refreshBalanceForBet = async () => {
    if (!user?.id) return realtimeBalance;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error refreshing balance for bet:', error);
        return realtimeBalance;
      }

      const freshBalance = data.balance || 0;
      console.log('💰 Balance refreshed for bet validation:', realtimeBalance, '→', freshBalance);
      setRealtimeBalance(freshBalance);
      return freshBalance;
    } catch (error) {
      console.error('Failed to refresh balance for bet:', error);
      return realtimeBalance;
    }
  };

  // Set up realtime subscription for balance updates
  useEffect(() => {
    if (!user?.id) {
      setRealtimeBalance(0);
      setIsLoading(false);
      return;
    }

    // Fetch initial balance
    fetchBalance();

    // Set up realtime subscription
    const balanceChannel = supabase
      .channel(`realtime_balance_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new?.balance !== undefined) {
            const newBalance = parseFloat(payload.new.balance);
            console.log('💰 Realtime balance update:', realtimeBalance, '→', newBalance);
            setRealtimeBalance(newBalance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
    };
  }, [user?.id]);

  const value = {
    realtimeBalance,
    isLoading,
    refreshBalance,
    refreshBalanceForBet,
  };

  return (
    <RealtimeBalanceContext.Provider value={value}>
      {children}
    </RealtimeBalanceContext.Provider>
  );
}

export function useRealtimeBalance() {
  const context = useContext(RealtimeBalanceContext);
  if (context === undefined) {
    throw new Error('useRealtimeBalance must be used within a RealtimeBalanceProvider');
  }
  return context;
}