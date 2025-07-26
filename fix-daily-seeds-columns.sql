-- Fix Daily Seeds Columns
-- Run this in Supabase SQL Editor if needed

-- Add missing columns to roulette_rounds if they don't exist
ALTER TABLE public.roulette_rounds 
ADD COLUMN IF NOT EXISTS daily_seed_id UUID REFERENCES public.daily_seeds(id);

ALTER TABLE public.roulette_rounds 
ADD COLUMN IF NOT EXISTS nonce_id INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_daily_seed_id ON public.roulette_rounds(daily_seed_id);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_nonce_id ON public.roulette_rounds(nonce_id);

-- Verify the columns exist
SELECT 
  'daily_seed_id column' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_rounds' 
    AND column_name = 'daily_seed_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'nonce_id column' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_rounds' 
    AND column_name = 'nonce_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;