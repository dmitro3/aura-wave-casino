-- Create roulette rounds table
CREATE TABLE public.roulette_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number BIGSERIAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting', -- betting, spinning, revealing, completed
  result_slot INTEGER, -- 0-14 (slot index that won)
  result_color TEXT, -- green, red, black
  result_multiplier NUMERIC, -- 14, 2, 2
  result_hash TEXT, -- provably fair hash
  betting_end_time TIMESTAMP WITH TIME ZONE,
  spinning_end_time TIMESTAMP WITH TIME ZONE,
  revealing_end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roulette bets table
CREATE TABLE public.roulette_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.roulette_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  bet_color TEXT NOT NULL, -- green, red, black
  bet_amount NUMERIC NOT NULL,
  potential_payout NUMERIC NOT NULL,
  actual_payout NUMERIC DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roulette results history table (for the last 15 results display)
CREATE TABLE public.roulette_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number BIGINT NOT NULL,
  result_color TEXT NOT NULL,
  result_slot INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.roulette_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roulette_rounds
CREATE POLICY "Anyone can view roulette rounds" 
ON public.roulette_rounds 
FOR SELECT 
USING (true);

-- RLS Policies for roulette_bets
CREATE POLICY "Anyone can view roulette bets" 
ON public.roulette_bets 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own bets" 
ON public.roulette_bets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for roulette_results
CREATE POLICY "Anyone can view roulette results" 
ON public.roulette_results 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_roulette_rounds_status ON public.roulette_rounds(status);
CREATE INDEX idx_roulette_rounds_created_at ON public.roulette_rounds(created_at);
CREATE INDEX idx_roulette_bets_round_id ON public.roulette_bets(round_id);
CREATE INDEX idx_roulette_bets_user_id ON public.roulette_bets(user_id);
CREATE INDEX idx_roulette_results_created_at ON public.roulette_results(created_at);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_results;