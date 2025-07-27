-- Fix live_bet_feed table for roulette support
-- Run this in Supabase SQL Editor

-- Step 1: Update game_type constraint to allow roulette
ALTER TABLE public.live_bet_feed 
DROP CONSTRAINT IF EXISTS live_bet_feed_game_type_check;

ALTER TABLE public.live_bet_feed 
ADD CONSTRAINT live_bet_feed_game_type_check 
CHECK (game_type = ANY (ARRAY['crash'::text, 'coinflip'::text, 'tower'::text, 'roulette'::text]));

-- Step 2: Add columns needed for roulette
ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS bet_color TEXT;

ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS round_id UUID;

-- Step 3: Add avatar_url column if it doesn't exist (for profile pictures)
ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 4: Add index for efficient roulette queries
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_roulette 
ON public.live_bet_feed(game_type, round_id) 
WHERE game_type = 'roulette';

-- Step 5: Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'live_bet_feed'
ORDER BY ordinal_position;