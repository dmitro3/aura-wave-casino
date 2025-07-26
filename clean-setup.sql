-- ROULETTE SYSTEM DATABASE SETUP
-- Copy and paste this entire script into Supabase SQL Editor

-- Drop existing tables
DROP TABLE IF EXISTS public.roulette_bets CASCADE;
DROP TABLE IF EXISTS public.roulette_results CASCADE; 
DROP TABLE IF EXISTS public.roulette_rounds CASCADE;
DROP TABLE IF EXISTS public.roulette_client_seeds CASCADE;

-- Create roulette rounds table
CREATE TABLE public.roulette_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number BIGSERIAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting',
  betting_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  betting_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  spinning_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  result_slot INTEGER,
  result_color TEXT,
  result_multiplier NUMERIC,
  server_seed TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roulette bets table
CREATE TABLE public.roulette_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.roulette_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_color TEXT NOT NULL,
  bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
  potential_payout NUMERIC NOT NULL,
  actual_payout NUMERIC DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  profit NUMERIC DEFAULT 0,
  client_seed TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client seeds table
CREATE TABLE public.roulette_client_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_seed TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, is_active)
);

-- Create results table
CREATE TABLE public.roulette_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.roulette_rounds(id) ON DELETE CASCADE,
  round_number BIGINT NOT NULL,
  result_color TEXT NOT NULL,
  result_slot INTEGER NOT NULL,
  total_bets_count INTEGER NOT NULL DEFAULT 0,
  total_bets_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roulette_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_client_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view roulette rounds" ON public.roulette_rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can view roulette bets" ON public.roulette_bets FOR SELECT USING (true);
CREATE POLICY "Users can insert their own bets" ON public.roulette_bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own client seeds" ON public.roulette_client_seeds FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view roulette results" ON public.roulette_results FOR SELECT USING (true);

-- Create indexes
CREATE INDEX idx_roulette_rounds_status ON public.roulette_rounds(status);
CREATE INDEX idx_roulette_rounds_betting_end ON public.roulette_rounds(betting_end_time);
CREATE INDEX idx_roulette_rounds_created_at ON public.roulette_rounds(created_at);
CREATE INDEX idx_roulette_bets_round_id ON public.roulette_bets(round_id);
CREATE INDEX idx_roulette_bets_user_id ON public.roulette_bets(user_id);
CREATE INDEX idx_roulette_bets_created_at ON public.roulette_bets(created_at);
CREATE INDEX idx_roulette_results_created_at ON public.roulette_results(created_at);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_results;