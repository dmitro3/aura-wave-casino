import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserLevelStats {
  user_id: string;
  current_level: number;
  current_level_xp: number;
  lifetime_xp: number;
  xp_to_next_level: number;
  border_tier: number;
  total_wagered: number;
  total_profit: number;
  // Game-specific stats
  coinflip_games: number;
  coinflip_wins: number;
  coinflip_profit: number;
  crash_games: number;
  crash_wins: number;
  crash_profit: number;
  roulette_games: number;
  roulette_wins: number;
  roulette_profit: number;
  tower_games: number;
  tower_wins: number;
  tower_profit: number;
  // Metadata
  created_at: string;
  updated_at: string;
}

export function useRealtimeUserLevelStats(userId: string | null) {
  const [stats, setStats] = useState<UserLevelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    console.log('📊 Setting up real-time stats subscription for user:', userId);

    // Fetch initial stats
    const fetchInitialStats = async () => {
      try {
        const { data, error } = await supabase
          .from('user_level_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('ℹ️ No stats found for user, will create defaults');
            setStats(null);
          } else {
            console.error('❌ Error fetching initial stats:', error);
          }
          return;
        }

        if (data) {
          console.log('📊 Initial stats loaded for user:', userId, data);
          setStats(data);
        }
      } catch (error) {
        console.error('❌ Error in fetchInitialStats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStats();

    // Set up real-time subscription
    const channel = supabase
      .channel(`user_level_stats_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_level_stats',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📊 REAL-TIME STATS UPDATE:', payload);
          
          if (payload.eventType === 'DELETE') {
            setStats(null);
          } else if (payload.new) {
            const newStats = payload.new as UserLevelStats;
            console.log('⚡ STATS UPDATED:', newStats);
            setStats(newStats);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Stats subscription status:', status);
        if (err) {
          console.error('❌ Stats subscription error:', err);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up stats subscription for user:', userId);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId]);

  // Manual refresh function
  const refreshStats = async () => {
    if (!userId) return;

    try {
      console.log('🔄 Manually refreshing stats for user:', userId);
      const { data, error } = await supabase
        .from('user_level_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No stats found during manual refresh');
          setStats(null);
        } else {
          console.error('❌ Error refreshing stats:', error);
        }
        return;
      }

      if (data) {
        console.log('🔄 Stats manually refreshed:', data);
        setStats(data);
      }
    } catch (error) {
      console.error('❌ Error in refreshStats:', error);
    }
  };

  return {
    stats,
    loading,
    refreshStats
  };
}