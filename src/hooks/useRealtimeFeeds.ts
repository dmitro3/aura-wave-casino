import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveBetFeed {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  game_type: 'crash' | 'coinflip' | 'tower' | 'roulette';
  bet_amount: number;
  result: string;
  profit: number;
  multiplier?: number;
  game_data?: any;
  bet_color?: string; // For roulette: 'red', 'green', 'black'
  round_id?: string; // For roulette: current round UUID
  created_at: string;
  streak_length?: number;
  action?: string;
}

export interface CrashRound {
  id: string;
  round_number: number;
  status: 'countdown' | 'active' | 'crashed' | 'ended';
  multiplier: number;
  crash_point?: number;
  start_time: string;
  countdown_end_time?: string;
  crash_time?: string;
  created_at: string;
  updated_at: string;
}

export interface CrashBet {
  id: string;
  user_id: string;
  round_id: string;
  bet_amount: number;
  auto_cashout_at?: number;
  cashed_out_at?: number;
  cashout_time?: string;
  profit: number;
  status: 'active' | 'cashed_out' | 'lost';
  created_at: string;
}

export const useRealtimeFeeds = () => {
  const [liveBetFeed, setLiveBetFeed] = useState<LiveBetFeed[]>([]);
  const [currentCrashRound, setCurrentCrashRound] = useState<CrashRound | null>(null);
  const [crashBets, setCrashBets] = useState<CrashBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    mountedRef.current = true;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Initial data fetch with optimized queries
        const [liveFeedData, crashRoundData] = await Promise.all([
          supabase
            .from('live_bet_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30), // Reduced from 50 to 30 for faster loading
          supabase
            .from('crash_rounds')
            .select('*')
            .in('status', ['countdown', 'active', 'crashed'])
            .order('created_at', { ascending: false })
            .limit(1)
        ]);

        if (!mountedRef.current) return;

        if (liveFeedData.data) setLiveBetFeed(liveFeedData.data as LiveBetFeed[]);
        if (crashRoundData.data?.[0]) setCurrentCrashRound(crashRoundData.data[0] as CrashRound);

        // Single optimized channel for all real-time updates
        console.log('🔗 Setting up optimized real-time feeds subscription...');
        
        const mainChannel = supabase
          .channel('optimized_realtime_feeds')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'live_bet_feed'
            },
            (payload) => {
              if (!mountedRef.current) return;
              
              console.log('📡 RECEIVED: New bet in feed:', payload);
              const newBet = payload.new as LiveBetFeed;
              
              setLiveBetFeed(prev => {
                // Check for duplicates
                const exists = prev.some(bet => bet.id === newBet.id);
                if (exists) {
                  console.log('⚠️ Duplicate bet detected, skipping:', newBet.id);
                  return prev;
                }
                
                console.log('✅ SUCCESS: Adding bet to feed:', newBet.username, newBet.game_type, newBet.bet_amount);
                
                // Add to beginning of array and limit to 30 items
                return [newBet, ...prev].slice(0, 30);
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'crash_rounds'
            },
            (payload) => {
              if (!mountedRef.current) return;
              
              console.log('🎰 RECEIVED: Crash round update:', payload);
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                console.log('✅ SUCCESS: Updating crash round:', payload.new);
                setCurrentCrashRound(payload.new as CrashRound);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'crash_bets'
            },
            (payload) => {
              if (!mountedRef.current) return;
              
              console.log('💰 RECEIVED: Crash bet update:', payload);
              if (payload.eventType === 'INSERT') {
                const newBet = payload.new as CrashBet;
                setCrashBets(prev => {
                  const exists = prev.some(bet => bet.id === newBet.id);
                  if (exists) {
                    console.log('⚠️ Duplicate crash bet detected, skipping:', newBet.id);
                    return prev;
                  }
                  console.log('✅ SUCCESS: Adding new crash bet:', newBet);
                  return [newBet, ...prev].slice(0, 50); // Reduced from 100 to 50
                });
              } else if (payload.eventType === 'UPDATE') {
                console.log('✅ SUCCESS: Updating crash bet:', payload.new);
                setCrashBets(prev => 
                  prev.map(bet => 
                    bet.id === payload.new.id ? payload.new as CrashBet : bet
                  )
                );
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Optimized real-time feeds status change:', status);
            setIsConnected(status === 'SUBSCRIBED');
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ CONNECTED: Optimized real-time feeds are now listening for changes');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ ERROR: Optimized real-time feeds subscription failed');
              // Implement exponential backoff for reconnection
              setTimeout(() => {
                if (mountedRef.current) {
                  console.log('🔄 RETRY: Attempting to reconnect optimized real-time feeds...');
                  setupRealtimeSubscriptions();
                }
              }, 3000);
            }
          });

        channelsRef.current = [mainChannel];
        console.log('✅ Optimized real-time feeds subscription set up successfully');
        setLoading(false);

      } catch (error) {
        console.error('❌ Error setting up optimized real-time feeds:', error);
        setLoading(false);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions
    return () => {
      mountedRef.current = false;
      console.log('🧹 Cleaning up optimized real-time feeds subscriptions...');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  return {
    liveBetFeed,
    currentCrashRound,
    crashBets,
    loading,
    isConnected
  };
};

export const useCrashRoundUpdates = () => {
  const [currentRound, setCurrentRound] = useState<CrashRound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;

    // Fetch current round data every 2 seconds when active (reduced from 1 second)
    intervalRef.current = setInterval(async () => {
      if (currentRound?.status === 'active' && mountedRef.current) {
        try {
          const { data } = await supabase
            .from('crash_rounds')
            .select('*')
            .eq('id', currentRound.id)
            .single();
          
          if (data && mountedRef.current) {
            setCurrentRound(data as CrashRound);
          }
        } catch (error) {
          console.error('❌ Error fetching round update:', error);
        }
      }
    }, 2000); // Increased from 1000ms to 2000ms

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentRound?.id, currentRound?.status]);

  return { currentRound, setCurrentRound };
};