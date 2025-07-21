import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveBetFeed {
  id: string;
  user_id: string;
  username: string;
  game_type: 'crash' | 'coinflip' | 'roulette';
  bet_amount: number;
  result: string;
  profit: number;
  multiplier?: number;
  game_data?: any;
  created_at: string;
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

  useEffect(() => {
    let liveFeedChannel: RealtimeChannel;
    let crashRoundChannel: RealtimeChannel;
    let crashBetsChannel: RealtimeChannel;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Initial data fetch
        const [liveFeedData, crashRoundData, crashBetsData] = await Promise.all([
          supabase
            .from('live_bet_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('crash_rounds')
            .select('*')
            .in('status', ['countdown', 'active', 'crashed'])
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('crash_bets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
        ]);

        if (liveFeedData.data) setLiveBetFeed(liveFeedData.data as LiveBetFeed[]);
        if (crashRoundData.data?.[0]) setCurrentCrashRound(crashRoundData.data[0] as CrashRound);
        if (crashBetsData.data) setCrashBets(crashBetsData.data as CrashBet[]);

        // Set up live bet feed subscription with the most basic approach
        console.log('🔗 Setting up live bet feed subscription...');
        liveFeedChannel = supabase
          .channel('live_bet_feed_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'live_bet_feed'
            },
            (payload) => {
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
                
                // Add to beginning of array and limit to 50 items
                return [newBet, ...prev].slice(0, 50);
              });
            }
          )
          .subscribe((status) => {
            console.log('📡 Live bet feed status change:', status);
            setIsConnected(status === 'SUBSCRIBED');
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ CONNECTED: Live bet feed is now listening for changes');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ ERROR: Live bet feed subscription failed');
              setTimeout(() => {
                console.log('🔄 RETRY: Attempting to reconnect live bet feed...');
                liveFeedChannel?.unsubscribe();
                setupRealtimeSubscriptions();
              }, 3000);
            }
          });

        // Set up crash rounds subscription
        console.log('🎰 Setting up crash rounds subscription...');
        crashRoundChannel = supabase
          .channel('crash_rounds_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'crash_rounds'
            },
            (payload) => {
              console.log('🎰 RECEIVED: Crash round update:', payload);
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                console.log('✅ SUCCESS: Updating crash round:', payload.new);
                setCurrentCrashRound(payload.new as CrashRound);
              }
            }
          )
          .subscribe((status) => {
            console.log('🎰 Crash rounds status change:', status);
          });

        // Set up crash bets subscription
        console.log('💰 Setting up crash bets subscription...');
        crashBetsChannel = supabase
          .channel('crash_bets_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'crash_bets'
            },
            (payload) => {
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
                  return [newBet, ...prev].slice(0, 100);
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
            console.log('💰 Crash bets status change:', status);
          });

        console.log('✅ All subscriptions set up successfully');
        setLoading(false);

      } catch (error) {
        console.error('❌ Error setting up realtime subscriptions:', error);
        setLoading(false);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions...');
      if (liveFeedChannel) {
        supabase.removeChannel(liveFeedChannel);
        console.log('🧹 Removed live feed channel');
      }
      if (crashRoundChannel) {
        supabase.removeChannel(crashRoundChannel);
        console.log('🧹 Removed crash round channel');
      }
      if (crashBetsChannel) {
        supabase.removeChannel(crashBetsChannel);
        console.log('🧹 Removed crash bets channel');
      }
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
  
  useEffect(() => {
    // Fetch current round data every second when active
    const interval = setInterval(async () => {
      if (currentRound?.status === 'active') {
        try {
          const { data } = await supabase
            .from('crash_rounds')
            .select('*')
            .eq('id', currentRound.id)
            .single();
          
          if (data) {
            setCurrentRound(data as CrashRound);
          }
        } catch (error) {
          console.error('❌ Error fetching round update:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound?.id, currentRound?.status]);

  return { currentRound, setCurrentRound };
};