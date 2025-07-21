import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveBetFeed {
  id: string;
  user_id: string;
  username: string;
  game_type: 'crash' | 'coinflip';
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

        // Set up live bet feed subscription
        liveFeedChannel = supabase
          .channel('live-bet-feed')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'live_bet_feed'
            },
            (payload) => {
              console.log('📡 New bet in feed:', payload.new);
              setLiveBetFeed(prev => [payload.new as LiveBetFeed, ...prev.slice(0, 49)]);
            }
          )
          .subscribe();

        // Set up crash rounds subscription
        crashRoundChannel = supabase
          .channel('crash-rounds')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'crash_rounds'
            },
            (payload) => {
              console.log('🎰 Crash round update:', payload);
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                setCurrentCrashRound(payload.new as CrashRound);
              }
            }
          )
          .subscribe();

        // Set up crash bets subscription
        crashBetsChannel = supabase
          .channel('crash-bets')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'crash_bets'
            },
            (payload) => {
              console.log('💰 Crash bet update:', payload);
              if (payload.eventType === 'INSERT') {
                setCrashBets(prev => [payload.new as CrashBet, ...prev.slice(0, 99)]);
              } else if (payload.eventType === 'UPDATE') {
                setCrashBets(prev => 
                  prev.map(bet => 
                    bet.id === payload.new.id ? payload.new as CrashBet : bet
                  )
                );
              }
            }
          )
          .subscribe();

        setLoading(false);

      } catch (error) {
        console.error('❌ Error setting up realtime subscriptions:', error);
        setLoading(false);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions
    return () => {
      if (liveFeedChannel) supabase.removeChannel(liveFeedChannel);
      if (crashRoundChannel) supabase.removeChannel(crashRoundChannel);
      if (crashBetsChannel) supabase.removeChannel(crashBetsChannel);
    };
  }, []);

  return {
    liveBetFeed,
    currentCrashRound,
    crashBets,
    loading
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