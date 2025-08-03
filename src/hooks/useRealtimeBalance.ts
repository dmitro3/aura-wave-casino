import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    // Setting up dedicated balance subscription

    // Fetch initial balance
    const fetchInitialBalance = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ Error fetching initial balance:', error);
          return;
        }

        if (data) {
          // Initial balance loaded
          setBalance(data.balance);
        }
      } catch (error) {
        console.error('❌ Error in fetchInitialBalance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialBalance();

    // Set up real-time subscription
    const channel = supabase
      .channel(`dedicated_balance_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          // Balance update received
          const newBalance = payload.new?.balance;
          const oldBalance = payload.old?.balance;

          if (typeof newBalance === 'number' && newBalance !== oldBalance) {
            setBalance(newBalance);
          }
        }
      )
      .subscribe((status, err) => {
        // Subscription status update
        if (err) {
          console.error('❌ Balance subscription error:', err);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      // Cleaning up balance subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user]);

  // Manual refresh function
  const refreshBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error refreshing balance:', error);
        return;
      }

      if (data && typeof data.balance === 'number') {
        // Balance manually refreshed
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('❌ Error in refreshBalance:', error);
    }
  };

  return {
    balance,
    loading,
    refreshBalance
  };
}