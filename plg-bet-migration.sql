-- Advanced Provably Fair System Migration
-- Run this in Supabase SQL Editor

-- Create daily_seeds table for storing server seeds and lotto numbers
CREATE TABLE IF NOT EXISTS public.daily_seeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    server_seed TEXT NOT NULL,
    server_seed_hash TEXT NOT NULL,
    lotto TEXT NOT NULL,
    lotto_hash TEXT NOT NULL,
    is_revealed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revealed_at TIMESTAMP WITH TIME ZONE
);

-- Add daily_seed_id to roulette_rounds to link rounds to their daily seed
ALTER TABLE public.roulette_rounds 
ADD COLUMN IF NOT EXISTS daily_seed_id UUID REFERENCES public.daily_seeds(id);

-- Update roulette_rounds to use round_id as nonce (simpler naming)
ALTER TABLE public.roulette_rounds 
ADD COLUMN IF NOT EXISTS nonce_id INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_daily_seed ON public.roulette_rounds(daily_seed_id);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_nonce ON public.roulette_rounds(nonce_id);

-- Enable RLS for daily_seeds
ALTER TABLE public.daily_seeds ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_seeds (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can view daily seeds" ON public.daily_seeds;
CREATE POLICY "Anyone can view daily seeds" ON public.daily_seeds
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add daily_seeds to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_seeds;