-- Fix realtime configuration for live_bet_feed table
ALTER TABLE public.live_bet_feed REPLICA IDENTITY FULL;

-- Also fix for other tables that might need it
ALTER TABLE public.crash_rounds REPLICA IDENTITY FULL;
ALTER TABLE public.crash_bets REPLICA IDENTITY FULL;
ALTER TABLE public.game_history REPLICA IDENTITY FULL;