-- PLG.BET Style Provably Fair System Migration
-- Adds daily seeds and lotto numbers for secure round generation

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
ADD COLUMN daily_seed_id UUID REFERENCES public.daily_seeds(id);

-- Update roulette_rounds to use round_id as nonce (simpler naming)
ALTER TABLE public.roulette_rounds 
ADD COLUMN nonce_id INTEGER;

-- Create sequence for nonce_id to ensure unique incrementing values per day
CREATE SEQUENCE IF NOT EXISTS roulette_nonce_seq START 1;

-- Add indexes for performance
CREATE INDEX idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX idx_roulette_rounds_daily_seed ON public.roulette_rounds(daily_seed_id);
CREATE INDEX idx_roulette_rounds_nonce ON public.roulette_rounds(nonce_id);

-- Enable RLS for daily_seeds
ALTER TABLE public.daily_seeds ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_seeds (read-only for all authenticated users)
CREATE POLICY "Anyone can view daily seeds" ON public.daily_seeds
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add daily_seeds to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_seeds;

-- SQL function to get or create today's daily seed
CREATE OR REPLACE FUNCTION get_or_create_daily_seed()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    seed_record RECORD;
    new_seed_id UUID;
BEGIN
    -- Try to get existing seed for today
    SELECT id INTO new_seed_id 
    FROM public.daily_seeds 
    WHERE date = today_date;
    
    -- If no seed exists for today, create one
    IF new_seed_id IS NULL THEN
        -- Note: In production, server_seed and lotto should be generated securely on the server
        -- This is just the schema setup
        INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash)
        VALUES (
            today_date,
            'placeholder_server_seed', 
            'placeholder_hash',
            'placeholder_lotto',
            'placeholder_lotto_hash'
        )
        RETURNING id INTO new_seed_id;
    END IF;
    
    RETURN new_seed_id;
END;
$$;

COMMENT ON TABLE public.daily_seeds IS 'Daily server seeds and lotto numbers for PLG.BET style provably fair system';
COMMENT ON FUNCTION get_or_create_daily_seed() IS 'Gets existing or creates new daily seed for provably fair system';