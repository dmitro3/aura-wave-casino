-- Fix replica identity for all realtime tables
ALTER TABLE public.live_bet_feed REPLICA IDENTITY FULL;
ALTER TABLE public.crash_rounds REPLICA IDENTITY FULL;
ALTER TABLE public.crash_bets REPLICA IDENTITY FULL;
ALTER TABLE public.game_history REPLICA IDENTITY FULL;