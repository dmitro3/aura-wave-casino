-- Roulette System Database Schema
-- Complete implementation with provably fair system

-- Roulette rounds table
CREATE TABLE public.roulette_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number BIGSERIAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting', -- betting, spinning, completed
  
  -- Timing
  betting_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  betting_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  spinning_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Results
  result_slot INTEGER, -- 0-14 (slot index that won)
  result_color TEXT, -- green, red, black
  result_multiplier NUMERIC, -- 14, 2, 2
  
  -- Provably Fair System
  server_seed TEXT NOT NULL, -- Used for generating result
  server_seed_hash TEXT NOT NULL, -- SHA-256 hash of server_seed (revealed before round)
  nonce INTEGER NOT NULL, -- Round nonce for this server seed
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Roulette bets table
CREATE TABLE public.roulette_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.roulette_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bet details
  bet_color TEXT NOT NULL, -- green, red, black
  bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
  potential_payout NUMERIC NOT NULL,
  actual_payout NUMERIC DEFAULT 0,
  
  -- Results
  is_winner BOOLEAN DEFAULT false,
  profit NUMERIC DEFAULT 0, -- actual_payout - bet_amount
  
  -- Client seed for provably fair (optional, user can set)
  client_seed TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User client seeds for provably fair system
CREATE TABLE public.roulette_client_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_seed TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, is_active) -- Only one active seed per user
);

-- Roulette results history (for quick access to recent results)
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

-- RLS Policies
ALTER TABLE public.roulette_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_client_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_results ENABLE ROW LEVEL SECURITY;

-- Rounds: Everyone can view active rounds
CREATE POLICY "Anyone can view roulette rounds" 
ON public.roulette_rounds 
FOR SELECT 
USING (true);

-- Bets: Users can view all bets, but only insert their own
CREATE POLICY "Anyone can view roulette bets" 
ON public.roulette_bets 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own bets" 
ON public.roulette_bets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Client seeds: Users can only manage their own
CREATE POLICY "Users can manage their own client seeds" 
ON public.roulette_client_seeds 
FOR ALL 
USING (auth.uid() = user_id);

-- Results: Everyone can view
CREATE POLICY "Anyone can view roulette results" 
ON public.roulette_results 
FOR SELECT 
USING (true);

-- Indexes for performance
CREATE INDEX idx_roulette_rounds_status ON public.roulette_rounds(status);
CREATE INDEX idx_roulette_rounds_betting_end ON public.roulette_rounds(betting_end_time);
CREATE INDEX idx_roulette_rounds_created_at ON public.roulette_rounds(created_at);

CREATE INDEX idx_roulette_bets_round_id ON public.roulette_bets(round_id);
CREATE INDEX idx_roulette_bets_user_id ON public.roulette_bets(user_id);
CREATE INDEX idx_roulette_bets_created_at ON public.roulette_bets(created_at);

CREATE INDEX idx_roulette_results_created_at ON public.roulette_results(created_at);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_results;

-- Function to generate secure random string for seeds
CREATE OR REPLACE FUNCTION generate_server_seed()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create SHA-256 hash
CREATE OR REPLACE FUNCTION sha256_hash(input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;