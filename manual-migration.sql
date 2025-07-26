-- Manual Migration Script for Daily Seeds Provably Fair System
-- Run this in Supabase SQL Editor if the tables don't exist

-- Step 1: Create daily_seeds table
CREATE TABLE IF NOT EXISTS public.daily_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  server_seed TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  lotto TEXT NOT NULL,
  lotto_hash TEXT NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Add daily_seed_id column to roulette_rounds
ALTER TABLE public.roulette_rounds 
ADD COLUMN IF NOT EXISTS daily_seed_id UUID REFERENCES public.daily_seeds(id);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_daily_seed_id ON public.roulette_rounds(daily_seed_id);

-- Step 4: Enable RLS and create policies
ALTER TABLE public.daily_seeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view daily seeds" ON public.daily_seeds;
CREATE POLICY "Anyone can view daily seeds" ON public.daily_seeds
  FOR SELECT USING (true);

-- Step 5: Add to realtime publication (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_seeds;

-- Step 6: Create today's seed
DO $$
DECLARE
  today_date DATE := CURRENT_DATE;
  server_seed_val TEXT;
  server_seed_hash_val TEXT;
  lotto_val TEXT;
  lotto_hash_val TEXT;
BEGIN
  -- Check if today's seed already exists
  IF NOT EXISTS (SELECT 1 FROM public.daily_seeds WHERE date = today_date) THEN
    -- Generate secure values (simplified for SQL - normally done in Edge Function)
    server_seed_val := encode(gen_random_bytes(32), 'hex');
    server_seed_hash_val := encode(digest(server_seed_val, 'sha256'), 'hex');
    lotto_val := LPAD((random() * 9999999999)::bigint::text, 10, '0');
    lotto_hash_val := encode(digest(lotto_val, 'sha256'), 'hex');
    
    INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash)
    VALUES (today_date, server_seed_val, server_seed_hash_val, lotto_val, lotto_hash_val);
    
    RAISE NOTICE 'Created daily seed for %', today_date;
  ELSE
    RAISE NOTICE 'Daily seed for % already exists', today_date;
  END IF;
END $$;

-- Verification: Check if everything was created correctly
SELECT 
  'daily_seeds table' as component,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_seeds') 
       THEN '✅ EXISTS' 
       ELSE '❌ MISSING' 
  END as status
UNION ALL
SELECT 
  'daily_seed_id column' as component,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roulette_rounds' AND column_name = 'daily_seed_id') 
       THEN '✅ EXISTS' 
       ELSE '❌ MISSING' 
  END as status
UNION ALL
SELECT 
  'today seed data' as component,
  CASE WHEN EXISTS (SELECT 1 FROM public.daily_seeds WHERE date = CURRENT_DATE) 
       THEN '✅ EXISTS' 
       ELSE '❌ MISSING' 
  END as status;